import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from '@/app/lib/prisma';
import { getSocketIO } from '@/app/lib/socket-server'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { scheduleId, type, reason, preferredDates, additionalNotes } = body;

    // Validate required fields
    if (!scheduleId || !type || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new appeal
    const appeal = await prisma.appeal.create({
      data: {
        user: {
          connect: { id: session.user.id }
        },
        schedule: {
          connect: { id: scheduleId }
        },
        type,
        reason,
        preferredDates: preferredDates?.map((date: string) => new Date(date)) || [],
        additionalNotes,
        status: 'PENDING'
      },
      include: {
        schedule: {
          include: {
            subjectGroup: {
              include: {
                subject: true
              }
            }
          }
        }
      }
    });

    // Get Socket.IO instance and emit events
    const io = getSocketIO();
    if (io) {
      console.log('Emitting newAppeal event to admin room');
      io.to('admin').emit('newAppeal', {
        type: 'NEW_APPEAL',
        appeal: appeal
      });
      console.log('Emitting appealUpdated event to user:', session.user.id);
      io.to(session.user.id).emit('appealUpdated', {
        type: 'APPEAL_CREATED',
        appeal: appeal
      });
    }

    return NextResponse.json(appeal);

  } catch (error) {
    console.error('Failed to create appeal:', error);
    return NextResponse.json(
      { error: 'Failed to create appeal' },
      { status: 500 }
    );
  }
}

// GET handler for admin to fetch all appeals
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appeals = await prisma.appeal.findMany({
      include: {
        user: {
          select: {
            name: true,
            role: true
          }
        },
        schedule: {
          include: {
            subjectGroup: {
              include: {
                subject: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(appeals);

  } catch (error) {
    console.error('Failed to fetch appeals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appeals' },
      { status: 500 }
    );
  }
}