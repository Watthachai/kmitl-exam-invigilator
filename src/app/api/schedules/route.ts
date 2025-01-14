
import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const schedules = await prisma.schedule.findMany({
      include: {
        room: true,
        subjectGroup: {
          include: {
            subject: true,
          },
        },
        invigilator: true,
      },
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
    
    if (!body?.subjectGroupId || !body?.date || !body?.startTime || 
        !body?.endTime || !body?.roomId || !body?.invigilatorId) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    const schedule = await prisma.schedule.create({
      data: {
        date: new Date(body.date),
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
        subjectGroup: { connect: { id: body.subjectGroupId } },
        room: { connect: { id: body.roomId } },
        invigilator: { connect: { id: body.invigilatorId } }
      },
      include: {
        subjectGroup: {
          include: {
            subject: true
          }
        },
        room: true,
        invigilator: true
      }
    });

    return NextResponse.json({ data: schedule });

  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json({
      error: 'Failed to create schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500 
    });
  }
}