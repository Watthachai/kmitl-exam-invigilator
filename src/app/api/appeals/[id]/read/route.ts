import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options as authOptions } from '@/app/api/auth/[...nextauth]/options';
import prisma from '@/app/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const session = await getServerSession(authOptions);
      const { id } = await params;
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
  
      const appeal = await prisma.appeal.update({
        where: {
          id: id,
          userId: session.user.id
        },
        data: {
          read: true
        }
      });
  
      return NextResponse.json(appeal);
    } catch (error) {
      console.error('Failed to mark appeal as read:', error);
      return NextResponse.json(
        { error: 'Failed to mark appeal as read' },
        { status: 500 }
      );
    }
  }