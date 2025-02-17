import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from '@/app/lib/prisma';
import { getSocketIO } from '@/app/lib/socket-server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { status, adminResponse } = await request.json();

    // Validate required fields for rejection
    if (status === 'REJECTED' && !adminResponse) {
      return NextResponse.json(
        { error: 'Admin response is required for rejection' },
        { status: 400 }
      );
    }

    const appeal = await prisma.appeal.update({
      where: { id: id },
      data: {
        status,
        adminResponse,
        updatedAt: new Date()
      }
    });

    const response = NextResponse.json(appeal);
    const io = getSocketIO();
    
    if (io) {
      io.to(appeal.userId).emit('appealUpdated', appeal);
    }

    return response;

  } catch (error) {
    console.error('Failed to update appeal:', error);
    return NextResponse.json(
      { error: 'Failed to update appeal' },
      { status: 500 }
    );
  }
}