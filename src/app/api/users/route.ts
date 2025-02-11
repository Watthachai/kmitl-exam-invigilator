import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { options } from '../auth/[...nextauth]/options';

export async function GET() {
  try {
    const session = await getServerSession(options);
    
    // Check if user is admin
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users with their sessions
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        sessions: {
          where: {
            expires: {
              gt: new Date()
            }
          }
        }
      }
    });

    // Add isActive property based on session existence
    const usersWithStatus = users.map(user => ({
      ...user,
      isActive: user.sessions.length > 0
    }));

    return NextResponse.json({ users: usersWithStatus });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' }, 
      { status: 500 }
    );
  }
}