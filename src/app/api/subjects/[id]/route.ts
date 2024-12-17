import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const id = context.params.id;
    if (!id) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, code, departmentId } = body;

    if (!name || !code || !departmentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const updatedSubject = await prisma.subject.update({
      where: { id },
      data: { name, code, departmentId },
      include: {
        department: true,
        subjectGroups: true,
      },
    });

    return NextResponse.json(updatedSubject);
  } catch (error) {
    console.error('Failed to update subject:', error);
    return NextResponse.json({ error: 'Failed to update subject' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const id = context.params.id;
    if (!id) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await prisma.subject.delete({ where: { id } });
    return NextResponse.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Failed to delete subject:', error);
    return NextResponse.json({ error: 'Failed to delete subject' }, { status: 500 });
  }
}