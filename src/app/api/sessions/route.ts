import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { options } from '../auth/[...nextauth]/options';
import { logActivity } from '@/app/lib/activity-logger';

export async function GET() {
  try {
    const session = await getServerSession(options);
    
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeSessions = await prisma.session.findMany({
      where: {
        expires: {
          gt: new Date()
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true
          }
        }
      }
    });

    return NextResponse.json({
      activeSessions,
      totalActive: activeSessions.length
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(options);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, userId } = await req.json();

    if (!sessionId || !userId) {
      return NextResponse.json({ error: 'Session ID and User ID are required' }, { status: 400 });
    }

    // First verify the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete the specific session
    const deletedSession = await prisma.session.delete({
      where: { id: sessionId }
    });

    if (!deletedSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await logActivity(
      'ADMIN',
      `Admin ${session.user.email} forced logout for user ${user.email}`,
      prisma,
      session.user.id
    );

    return NextResponse.json({ 
      message: 'User logged out successfully',
      sessionId: deletedSession.id
    });
  } catch (error) {
    console.error('Error logging out user:', error);
    return NextResponse.json({ 
      error: 'Failed to logout user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500 
    });
  }
}