import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options as authOptions } from '@/app/api/auth/[...nextauth]/options';
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // หา user และตรวจสอบว่าเป็น invigilator หรือไม่
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        invigilator: true,  // เพิ่ม relation กับ invigilator
        professor: true     // เพิ่ม relation กับ professor
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // ค้นหาตารางสอบตาม invigilator หรือ professor id
    const schedules = await prisma.schedule.findMany({
      where: {
        OR: [
          // กรณีเป็น invigilator (บุคลากร)
          {
            invigilatorId: user.invigilator?.id
          },
          // กรณีเป็น professor (อาจารย์)
          {
            subjectGroup: {
              professorId: user.professor?.id
            }
          }
        ]
      },
      include: {
        room: true,
        subjectGroup: {
          include: {
            subject: true,
            professor: true
          }
        },
        invigilator: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    return NextResponse.json(schedules);
    
  } catch (error) {
    console.error('Failed to fetch schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // ตรวจสอบ session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ตรวจสอบสิทธิ์ admin
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          role: true
        }
      });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

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
        scheduleDateOption: 'FINAL',
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