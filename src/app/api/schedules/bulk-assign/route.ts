import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // ทำการมอบหมายทั้งหมด
    const results = await Promise.all(
      assignments.map(async (assignment) => {
        try {
          // อัพเดตตารางสอบโดยเพิ่มผู้คุมสอบใหม่
          await prisma.schedule.update({
            where: { id: assignment.id },
            data: {
              invigilatorId: assignment.newInvigilatorId,
            },
          });

          // อัพเดตโควต้าผู้คุมสอบ
          await prisma.invigilator.update({
            where: { id: assignment.newInvigilatorId },
            data: {
              assignedQuota: {
                increment: 1,
              },
            },
          });

          return {
            success: true,
            id: assignment.id,
            invigilatorId: assignment.newInvigilatorId,
          };
        } catch (error) {
          console.error(`Failed to update schedule ${assignment.id}:`, error);
          return {
            success: false,
            id: assignment.id,
            error: (error as Error).message,
          };
        }
      })
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `อัพเดตสำเร็จ ${successful} รายการ, ล้มเหลว ${failed} รายการ`,
      results,
    });
  } catch (error) {
    console.error('Error in bulk assignment:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการมอบหมาย', error: (error as Error).message },
      { status: 500 }
    );
  }
}