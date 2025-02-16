import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from '@/app/lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { status, adminResponse } = await req.json();

    // Validate required fields for rejection
    if (status === 'REJECTED' && !adminResponse) {
      return NextResponse.json(
        { error: 'Admin response is required for rejection' },
        { status: 400 }
      );
    }

    const appeal = await prisma.appeal.update({
      where: { id: params.id },
      data: {
        status,
        adminResponse,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(appeal);
  } catch (error) {
    console.error('Failed to update appeal:', error);
    return NextResponse.json(
      { error: 'Failed to update appeal' },
      { status: 500 }
    );
  }
}