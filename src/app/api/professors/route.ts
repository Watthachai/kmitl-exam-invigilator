import { NextResponse, NextRequest } from "next/server";
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const professors = await prisma.professor.findMany({
      include: {
        department: true
      }
    });
    return NextResponse.json(professors);
  } catch (error) {
    console.error('Error fetching professors:', error);
    return NextResponse.json({ error: 'Failed to fetch professors' }, { status: 500 });
  }
}
export async function POST(req: NextRequest) {
  try {
    const { name, departmentId } = await req.json();
    
    if (!name || !departmentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const professor = await prisma.professor.create({
      data: {
        name,
        department: {
          connect: { id: departmentId }
        }
      },
      include: {
        department: true
      }
    });

    return NextResponse.json(professor);
  } catch (error) {
    console.error('Error creating professor:', error);
    return NextResponse.json({ error: 'Failed to create professor' }, { status: 500 });
  }
}