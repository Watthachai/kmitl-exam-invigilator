import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { logActivity } from '@/app/lib/activity-logger';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, codes } = await request.json();
    
    if (!name || !codes?.length) {
      return NextResponse.json({
        error: 'Name and at least one code are required'
      }, { 
        status: 400 
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const department = await tx.department.update({
        where: { id },
        data: {
          name,
          code: codes[0],
          metadata: {
            codes: codes.slice(1)
          }
        },
        select: {
          id: true,
          name: true,
          code: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              subjects: true,
              professors: true,
              invigilators: true
            }
          }
        }
      });

      await logActivity(
        'UPDATE',
        `Updated department ${name} with codes: ${codes.join(', ')}`,
        tx
      );

      return {
        ...department,
        codes: [department.code, ...((department.metadata as { codes?: string[] })?.codes || [])].filter(Boolean)
      };
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json({ 
      error: 'Failed to update department' 
    }, { 
      status: 500 
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      // Get department details before deletion for logging
      const department = await tx.department.findUnique({
        where: { id },
        select: {
          name: true,
          code: true,
          metadata: true,
          _count: {
            select: {
              subjects: true,
              professors: true,
              invigilators: true
            }
          }
        }
      });

      if (!department) {
        throw new Error('Department not found');
      }

      // Delete the department
      await tx.department.delete({
        where: { id }
      });

      // Log the activity with details
      await logActivity(
        'DELETE',
        `Deleted department ${department.name} (${department.code}) with ${department._count.subjects} subjects, ${department._count.professors} professors, and ${department._count.invigilators} invigilators`,
        tx
      );

      return department;
    });

    return NextResponse.json({ 
      message: 'Department deleted successfully',
      department: result 
    });

  } catch (error) {
    console.error("Error deleting department:", error);
    
    if (error instanceof Error && error.message === 'Department not found') {
      return NextResponse.json({ 
        error: 'Department not found' 
      }, { 
        status: 404 
      });
    }

    return NextResponse.json({ 
      error: 'Failed to delete department' 
    }, { 
      status: 500 
    });
  }
}