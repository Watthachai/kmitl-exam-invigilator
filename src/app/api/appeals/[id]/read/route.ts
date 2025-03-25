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
      const data = await request.json();
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
  
      const updatedAppeal = await prisma.appeal.update({
        where: {
          id: id,
          userId: session.user.id
        },
        data: {
          read: true,
          ...data
        }
      });
  
      return new Response(JSON.stringify(updatedAppeal), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Failed to mark appeal as read:', error);
      return new Response(JSON.stringify({ error: 'Failed to update appeal' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  }