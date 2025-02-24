import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';
import { logActivity } from '@/app/lib/activity-logger';

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
      }
    });

    // Log schedules time for debugging
    rooms.forEach(room => {
      console.log(`Room ${room.roomNumber} schedules:`, 
        room.schedules.map(s => ({
          id: s.id,
          startTime: new Date(s.startTime).toLocaleTimeString(),
          hour: new Date(s.startTime).getHours()
        }))
      );
    });

    return NextResponse.json({ data: rooms });
  } catch (error) {
    console.error('Failed to fetch rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const data = await request.json();
  
  return await prisma.$transaction(async (tx) => {
    const room = await tx.room.create({
      data: {
        building: data.building,
        roomNumber: data.roomNumber
      }
    });

    await logActivity('CREATE', `Created room ${data.building}-${data.roomNumber}`, tx);
    
    return NextResponse.json(room);
  });
}