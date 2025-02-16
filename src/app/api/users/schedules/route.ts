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

    const schedules = await prisma.schedule.findMany({
      where: {
        invigilators: {
          some: {
            id: session.user.id
          }
        }
      },
      select: {
        id: true,
        date: true,
        scheduleDateOption: true,
        startTime: true,
        endTime: true,
        room: {
          select: {
            building: true,
            roomNumber: true,
          }
        },
        subjectGroup: {
          select: {
            subject: {
              select: {
                code: true,
                name: true,
              }
            }
          }
        },
        invigilators: {
          select: {
            id: true,
            name: true,
            role: true,
            invigilator: {
              select: {
                type: true
              }
            }
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
      startTime: schedule.scheduleDateOption === 'MORNING' 
        ? new Date(schedule.date.setHours(9, 30, 0)).toISOString()
        : new Date(schedule.date.setHours(13, 30, 0)).toISOString(),
      endTime: schedule.scheduleDateOption === 'MORNING'
        ? new Date(schedule.date.setHours(12, 30, 0)).toISOString()
        : new Date(schedule.date.setHours(16, 30, 0)).toISOString(),
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
      invigilators: schedule.invigilators.map(user => ({
        id: user.id,
        name: user.name,
        role: user.role
      }))
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