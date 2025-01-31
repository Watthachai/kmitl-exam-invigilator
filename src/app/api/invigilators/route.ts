import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET() {
  const invigilators = await prisma.invigilator.findMany({
    include: {
      department: true,
      professor: true,
      user: true,
      schedules: true,
    },
  });
  return Response.json(invigilators);
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // If type is อาจารย์, get professor's departmentId
    let departmentId = data.departmentId;
    if (data.type === 'อาจารย์' && data.professorId) {
      const professor = await prisma.professor.findUnique({
        where: { id: data.professorId },
        select: { departmentId: true }
      });
      departmentId = professor?.departmentId;
    }

    const invigilator = await prisma.invigilator.create({
      data: {
        name: data.name,
        type: data.type,
        departmentId: departmentId || null,
        professorId: data.professorId || null,
      },
      include: {
        department: true,
        professor: {
          include: {
            department: true
          }
        },
        user: true,
        schedules: true,
      }
    });
    return NextResponse.json(invigilator);
  } catch (error) {
    console.error('Error creating invigilator:', error);
    return NextResponse.json({ error: 'Failed to create invigilator' }, { status: 500 });
  }
}