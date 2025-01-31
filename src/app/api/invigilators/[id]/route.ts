import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const data = await request.json();

        // If type is อาจารย์, get professor's departmentId
        let departmentId = data.departmentId;
        if (data.type === 'อาจารย์' && data.professorId) {
          const professor = await prisma.professor.findUnique({
            where: { id: data.professorId },
            select: { departmentId: true }
          });
          departmentId = professor?.departmentId;
        }

        const updatedInvigilator = await prisma.invigilator.update({
            where: { id },
            data: {
                name: data.name,
                type: data.type,
                departmentId: departmentId || null,
                professorId: data.professorId || null,
            },
            include: {
                department: true,
                professor: {
                    include: {
                        department: true
                    }
                },
                user: true,
                schedules: true,
            }
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