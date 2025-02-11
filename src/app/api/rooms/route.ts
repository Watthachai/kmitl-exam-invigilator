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