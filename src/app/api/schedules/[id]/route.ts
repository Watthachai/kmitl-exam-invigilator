import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const {
            date, startTime, endTime, roomId, subjectGroupId,
            invigilatorId, previousInvigilatorId
        } = await request.json();

        return await prisma.$transaction(async (tx) => {
            // ถ้ามีการเปลี่ยนแปลงผู้คุมสอบ
            if (previousInvigilatorId !== invigilatorId) {
                // ลดโควต้าของผู้คุมสอบคนเก่า
                if (previousInvigilatorId) {
                    await tx.invigilator.update({
                        where: { id: previousInvigilatorId },
                        data: { assignedQuota: { decrement: 1 } }
                    });
                }

                // เพิ่มโควต้าให้ผู้คุมสอบคนใหม่ (ถ้ามี)
                if (invigilatorId) {
                    const newInvigilator = await tx.invigilator.findUnique({
                        where: { id: invigilatorId }
                    });
                    
                    if (newInvigilator && newInvigilator.assignedQuota >= newInvigilator.quota) {
                        throw new Error('Invigilator quota exceeded');
                    }
                    
                    await tx.invigilator.update({
                        where: { id: invigilatorId },
                        data: { assignedQuota: { increment: 1 } }
                    });
                }
            }

            // อัพเดตตารางสอบ
            const updatedSchedule = await tx.schedule.update({
                where: { id },
                data: {
                    date: new Date(date),
                    startTime: new Date(startTime),
                    endTime: new Date(endTime),
                    room: { connect: { id: roomId } },
                    subjectGroup: { connect: { id: subjectGroupId } },
                    invigilator: invigilatorId 
                        ? { connect: { id: invigilatorId } }
                        : { disconnect: true }
                },
                include: {
                    room: true,
                    subjectGroup: {
                        include: {
                            subject: true
                        }
                    },
                    invigilator: true
                }
            });

            return NextResponse.json(updatedSchedule);
        });
    } catch (error) {
        console.error('Error updating schedule:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update schedule' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const invigilatorId = body.invigilatorId;

        return await prisma.$transaction(async (tx) => {
            // ถ้ามี invigilatorId ให้ลดโควต้าก่อนลบตารางสอบ
            if (invigilatorId) {
                const currentInvigilator = await tx.invigilator.findUnique({
                    where: { id: invigilatorId }
                });

                if (currentInvigilator && currentInvigilator.assignedQuota > 0) {
                    await tx.invigilator.update({
                        where: { id: invigilatorId },
                        data: { 
                            assignedQuota: {
                                decrement: 1
                            }
                        }
                    });
                }
            }

            // ลบตารางสอบ
            await tx.schedule.delete({
                where: { id }
            });

            return NextResponse.json({ message: 'Schedule deleted successfully' });
        });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        return NextResponse.json(
            { error: 'Failed to delete schedule' },
            { status: 500 }
        );
    }
}