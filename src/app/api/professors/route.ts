import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const professors = await prisma.professor.findMany();
    return NextResponse.json(professors);
  } catch (error) {
    console.error('Error fetching professors:', error);
    return NextResponse.json({ error: 'Failed to fetch professors' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, department } = await request.json();
    const professor = await prisma.professor.create({
      data: { name, department },
    });
    return NextResponse.json(professor);
  } catch (error) {
    console.error('Error creating professor:', error);
    return NextResponse.json({ error: 'Failed to create professor' }, { status: 500 });
  }
}