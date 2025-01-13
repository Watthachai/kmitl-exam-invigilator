import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { name, type, professorId } = await request.json();

        const updatedInvigilator = await prisma.invigilator.update({
            where: { id },
            data: {
                name,
                type,
                professorId: professorId || null,
            },
        });

        return NextResponse.json(updatedInvigilator);
    } catch (error) {
        console.error("Error updating invigilator:", error);
        return NextResponse.json({ error: 'Failed to update invigilator' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.invigilator.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Invigilator deleted successfully' });
    } catch (error) {
        console.error("Error deleting invigilator:", error);
        return NextResponse.json({ error: 'Failed to delete invigilator' }, { status: 500 });
    }
}