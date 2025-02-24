import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/app/lib/prisma';
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scheduleId } = await req.json();

    // ดึงข้อมูล schedule และ user
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        subjectGroup: {
          include: {
            subject: {
              include: {
                department: true
              }
            }
          }
        }
      }
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        invigilator: {
          include: {
            department: true,
            schedules: true // เพิ่มการดึงข้อมูลตารางสอบที่คุมแล้ว
          }
        }
      }
    });

    if (!schedule || !user?.invigilator) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // เช็คว่าอาจารย์คนนี้คุมสอบกี่วิชาแล้ว
    const assignedCount = user.invigilator.schedules.length;
    
    console.log('Debug quota check:', {
      assignedCount,
      invigilatorQuota: user.invigilator.quota,
      departmentQuota: schedule.departmentQuota,
      userDepartment: user.invigilator.department.code,
      subjectDepartment: schedule.subjectGroup.subject.department.code,
      isGenEd: schedule.isGenEd,
      isPriority: schedule.priority
    });

    // เช็คโควต้าของอาจารย์
    if (assignedCount >= user.invigilator.quota) {
      return NextResponse.json({ error: 'คุณได้ใช้โควต้าครบแล้ว' }, { status: 400 });
    }

    // เช็คเงื่อนไขการเลือกตารางสอบ
    if (schedule.quotaFilled) {
      return NextResponse.json({ error: 'โควต้าวิชานี้เต็มแล้ว' }, { status: 400 });
    }

    const userDepartment = user.invigilator.department;
    const subjectDepartment = schedule.subjectGroup.subject.department;

    // ปรับปรุงเงื่อนไขการเลือก
    const canSelect = 
      schedule.isGenEd || // เป็นวิชา GenEd
      userDepartment.code === subjectDepartment.code || // เป็นวิชาของภาคเดียวกัน
      (!schedule.priority && schedule.departmentQuota > 0); // ไม่ใช่วิชา priority และยังมีโควต้าเหลือ

    if (!canSelect) {
      return NextResponse.json({ 
        error: 'ไม่สามารถเลือกตารางสอบนี้ได้ (ต้องเป็นวิชาของภาควิชาตัวเองหรือวิชา GenEd เท่านั้น)' 
      }, { status: 400 });
    }

    // อัพเดทข้อมูล
    await prisma.$transaction([
      prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          invigilatorId: user.invigilator.id,
          departmentQuota: {
            decrement: 1
          },
          quotaFilled: {
            set: schedule.departmentQuota <= 1
          }
        }
      }),
      prisma.invigilator.update({
        where: { id: user.invigilator.id },
        data: {
          assignedQuota: {
            increment: 1
          }
        }
      })
    ]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error selecting schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}