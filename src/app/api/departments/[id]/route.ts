import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { name } = await request.json();

        const updatedDepartment = await prisma.department.update({
            where: { id },
            data: { name },
        });

        return NextResponse.json(updatedDepartment);
    } catch (error) {
        console.error("Error updating department:", error);
        return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.department.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Department deleted successfully' });
    } catch (error) {
        console.error("Error deleting department:", error);
        return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 });
    }
}