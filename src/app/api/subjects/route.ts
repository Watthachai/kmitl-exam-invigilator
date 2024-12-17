import prisma from '@/app/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET: Fetch all subjects
export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      include: { 
        department: true,
        subjectGroups: true,
      }, // Fetch related department and subjectGroups
    });
    return NextResponse.json(subjects, { status: 200 });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 });
  }
}

// POST: Add a new subject
export async function POST(req: NextRequest) {
  try {
    const { name, code, departmentId } = await req.json();
    
    if (!name || !code || !departmentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newSubject = await prisma.subject.create({
      data: {
        name,
        code,
        departmentId,
      },
    });

    return NextResponse.json(newSubject, { status: 201 });
  } catch (error) {
    console.error('Error creating subject:', error);
    return NextResponse.json({ error: 'Failed to create subject' }, { status: 500 });
  }
}
