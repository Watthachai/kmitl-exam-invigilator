import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { assignments } = data;

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { message: 'ไม่พบข้อมูลการมอบหมาย' },
        { status: 400 }
      );
    }

    // Log ข้อมูลที่ได้รับเพื่อ debug
    console.log('Received assignments:', assignments.map(a => ({
      scheduleId: a.scheduleId,
      newInvigilatorId: a.newInvigilatorId
    })));

    // สร้าง cache เพื่อลดการเรียกใช้ฐานข้อมูลซ้ำ
    const invigilatorCache = new Map();
    const professorCache = new Map();

    // ทำการมอบหมายทั้งหมด
    const results = await Promise.all(
      assignments.map(async (assignment) => {
        try {
          // ตรวจสอบว่ามี scheduleId หรือไม่
          if (!assignment.scheduleId) {
            throw new Error(`Missing scheduleId for assignment`);
          }
          
          // ถ้าไม่มี newInvigilatorId ให้ลบผู้คุมสอบออก
          if (!assignment.newInvigilatorId) {
            await prisma.schedule.update({
              where: { id: assignment.scheduleId },
              data: { invigilatorId: null }
            });
            
            return {
              success: true,
              scheduleId: assignment.scheduleId,
              invigilatorId: null,
              message: "ลบผู้คุมสอบออกเรียบร้อย"
            };
          }
          
          // จัดการกับ ID ที่มี prefix
          let finalInvigilatorId = assignment.newInvigilatorId;
          
          if (assignment.newInvigilatorId.startsWith('prof_')) {
            // ตัด prefix "prof_" ออก
            const actualProfessorId = assignment.newInvigilatorId.replace('prof_', '');
            
            // ตรวจสอบจาก cache ก่อน
            if (invigilatorCache.has(actualProfessorId)) {
              finalInvigilatorId = invigilatorCache.get(actualProfessorId);
            } else {
              // ค้นหา invigilator จาก professorId
              const existingInvigilator = await prisma.invigilator.findFirst({
                where: { professorId: actualProfessorId }
              });
              
              if (existingInvigilator) {
                // บันทึกลง cache และใช้ ID ที่มีอยู่แล้ว
                finalInvigilatorId = existingInvigilator.id;
                invigilatorCache.set(actualProfessorId, existingInvigilator.id);
              } else {
                // ตรวจสอบจาก professor cache
                let professor;
                if (professorCache.has(actualProfessorId)) {
                  professor = professorCache.get(actualProfessorId);
                } else {
                  // ค้นหา professor จากฐานข้อมูล
                  professor = await prisma.professor.findUnique({
                    where: { id: actualProfessorId },
                    include: { department: true }
                  });
                  professorCache.set(actualProfessorId, professor);
                }
                
                if (!professor) {
                  throw new Error(`Professor with ID ${actualProfessorId} not found`);
                }
                
                try {
                  // สร้าง invigilator ใหม่แบบปลอดภัย (ใช้ upsert เพื่อป้องกัน unique constraint error)
                  const newInvigilator = await prisma.invigilator.upsert({
                    where: { 
                      professorId: actualProfessorId 
                    },
                    update: {}, // ไม่อัพเดทอะไรถ้ามีข้อมูลอยู่แล้ว
                    create: {
                      name: professor.name,
                      type: 'อาจารย์',
                      departmentId: professor.departmentId,
                      professorId: professor.id,
                      quota: 4, // ค่าเริ่มต้น
                      assignedQuota: 0
                    }
                  });
                  
                  finalInvigilatorId = newInvigilator.id;
                  invigilatorCache.set(actualProfessorId, newInvigilator.id);
                  console.log(`Created/Found invigilator with ID ${newInvigilator.id} for professor ${professor.name}`);
                } catch (error) {
                  if ((error as { code?: string }).code === 'P2002') {
                    // ถ้าเกิด unique constraint error ให้ลองค้นหาอีกครั้ง
                    const retryInvigilator = await prisma.invigilator.findFirst({
                      where: { professorId: actualProfessorId }
                    });
                    
                    if (retryInvigilator) {
                      finalInvigilatorId = retryInvigilator.id;
                      invigilatorCache.set(actualProfessorId, retryInvigilator.id);
                    } else {
                      throw new Error(`Cannot create or find invigilator for professor ID ${actualProfessorId}`);
                    }
                  } else {
                    throw error; // ถ้าเป็น error อื่น ให้ throw ต่อ
                  }
                }
              }
            }
          } else {
            // ตรวจสอบว่า invigilator มีอยู่จริง
            if (!invigilatorCache.has(finalInvigilatorId)) {
              const invigilator = await prisma.invigilator.findUnique({
                where: { id: finalInvigilatorId }
              });
              
              if (!invigilator) {
                throw new Error(`Invigilator with ID ${finalInvigilatorId} not found`);
              }
              
              invigilatorCache.set(finalInvigilatorId, invigilator);
            }
          }
          
          // อัพเดตตารางสอบโดยเพิ่มผู้คุมสอบใหม่
          await prisma.schedule.update({
            where: { id: assignment.scheduleId },
            data: { invigilatorId: finalInvigilatorId }
          });

          // อัพเดตโควต้าผู้คุมสอบ
          await prisma.invigilator.update({
            where: { id: finalInvigilatorId },
            data: {
              assignedQuota: {
                increment: 1
              }
            }
          });

          return {
            success: true,
            scheduleId: assignment.scheduleId,
            invigilatorId: finalInvigilatorId
          };
        } catch (error) {
          console.error(`Failed to update schedule ${assignment.scheduleId}:`, error);
          return {
            success: false,
            scheduleId: assignment.scheduleId,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `อัพเดตสำเร็จ ${successful} รายการ, ล้มเหลว ${failed} รายการ`,
      results
    });
  } catch (error) {
    console.error('Error in bulk assignment:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการมอบหมาย', error: String(error) },
      { status: 500 }
    );
  }
}