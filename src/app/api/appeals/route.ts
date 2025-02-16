import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from '@/app/lib/prisma';

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

    // Check if schedule exists and belongs to user
    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        invigilators: {
          some: {
            id: session.user.id
          }
        }
      }
    });

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found or not assigned to user' },
        { status: 404 }
      );
    }

    // Create new appeal
    const appeal = await prisma.appeal.create({
      data: {
        userId: session.user.id,
        scheduleId,
        type,
        reason,
        preferredDates: preferredDates?.map((date: string) => new Date(date)) || [],
        notes: additionalNotes,
        status: 'PENDING'
      },
      include: {
        schedule: {
          include: {
            room: true,
            subjectGroup: {
              include: {
                subject: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(appeal);

  } catch (error) {
    console.error('Failed to create appeal:', error);
    return NextResponse.json(
      { error: 'Failed to create appeal' },
      { status: 500 }
    );
  }
}