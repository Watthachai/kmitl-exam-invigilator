import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import { Invigilator, Professor, Schedule, Prisma, User, SubjectGroup } from "@prisma/client";

// Define better types
interface ExtendedInvigilator extends Invigilator {
  professor?: Professor & {
    user?: User;
    department?: {
      name: string;
    };
  };
  schedules: Array<Schedule & {
    subjectGroup: {
      subject: {
        code: string;
      };
    };
  }>;
}

interface ExtendedSchedule extends Schedule {
  subjectGroup: SubjectGroup & {
    subject: {
      code: string;
      name: string;
      department: {
        name: string;
      };
    };
    professor?: Professor;
    additionalProfessors?: Array<{
      professor: Professor;
    }>;
  };
  room: {
    building: string;
    roomNumber: string;
  };
  invigilator?: Invigilator & {
    professor?: Professor;
  };
}

// Define the type for assignment objects
interface Assignment {
  scheduleId: string;
  date: Date;
  timeSlot: string;
  scheduleDateOption: string;
  subjectCode: string;
  subjectName: string;
  department: string;
  currentInvigilator: string | null;
  currentInvigilatorId: string | null;
  newInvigilator: string;
  newInvigilatorId: string;
  invigilatorType: string;
  invigilatorDepartment: string;
  quotaUsed: number;
  quotaTotal: number;
  isTeachingFaculty: boolean;
  otherAssignments: string | null;
}

