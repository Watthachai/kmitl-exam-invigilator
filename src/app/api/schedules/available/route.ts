import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/app/lib/prisma';
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ดึงข้อมูล invigilator และ department
    const invigilator = await prisma.invigilator.findFirst({
      where: { 
        userId: session.user.id,
        type: 'อาจารย์'
      },
      include: {
        schedules: true,
        department: true
      }
    });

    if (!invigilator) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลผู้คุมสอบ หรือไม่มีสิทธิ์เข้าถึง' }, 
        { status: 404 }
      );
    }

    // เพิ่ม debug log ก่อนดึงข้อมูล
    console.log('Invigilator info:', {
      id: invigilator.id,
      departmentId: invigilator.departmentId,
    });

    // ดึงตารางสอบที่สามารถเลือกได้
    const availableSchedules = await prisma.schedule.findMany({
      where: {
        AND: [
          {
            OR: [
              // วิชาของภาควิชาตัวเอง
              {
                subjectGroup: {
                  subject: {
                    departmentId: invigilator.departmentId
                  }
                }
              },
              // วิชาที่เป็น GenEd หรือวิชาที่เปิดให้ภาคอื่นคุมได้
              { isGenEd: true },
              { priority: false } // เพิ่มเงื่อนไขนี้เพื่อให้เห็นวิชาที่ไม่ใช่วิชาเฉพาะภาค
            ]
          },
          { invigilatorId: null }, // ยังไม่มีผู้คุมสอบ
          { date: { gte: new Date() } }, // วันที่ยังไม่ผ่าน
          { quotaFilled: false } // โควต้ายังไม่เต็ม
        ]
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
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        room: true
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' } // เปลี่ยนจาก scheduleDateOption เป็น startTime
      ]
    });

    // Debug log สำหรับ raw query
    console.log('Raw Query Debug:', {
      departmentId: invigilator.departmentId,
      scheduleCount: availableSchedules.length,
      schedules: availableSchedules.map(s => ({
        id: s.id,
        subjectCode: s?.subjectGroup?.subject?.code,
        departmentId: s?.subjectGroup?.subject?.departmentId,
        isPriority: s.priority,
        isGenEd: s.isGenEd
      }))
    });

    // เพิ่ม debug log เพื่อตรวจสอบ
    console.log('Available Schedules Detail:', availableSchedules.map(schedule => ({
      id: schedule.id,
      subjectCode: schedule.subjectGroup.subject.code,
      department: schedule.subjectGroup.subject.department.name,
      isPriority: schedule.priority,
      isGenEd: schedule.isGenEd,
      isOwnDepartment: schedule.subjectGroup.subject.departmentId === invigilator.departmentId
    })));

    // กรองรายการที่อาจารย์มีตารางสอบในวันและช่วงเวลาเดียวกันออก
    const filteredSchedules = availableSchedules.filter(schedule => {
      // ตรวจสอบว่าอาจารย์มีตารางสอบในวันและช่วงเวลาเดียวกันหรือไม่
      const hasConflict = invigilator.schedules.some(existingSchedule => {
        const sameDate = new Date(existingSchedule.date).toDateString() === new Date(schedule.date).toDateString();
        
        // แปลงเวลาเป็นช่วงเช้า/บ่าย
        const getTimeSlot = (date: Date) => {
          const hours = new Date(date).getHours();
          return hours < 12 ? 'ช่วงเช้า' : 'ช่วงบ่าย';
        };
    
        const existingTimeSlot = getTimeSlot(existingSchedule.startTime);
        const scheduleTimeSlot = getTimeSlot(schedule.startTime);
        
        return sameDate && existingTimeSlot === scheduleTimeSlot;
      });
    
      return !hasConflict;
    });

    // เพิ่ม debug log
    console.log('Debug info:', {
      userId: session.user.id,
      invigilatorName: invigilator.name,
      department: invigilator.department.name,
      availableCount: availableSchedules.length,
      filteredCount: filteredSchedules.length
    });

    console.log('Available schedules debug:', availableSchedules.map(s => ({
      id: s.id,
      subjectCode: s.subjectGroup.subject.code,
      professorId: s.subjectGroup.professor?.id,
      professorName: s.subjectGroup.professor?.name
    })));

    return NextResponse.json(filteredSchedules);

  } catch (error) {
    console.error('Error details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available schedules' },
      { status: 500 }
    );
  }
}