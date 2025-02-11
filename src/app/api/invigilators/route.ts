import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { Prisma } from '@prisma/client';
import { logActivity } from '@/app/lib/activity-logger';

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
    const invigilator = await prisma.$transaction(async (tx) => {
      const newInvigilator = await tx.invigilator.create({ 
        data,
        include: {
          department: true,
          professor: true
        }
      });
      
      // Check if userId exists before passing it to logActivity
      if (newInvigilator.userId) {
        await logActivity(
          'CREATE', 
          `Added invigilator ${data.name} (${newInvigilator.department?.name || 'No department'})`,
          prisma, // Pass the prisma instance
          newInvigilator.userId
        );
      } else {
        await logActivity(
          'CREATE', 
          `Added invigilator ${data.name} (${newInvigilator.department?.name || 'No department'})`,
          prisma
        );
      }
      
      return newInvigilator;
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
    console.error('Error creating invigilator:', error);
    return NextResponse.json(
      { error: 'Failed to create invigilator' }, 
      { status: 500 }
    );
  }
}