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
          
          // Check if this professor is already linked to another invigilator
          if (data.professorId) {
            const existingInvigilator = await prisma.invigilator.findFirst({
              where: { 
                professorId: data.professorId,
                NOT: { id } // Exclude the current invigilator
              }
            });
            
            if (existingInvigilator) {
              return NextResponse.json({ 
                error: 'Professor is already linked to another invigilator' 
              }, { status: 400 });
            }
          }
        }

        // Use a transaction to handle updates safely
        const updatedInvigilator = await prisma.$transaction(async (tx) => {
            // If the invigilator is being changed from one professor to another
            // we need to make sure we disconnect old links
            const currentInvigilator = await tx.invigilator.findUnique({
                where: { id },
                select: { professorId: true }
            });
            
            // If we're removing a professor connection, make sure to set it to null
            if (currentInvigilator?.professorId && !data.professorId) {
                await tx.invigilator.update({
                    where: { id },
                    data: { professorId: null }
                });
            }
            
            // Now perform the actual update
            return await tx.invigilator.update({
                where: { id },
                data: {
                    name: data.name,
                    type: data.type,
                    departmentId,
                    quota: data.quota,
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
        });

        return NextResponse.json(updatedInvigilator);
    } catch (error) {
        console.error("Error updating invigilator:", error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Failed to update invigilator'
        }, { status: 500 });
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