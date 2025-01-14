import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        schedules: {
          include: {
            subjectGroup: {
              include: {
                subject: true
              }
            },
            invigilator: true
          }
        }
      },
      orderBy: {
        building: 'asc'
      }
    });

    if (!rooms) {
      return NextResponse.json({ error: 'No rooms found' }, { status: 404 });
    }

    return NextResponse.json({ data: rooms });

  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch rooms',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500 
    });
  }
}

export async function POST(request: Request) {
  try {
    const { building, roomNumber } = await request.json();
    
    // Check for existing room
    const existingRoom = await prisma.room.findFirst({
      where: {
        AND: [
          { building },
          { roomNumber }
        ]
      }
    });

    if (existingRoom) {
      return NextResponse.json(
        { error: 'Room already exists' }, 
        { status: 400 }
      );
    }

    const room = await prisma.room.create({
      data: {
        building,
        roomNumber,
      },
    });
    return NextResponse.json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}