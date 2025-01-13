import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const messages = await prisma.message.findMany({
      include: { professor: true },
    });
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const message = await prisma.message.create({
      data: {
        content: data.content,
        notes: data.notes,
        professorId: data.professorId || null,
      },
      include: { professor: true },
    });
    return NextResponse.json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}