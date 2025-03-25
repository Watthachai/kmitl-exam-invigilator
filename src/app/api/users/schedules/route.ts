import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's invigilator ID if it exists
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { invigilator: true }
    });

    if (!user?.invigilator) {
      return NextResponse.json({ error: 'User is not an invigilator' }, { status: 400 });
    }

    // Find schedules where the user's invigilator ID matches
    const schedules = await prisma.schedule.findMany({
      where: {
        invigilatorId: user.invigilator.id
      },
      include: {
        room: {
          select: {
            building: true,
            roomNumber: true,
          }
        },
        subjectGroup: {
          include: {
            subject: {
              select: {
                code: true,
                name: true,
              }
            }
          }
        },
        invigilator: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Transform the data
    const transformedSchedules = schedules.map(schedule => ({
      id: schedule.id,
      date: schedule.date.toISOString(),
      startTime: schedule.startTime.toISOString(),
      endTime: schedule.endTime.toISOString(),
      scheduleDateOption: schedule.scheduleDateOption,
      room: {
        building: schedule.room.building,
        roomNumber: schedule.room.roomNumber
      },
      subjectGroup: {
        subject: {
          code: schedule.subjectGroup.subject.code,
          name: schedule.subjectGroup.subject.name
        }
      },
      invigilators: [
        {
          id: schedule.invigilator?.id || '',
          name: schedule.invigilator?.name || '',
          type: schedule.invigilator?.type || ''
        }
      ]
    }));

    return NextResponse.json(transformedSchedules);

  } catch (error) {
    console.error('Failed to fetch schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}