import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const schedules = await prisma.schedule.findMany({
      include: {
        subjectGroup: {
          include: {
            professor: true,
            subject: {
              include: {
                department: true
              }
            }
          }
        },
        room: true,
        invigilator: true
      },
      where: {
        // เพิ่มเงื่อนไขถ้าต้องการ
      },
      orderBy: [
        { date: 'asc' },
        { scheduleDateOption: 'asc' } // เพิ่มการเรียงลำดับตามช่วงเวลา
      ]
    });
    
    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scheduleDateOption, ...otherData } = body;

    // Validate required fields
    if (!body?.subjectGroupId || !body?.date || !body?.startTime || 
        !body?.endTime || !body?.roomId || !body?.invigilatorId ||
        !body?.examType || !body?.academicYear || !body?.semester) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Begin transaction
    return await prisma.$transaction(async (prismaClient) => {
      if (body.updateQuota) {
        // Update invigilator quota
        await prismaClient.invigilator.update({
          where: { id: body.invigilatorId },
          data: {
            assignedQuota: {
              increment: 1
            }
          }
        });
      }

      const schedule = await prismaClient.schedule.create({
        data: {
          ...otherData,
          scheduleDateOption: scheduleDateOption, // ตรวจสอบว่ามีการส่งค่านี้มาด้วย
        },
        include: {
          subjectGroup: {
            include: {
              subject: true,
              professor: true
            }
          },
          room: true,
          invigilator: true
        }
      });

      return NextResponse.json(schedule);
    });
  } catch (error) {
    console.error('Schedule creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
}