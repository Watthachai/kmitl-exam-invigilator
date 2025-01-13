import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { groupNumber, year, studentCount, subjectId, professorId } = await request.json();

        const updatedSubjectGroup = await prisma.subjectGroup.update({
            where: { id },
            data: {
                groupNumber,
                year,
                studentCount,
                subject: { connect: { id: subjectId } },
                professor: { connect: { id: professorId } },
            },
            include: {
                subject: true,
                professor: true,
            },
        });

        return NextResponse.json(updatedSubjectGroup);
    } catch (error) {
        console.error("Error updating subject group:", error);
        return NextResponse.json({ error: 'Failed to update subject group' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.subjectGroup.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Subject group deleted successfully' });
    } catch (error) {
        console.error("Error deleting subject group:", error);
        return NextResponse.json({ error: 'Failed to delete subject group' }, { status: 500 });
    }
}