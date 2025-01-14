import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const schedules = await prisma.schedule.findMany({
      include: {
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
        const { date, startTime, endTime, roomId, subjectGroupId, invigilatorId } = await request.json();
        
        const schedule = await prisma.schedule.create({
        data: {
            date: new Date(date),
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            room: { connect: { id: roomId } },
            subjectGroup: { connect: { id: subjectGroupId } },
            invigilator: { connect: { id: invigilatorId } },
        },
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
        return NextResponse.json(schedule);
    } catch (error) {
        console.error('Error creating schedule:', error);
        return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
    }
  }