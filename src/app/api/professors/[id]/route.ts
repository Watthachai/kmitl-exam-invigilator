import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, departmentId } = body;

    const professor = await prisma.professor.update({
      where: { id },
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
    console.error('Error updating professor:', error);
    return NextResponse.json(
      { error: 'Failed to update professor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.professor.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Professor deleted successfully' });
    } catch (error) {
        console.error("Error deleting professor:", error);
        return NextResponse.json({ error: 'Failed to delete professor' }, { status: 500 });
    }
}