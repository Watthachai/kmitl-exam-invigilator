import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { code, name, departmentId } = await request.json();

    const updatedSubject = await prisma.subject.update({
      where: { id },
      data: { code, name, departmentId },
    });

    return NextResponse.json(updatedSubject);
  } catch (error) {
    console.error("Error updating subject:", error);
    return NextResponse.json({ error: 'Failed to update subject' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.subject.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error("Error deleting subject:", error);
    return NextResponse.json({ error: 'Failed to delete subject' }, { status: 500 });
  }
}