export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบสิทธิ์
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "admin" && session.user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล" },
        { status: 403 }
      );
    }

    // รับพารามิเตอร์จาก request
    const params = await request.json();
    const { 
      examType, 
      academicYear, 
      semester, 
      department,
      prioritizeQuota,
      excludeAlreadyAssigned,
      respectTimeConstraints
    } = params;

    // สร้าง filter สำหรับการค้นหาตารางสอบ
    const scheduleFilter: Prisma.ScheduleWhereInput = {};
    
    if (examType) scheduleFilter.examType = examType;
    if (academicYear) scheduleFilter.academicYear = parseInt(academicYear);
    if (semester) scheduleFilter.semester = parseInt(semester);

    // 1. ดึงข้อมูลตารางสอบทั้งหมดตามเงื่อนไข (ทั้งที่มีผู้คุมแล้วและยังไม่มี)
    const allSchedules = await prisma.schedule.findMany({
      where: {
        ...scheduleFilter,
        // กรองตามภาควิชา (ถ้ามี)
        ...(department ? {
          subjectGroup: {
            subject: {
              department: {
                name: department
              }
            }
          }
        } : {})
      },
      include: {
        subjectGroup: {
          include: {
            subject: {
              include: {
                department: true
              }
            },
            professor: {
              include: {
                user: true
              }
            },
            additionalProfessors: {
              include: {
                professor: true
              }
            }
          }
        },
        room: true,
        invigilator: {
          include: {
            professor: true
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    }) as unknown as ExtendedSchedule[];
    
    // 2. แยกตารางสอบที่ต้องการจัดสรรผู้คุมสอบ
    const schedules = excludeAlreadyAssigned 
      ? allSchedules.filter(schedule => !schedule.invigilatorId)
      : allSchedules;

    // 3. ดึงข้อมูลผู้คุมสอบทั้งหมด
    // ใช้ API endpoint เดียวกันกับที่หน้า UI ใช้เพื่อความสอดคล้อง
    const invigilatorResponse = await fetch(new URL('/api/invigilators', request.url).toString(), {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
      cache: 'no-store'
    });

    if (!invigilatorResponse.ok) {
      throw new Error(`Failed to fetch invigilators: ${invigilatorResponse.statusText}`);
    }

    const invigilators = (await invigilatorResponse.json()) as ExtendedInvigilator[];

    // ปรับปรุงการตรวจสอบข้อมูล
    console.log(`Total invigilators loaded: ${invigilators.length}`);

    // 4. คำนวณโควต้าเฉลี่ย (จำนวนวิชาทั้งหมด / จำนวนอาจารย์)
    const activeInvigilatorCount = invigilators.length;
    const targetExamCount = allSchedules.length;
    const averageQuota = Math.ceil(targetExamCount / activeInvigilatorCount);
    
    // 5. สร้าง mapping อาจารย์ผู้สอนกับวิชาที่สอน
    const professorToSubjectMap = new Map<string, string[]>();
    
    allSchedules.forEach(schedule => {
      // อาจารย์หลักของวิชา
      if (schedule.subjectGroup.professor) {
        const profId = schedule.subjectGroup.professor.id;
        if (!professorToSubjectMap.has(profId)) {
          professorToSubjectMap.set(profId, []);
        }
        const subjects = professorToSubjectMap.get(profId);
        if (subjects) {
          subjects.push(schedule.id);
        }
      }
      
      // อาจารย์เพิ่มเติมของวิชา
      if (schedule.subjectGroup.additionalProfessors) {
        schedule.subjectGroup.additionalProfessors.forEach(ap => {
          const profId = ap.professor.id;
          if (!professorToSubjectMap.has(profId)) {
            professorToSubjectMap.set(profId, []);
          }
          const subjects = professorToSubjectMap.get(profId);
          if (subjects) {
            subjects.push(schedule.id);
          }
        });
      }
    });

    // 6. จัดวิชาให้อาจารย์ผู้สอนก่อน
    // ทำ 2 รอบ: รอบแรกสำหรับวิชาที่อาจารย์สอนเอง, รอบที่สองสำหรับวิชาที่เหลือ
    const assignments: Assignment[] = [];
    const assignedSchedules = new Set<string>();
    
    // รอบที่ 1: จัดวิชาที่อาจารย์สอนเอง
    for (const schedule of schedules) {
      if (assignedSchedules.has(schedule.id)) continue;
      
      const facultyInvigilators: string[] = [];
      
      // เก็บรายการอาจารย์ผู้สอนวิชานี้
      if (schedule.subjectGroup.professor) {
        facultyInvigilators.push(schedule.subjectGroup.professor.id);
      }
      
      if (schedule.subjectGroup.additionalProfessors) {
        schedule.subjectGroup.additionalProfessors.forEach(ap => {
          facultyInvigilators.push(ap.professor.id);
        });
      }
      
      // หาอาจารย์ผู้สอนที่สามารถคุมสอบวิชานี้ได้
      let assignedInvigilator: ExtendedInvigilator | null = null;
      
      for (const invigilator of invigilators) {
        // ตรวจสอบว่ามี professor และมี id หรือไม่
        if (!invigilator.professor || !invigilator.professor.id) continue;
        
        // ตรวจสอบว่าเป็นอาจารย์ผู้สอนวิชานี้หรือไม่
        if (!facultyInvigilators.includes(invigilator.professor.id)) continue;
        
        // ตรวจสอบโควต้า
        if (invigilator.assignedQuota >= invigilator.quota) continue;
        
        // ตรวจสอบการซ้อนทับเวลา
        if (respectTimeConstraints) {
          const hasConflict = invigilator.schedules.some(existingSchedule => {
            return new Date(existingSchedule.date).toDateString() === 
                   new Date(schedule.date).toDateString() &&
                   (
                     (new Date(existingSchedule.startTime) <= new Date(schedule.endTime)) &&
                     (new Date(existingSchedule.endTime) >= new Date(schedule.startTime))
                   );
          });
          if (hasConflict) continue;
        }
        
        // พบอาจารย์ผู้สอนที่เหมาะสม
        assignedInvigilator = invigilator;
        break;
      }
      
      if (assignedInvigilator) {
        addAssignment(schedule, assignedInvigilator, assignments);
        assignedSchedules.add(schedule.id);
        assignedInvigilator.assignedQuota += 1;
      }
    }
    
    // รอบที่ 2: จัดสรรวิชาที่เหลือ
    // เรียงลำดับผู้คุมสอบตามโควต้า
    let sortedInvigilators = [...invigilators];
    
    if (prioritizeQuota) {
      sortedInvigilators = sortedInvigilators.sort((a, b) => {
        // คำนวณโควต้าคงเหลือ
        const remainingQuotaA = a.quota - a.assignedQuota;
        const remainingQuotaB = b.quota - b.assignedQuota;
        
        // เรียงจากโควต้าที่ใช้น้อยไปมาก
        return remainingQuotaB - remainingQuotaA;
      });
    }
    
    for (const schedule of schedules) {
      if (assignedSchedules.has(schedule.id)) continue;
      
      let assignedInvigilator: ExtendedInvigilator | null = null;
      
      for (const invigilator of sortedInvigilators) {
        // ข้ามถ้าโควต้าเต็ม
        if (invigilator.assignedQuota >= invigilator.quota) continue;
        
        // ตรวจสอบว่าเป็นอาจารย์ผู้สอนวิชานี้หรือไม่ - ในรอบนี้จะข้าม
        if (invigilator.professor) {
          const profId = invigilator.professor.id;
          const taughtSubjects = professorToSubjectMap.get(profId) || [];
          if (taughtSubjects.includes(schedule.id)) continue;
        }
        
        // ตรวจสอบข้อจำกัดด้านเวลา
        if (respectTimeConstraints) {
          const hasConflict = invigilator.schedules.some(existingSchedule => {
            return new Date(existingSchedule.date).toDateString() === 
                   new Date(schedule.date).toDateString() &&
                   (
                     (new Date(existingSchedule.startTime) <= new Date(schedule.endTime)) &&
                     (new Date(existingSchedule.endTime) >= new Date(schedule.startTime))
                   );
          });
          if (hasConflict) continue;
        }
        
        assignedInvigilator = invigilator;
        break;
      }
      
      if (assignedInvigilator) {
        addAssignment(schedule, assignedInvigilator, assignments);
        assignedSchedules.add(schedule.id);
        assignedInvigilator.assignedQuota += 1;
      }
    }

    // ส่งผลลัพธ์กลับไป
    return NextResponse.json({ 
      success: true,
      assignments,
      averageQuota,
      totalAssigned: assignments.length,
      totalSchedules: schedules.length,
      totalInvigilators: invigilators.length
    });
  } catch (error) {
    console.error("Random assign error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการจัดตารางคุมสอบ" },
      { status: 500 }
    );
  }
}

