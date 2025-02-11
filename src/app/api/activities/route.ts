import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';

interface ActivityPayload {
  type: string;
  description: string;
  userId?: string;
}

export async function GET(): Promise<Response> {
  try {
    const activities = await prisma.activity.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: true
      }
    });
    
    return NextResponse.json({ 
      data: activities 
    });
    
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch activities',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500 
    });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await request.json() as ActivityPayload;
    
    if (!payload?.type || !payload?.description) {
      return NextResponse.json({
        error: 'Invalid payload',
        details: 'Type and description are required'
      }, { 
        status: 400 
      });
    }

    const activity = await prisma.activity.create({
      data: {
        type: payload.type,
        description: payload.description,
        ...(payload.userId && { userId: payload.userId })
      },
      include: {
        user: true
      }
    });

    return NextResponse.json({ 
      data: activity 
    });

  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json({
      error: 'Failed to create activity', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500 
    });
  }
}