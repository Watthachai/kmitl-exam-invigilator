import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { building, roomNumber } = await request.json();

        // Check for existing room with same building/number
        const existingRoom = await prisma.room.findFirst({
            where: {
                AND: [
                    { building },
                    { roomNumber },
                    { NOT: { id } }
                ]
            }
        });

        if (existingRoom) {
            return NextResponse.json(
                { error: 'Room already exists' }, 
                { status: 400 }
            );
        }

        const updatedRoom = await prisma.room.update({
            where: { id },
            data: {
                building,
                roomNumber,
            },
        });

        return NextResponse.json(updatedRoom);
    } catch (error) {
        console.error("Error updating room:", error);
        return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Check if room has associated schedules
        const roomWithSchedules = await prisma.room.findUnique({
            where: { id },
            include: { schedules: true }
        });

        if (roomWithSchedules?.schedules.length) {
            return NextResponse.json(
                { error: 'Cannot delete room with existing schedules' }, 
                { status: 400 }
            );
        }

        await prisma.room.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Room deleted successfully' });
    } catch (error) {
        console.error("Error deleting room:", error);
        return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
    }
}