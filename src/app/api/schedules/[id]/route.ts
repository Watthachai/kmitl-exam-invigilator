import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { date, startTime, endTime, roomId, subjectGroupId, invigilatorId } = await request.json();

        const updatedSchedule = await prisma.schedule.update({
            where: { id },
            data: {
                date: new Date(date),
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                room: { connect: { id: roomId } },
                subjectGroup: { connect: { id: subjectGroupId } },
                invigilator: { connect: { id: invigilatorId } },
            },
            include: {
                room: true,
                subjectGroup: {
                    include: {
                        subject: true,
                    },
                },
                invigilator: true,
            },
        });

        return NextResponse.json(updatedSchedule);
    } catch (error) {
        console.error("Error updating schedule:", error);
        return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.schedule.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        console.error("Error deleting schedule:", error);
        return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
    }
}