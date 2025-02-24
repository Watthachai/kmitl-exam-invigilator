import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/app/lib/prisma';
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ดึงข้อมูล invigilator และตารางสอบที่เลือกไว้แล้ว
    const invigilator = await prisma.invigilator.findFirst({
      where: { userId: session.user.id },
      include: {
        schedules: {
          select: { date: true, scheduleDateOption: true }
        },
        department: true
      }
    });

    if (!invigilator) {
      return NextResponse.json({ error: 'Invigilator not found' }, { status: 404 });
    }

    // สร้าง Set ของวันและช่วงเวลาที่เลือกไปแล้ว
    const selectedTimeSlots = new Set(
      invigilator.schedules.map(schedule => 
        `${schedule.date.toISOString().split('T')[0]}-${schedule.scheduleDateOption}`
      )
    );

    // ดึงตารางสอบที่สามารถเลือกได้
    const availableSchedules = await prisma.schedule.findMany({
      where: {
        AND: [
          {
            OR: [
              // วิชาของภาควิชาตัวเอง
              {
                priority: true,
                subjectGroup: {
                  subject: {
                    departmentId: invigilator.departmentId
                  }
                }
              },
              // วิชา GenEd
              { isGenEd: true }
            ]
          },
          { quotaFilled: false },
          { invigilatorId: null },
          // ต้องเป็นวันที่ยังไม่ผ่าน
          { date: { gte: new Date() } }
        ]
      },
      include: {
        room: true,
        subjectGroup: {
          include: {
            subject: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // กรองออกตารางที่มีวันและช่วงเวลาที่เลือกไปแล้ว
    const filteredSchedules = availableSchedules.filter(schedule => {
      const timeSlot = `${schedule.date.toISOString().split('T')[0]}-${schedule.scheduleDateOption}`;
      return !selectedTimeSlots.has(timeSlot);
    });

    return NextResponse.json(filteredSchedules);
  } catch (error) {
    console.error('Error fetching available schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available schedules' },
      { status: 500 }
    );
  }
}