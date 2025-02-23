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
      }
    });
    
    return Response.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return Response.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

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
          date: new Date(body.date),
          startTime: new Date(body.startTime),
          endTime: new Date(body.endTime),
          scheduleDateOption: body.scheduleDateOption,
          examType: body.examType,
          academicYear: body.academicYear,
          semester: body.semester,
          subjectGroup: { connect: { id: body.subjectGroupId } },
          room: { connect: { id: body.roomId } },
          invigilator: { connect: { id: body.invigilatorId } }
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