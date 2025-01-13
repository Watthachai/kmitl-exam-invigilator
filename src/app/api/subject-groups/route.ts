import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const subjectGroups = await prisma.subjectGroup.findMany({
      include: {
        subject: true,
        professor: true,
      },
    });
    return NextResponse.json(subjectGroups);
  } catch (error) {
    console.error('Error fetching subject groups:', error);
    return NextResponse.json({ error: 'Failed to fetch subject groups' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { groupNumber, year, studentCount, subjectId, professorId } = await request.json();
    
    const subjectGroup = await prisma.subjectGroup.create({
      data: {
        groupNumber,
        year,
        studentCount,
        subject: { connect: { id: subjectId } },
        professor: { connect: { id: professorId } },
      },
      include: {
        subject: true,
        professor: true,
      },
    });
    return NextResponse.json(subjectGroup);
  } catch (error) {
    console.error('Error creating subject group:', error);
    return NextResponse.json({ error: 'Failed to create subject group' }, { status: 500 });
  }
}