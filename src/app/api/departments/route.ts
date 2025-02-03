import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            subjects: true,
            professors: true,
            invigilators: true
          }
        }
      }
    });

    return NextResponse.json(departments, { status: 200 });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, code } = await request.json();
    
    // Validate
    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
    }

    // Check unique
    const existing = await prisma.department.findFirst({
      where: {
        OR: [
          { name },
          { code }
        ]
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Department with this name or code already exists' }, { status: 400 });
    }

    // Create
    const department = await prisma.department.create({
      data: { name, code }
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
  }
}