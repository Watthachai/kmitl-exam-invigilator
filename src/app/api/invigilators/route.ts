import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const invigilators = await prisma.invigilator.findMany();
    return NextResponse.json(invigilators);
  } catch (error) {
    console.error('Error fetching invigilators:', error);
    return NextResponse.json({ error: 'Failed to fetch invigilators' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const invigilator = await prisma.invigilator.create({
      data: {
        name: data.name,
        type: data.type,
        professorId: data.professorId || null,
      },
    });
    return NextResponse.json(invigilator);
  } catch (error) {
    console.error('Error creating invigilator:', error);
    return NextResponse.json({ error: 'Failed to create invigilator' }, { status: 500 });
    
  }
}