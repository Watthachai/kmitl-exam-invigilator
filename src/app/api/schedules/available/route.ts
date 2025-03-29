import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/app/lib/prisma';
import { options } from '@/app/api/auth/[...nextauth]/options';

export async function GET() {
  try {
    const session = await getServerSession(options);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    // ค้นหาข้อมูลผู้คุมสอบของผู้ใช้
    const invigilator = await prisma.invigilator.findFirst({
      where: { userId: session.user.id },
      include: { 
        department: true,
        professor: true
      },
    });

    if (!invigilator) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้คุมสอบ' }, { status: 404 });
    }

    // เพิ่ม log ข้อมูลผู้ใช้และข้อมูลที่เกี่ยวข้อง
    console.log('User debug:', {
      userId: session.user.id,
      invigilatorId: invigilator.id,
      departmentId: invigilator.departmentId,
      professorId: invigilator.professorId,
      assignedQuota: invigilator.assignedQuota,
      quota: invigilator.quota
    });

    // เงื่อนไขสำหรับดึงข้อมูลตารางสอบที่ยังไม่มีผู้คุมสอบ
    const whereConditions = {
      invigilatorId: null,
      OR: [
        // วิชาของภาควิชาตัวเอง (priority)
        { 
          priority: true,
          departmentQuota: { gt: 0 },
          subjectGroup: {
            subject: {
              departmentId: invigilator.departmentId
            }
          }
        },
        // วิชา GenEd
        { 
          isGenEd: true,
          departmentQuota: { gt: 0 }
        },
        // วิชาที่เป็นผู้สอน
        ...(invigilator.professorId ? [{
          subjectGroup: {
            OR: [
              { professorId: invigilator.professorId },
              { additionalProfessors: { some: { professorId: invigilator.professorId } } }
            ]
          }
        }] : [])
      ]
    };

    // ตรวจสอบว่าใช้โควต้าครบหรือยัง
    if (invigilator.assignedQuota >= invigilator.quota) {
      // กรณีใช้โควต้าครบแล้ว ยังให้เห็นวิชาที่ตัวเองสอนได้
      if (invigilator.professorId) {
        whereConditions.OR = [
          {
            subjectGroup: {
              OR: [
                { professorId: invigilator.professorId },
                { additionalProfessors: { some: { professorId: invigilator.professorId } } }
              ]
            }
          }
        ];
      } else {
        // ถ้าไม่มี professorId และใช้โควต้าครบแล้ว ให้ส่ง array ว่างกลับไป
        return NextResponse.json([]);
      }
    }

    // ดึงข้อมูลตารางสอบที่ยังไม่มีผู้คุมสอบ
    const schedules = await prisma.schedule.findMany({
      where: whereConditions,
      include: {
        room: true,
        subjectGroup: {
          include: {
            subject: {
              include: {
                department: true
              }
            },
            professor: true,
            additionalProfessors: {
              include: {
                professor: true
              }
            }
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    });

    // เพิ่ม log จำนวนวิชาที่พบ
    console.log(`Found ${schedules.length} available schedules`);
    
    // เพิ่ม debugging ข้อมูลว่าเป็นวิชาของภาควิชาไหน
    const schedulesWithDebug = schedules.map(schedule => {
      const subjectDepartment = schedule.subjectGroup.subject.department.name;
      const userDepartment = invigilator.department?.name || 'ไม่ระบุภาควิชา';
      const isTeachingFaculty = schedule.subjectGroup.professor?.id === invigilator.professorId || 
                              schedule.subjectGroup.additionalProfessors?.some(ap => ap.professor.id === invigilator.professorId);
      
      return {
        ...schedule,
        _debug: {
          subjectDepartment,
          userDepartment,
          isPriorityForUser: schedule.priority && subjectDepartment === userDepartment,
          isTeachingFaculty
        }
      };
    });

    return NextResponse.json(schedulesWithDebug);
  } catch (error) {
    console.error('Error fetching available schedules:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' }, { status: 500 });
  }
}