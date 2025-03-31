import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';

export async function POST(request: Request) {
    try {
        const { sourceId, targetId } = await request.json();

        if (!sourceId || !targetId) {
            return NextResponse.json({ 
                error: 'Source and target invigilator IDs are required' 
            }, { status: 400 });
        }

        if (sourceId === targetId) {
            return NextResponse.json({ 
                error: 'Source and target cannot be the same invigilator' 
            }, { status: 400 });
        }

        // Get both invigilators to verify they exist
        const sourceInvigilator = await prisma.invigilator.findUnique({
            where: { id: sourceId },
            include: { schedules: true }
        });

        const targetInvigilator = await prisma.invigilator.findUnique({
            where: { id: targetId }
        });

        if (!sourceInvigilator) {
            return NextResponse.json({ 
                error: 'Source invigilator not found' 
            }, { status: 404 });
        }

        if (!targetInvigilator) {
            return NextResponse.json({ 
                error: 'Target invigilator not found' 
            }, { status: 404 });
        }

        // Check how many schedules will be moved
        const scheduleCount = sourceInvigilator.schedules.length;

        // Begin transaction to ensure data integrity
        const result = await prisma.$transaction(async (tx) => {
            // Update all schedules to point to the target invigilator
            await tx.schedule.updateMany({
                where: { invigilatorId: sourceId },
                data: { invigilatorId: targetId }
            });

            // Delete the source invigilator
            const deletedInvigilator = await tx.invigilator.delete({
                where: { id: sourceId }
            });

            // Get the updated target invigilator with transferred schedules
            const updatedTargetInvigilator = await tx.invigilator.findUnique({
                where: { id: targetId },
                include: {
                    schedules: true,
                    department: true,
                    professor: {
                        include: { department: true }
                    },
                    user: true
                }
            });

            return {
                movedSchedules: scheduleCount,
                deletedInvigilator: deletedInvigilator,
                updatedInvigilator: updatedTargetInvigilator
            };
        });

        return NextResponse.json({
            message: `Successfully merged invigilators. Moved ${result.movedSchedules} schedules.`,
            sourceInvigilator: result.deletedInvigilator,
            targetInvigilator: result.updatedInvigilator
        });
    } catch (error) {
        console.error("Error merging invigilators:", error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Failed to merge invigilators'
        }, { status: 500 });
    }
}