import prisma from '@/app/lib/prisma';
import { NextResponse } from 'next/server';
import { logActivity } from '@/app/lib/activity-logger';

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
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const subject = await prisma.$transaction(async (tx) => {
      const newSubject = await tx.subject.create({ data });
      await logActivity('CREATE', `Created subject ${data.code} ${data.name}`, tx);
      return newSubject;
    });
    return NextResponse.json(subject);
  } catch (error) {
    console.error('Error creating subject:', error);
    return NextResponse.json({ error: 'Failed to create subject' }, { status: 500 });
  }
}