// ฟังก์ชันสร้างข้อมูลการมอบหมายงาน
function addAssignment(schedule: ExtendedSchedule, invigilator: ExtendedInvigilator, assignments: Assignment[]): void {
  const startTimeStr = new Date(schedule.startTime).toLocaleTimeString('th-TH', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const endTimeStr = new Date(schedule.endTime).toLocaleTimeString('th-TH', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  // ปรับปรุงการแสดงชื่อผู้คุมสอบ - ให้แสดงชื่อของ invigilator เสมอ 
  // แทนที่จะดึงจาก user account ก่อน
  const displayName = invigilator.professor ? 
    invigilator.professor.name : 
    invigilator.name;
  
  assignments.push({
    scheduleId: schedule.id,
    date: schedule.date,
    timeSlot: `${startTimeStr} - ${endTimeStr}`,
    scheduleDateOption: schedule.scheduleDateOption || '',
    subjectCode: schedule.subjectGroup.subject.code,
    subjectName: schedule.subjectGroup.subject.name,
    department: schedule.subjectGroup.subject.department.name,
    currentInvigilator: schedule.invigilator?.name || null,
    currentInvigilatorId: schedule.invigilator?.id || null,
    newInvigilator: displayName,
    newInvigilatorId: invigilator.id,
    invigilatorType: invigilator.type,
    invigilatorDepartment: invigilator.professor?.department?.name || "-",
    quotaUsed: invigilator.assignedQuota,
    quotaTotal: invigilator.quota,
    isTeachingFaculty: Boolean(invigilator.professor && (
      schedule.subjectGroup.professor?.id === invigilator.professor.id || 
      schedule.subjectGroup.additionalProfessors?.some(ap => ap.professor.id === invigilator.professor?.id)
    )),
    otherAssignments: invigilator.schedules.length > 0 ?
      invigilator.schedules
        .filter(s => s.id !== schedule.id)
        .map(s => `${s.subjectGroup.subject.code} (${new Date(s.date).toLocaleDateString('th-TH')})`).join(", ") :
      null
  });
}