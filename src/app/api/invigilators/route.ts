import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const invigilators = await prisma.invigilator.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        departmentId: true,
        professorId: true,
        quota: true,
        assignedQuota: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: {
            name: true,
            code: true
          }
        },
        professor: {
          select: {
            name: true,
            department: true
          }
        },
        schedules: true,
        user: true
      }
    });
    return NextResponse.json(invigilators);
  } catch (error) {
    console.error('Error fetching invigilators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invigilators' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.type) {
      return NextResponse.json(
        { error: 'Name and type are required' }, 
        { status: 400 }
      );
    }

    // Get department ID
    let departmentId = data.departmentId;
    if (data.type === 'อาจารย์' && data.professorId) {
      const professor = await prisma.professor.findUnique({
        where: { id: data.professorId },
        select: { departmentId: true }
      });
      if (!professor) {
        return NextResponse.json(
          { error: 'Professor not found' }, 
          { status: 404 }
        );
      }
      departmentId = professor.departmentId;
    }

    // Create invigilator
    const invigilator = await prisma.invigilator.create({
      data: {
        name: data.name,
        type: data.type,
        departmentId: departmentId,
        professorId: data.professorId || null,
        quota: data.quota || 4,
        assignedQuota: 0
      },
      include: {
        department: true,
        professor: {
          include: {
            department: true
          }
        },
        schedules: true
      }
    });

    return NextResponse.json(invigilator);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Invigilator already exists' }, 
          { status: 409 }
        );
      }
    }
    return NextResponse.json(
      { error: 'Failed to create invigilator' }, 
      { status: 500 }
    );
  }
}