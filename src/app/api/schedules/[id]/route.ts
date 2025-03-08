import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const body = await request.json();
        
        const { previousInvigilatorId } = body;
        let { invigilatorId, updateQuota } = body;
        
        // ตรวจสอบว่าเป็น ID อาจารย์หรือไม่
        const isProfessorId = invigilatorId?.toString().startsWith('prof_');
        
        if (isProfessorId) {
            // แปลง ID อาจารย์เป็น ID จริง
            const actualProfessorId = invigilatorId.replace('prof_', '');
            
            // ค้นหาหรือสร้าง invigilator สำหรับอาจารย์
            const existingInvigilator = await prisma.invigilator.findFirst({
                where: { professorId: actualProfessorId }
            });
            
            if (existingInvigilator) {
                // ถ้ามี invigilator อยู่แล้ว ให้ใช้ ID นี้
                invigilatorId = existingInvigilator.id;
            } else {
                // ถ้าไม่มี ให้สร้าง invigilator ใหม่
                const professor = await prisma.professor.findUnique({
                    where: { id: actualProfessorId },
                    include: { department: true }
                });
                
                if (professor) {
                    const newInvigilator = await prisma.invigilator.create({
                        data: {
                            name: professor.name,
                            type: 'อาจารย์',
                            quota: 5,
                            assignedQuota: 1, // ตั้งเริ่มต้นที่ 1 เพราะกำลังจะใช้งาน
                            professorId: professor.id,
                            departmentId: professor.departmentId
                        }
                    });
                    
                    invigilatorId = newInvigilator.id;
                    // ไม่ต้องเพิ่มโควต้าอีกเพราะเราตั้งค่าเริ่มต้นที่ 1 แล้ว
                    updateQuota = false;
                }
            }
        }
        
        // ลดโควต้าผู้คุมสอบคนเก่า (ถ้ามี)
        if (updateQuota && previousInvigilatorId && previousInvigilatorId !== invigilatorId) {
            await prisma.invigilator.update({
                where: { id: previousInvigilatorId },
                data: { assignedQuota: { decrement: 1 } }
            });
        }
        
        // เพิ่มโควต้าผู้คุมสอบคนใหม่ (ถ้ามี)
        if (updateQuota && invigilatorId && previousInvigilatorId !== invigilatorId) {
            await prisma.invigilator.update({
                where: { id: invigilatorId },
                data: { assignedQuota: { increment: 1 } }
            });
        }
        
        // อัปเดตตารางสอบ
        const updatedSchedule = await prisma.schedule.update({
            where: { id },
            data: {
                ...body,
                invigilatorId: invigilatorId || null
            },
            include: {
                // ใส่ include ตามที่คุณต้องการ
            }
        });
        
        return NextResponse.json(updatedSchedule);
    } catch (error) {
        console.error('Error updating schedule:', error);
        return NextResponse.json(
            { error: 'Failed to update schedule' },
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