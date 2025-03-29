import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { options } from '@/app/api/auth/[...nextauth]/options';

export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบสิทธิ์ admin
    const session = await getServerSession(options);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // อ่านข้อมูล request
    const requestData = await request.json();
    const quotaType = requestData?.quotaType || 'default';
    
    // สถิติสำหรับส่งกลับ
    const stats = {
      schedulesUpdated: 0,
      professorsAssigned: 0,
      invigilatorsUpdated: 0,
      professorQuota: 0,
      staffQuota: 0
    };

    // 1. อัพเดทสถานะคอลัมน์ quotaFilled ของตาราง schedules
    const schedules = await prisma.schedule.findMany();
    
    for (const schedule of schedules) {
      const isFilled = schedule.departmentQuota <= 0;
      if (isFilled !== schedule.quotaFilled) {
        await prisma.schedule.update({
          where: { id: schedule.id },
          data: { quotaFilled: isFilled }
        });
        stats.schedulesUpdated++;
      }
    }

    // 2. คำนวณโควต้าตามวิธีที่เลือก
    if (quotaType === 'proportional') {
      // แนวทางการคำนวณโควต้าตามสัดส่วนอาจารย์และจำนวนแถวสอบ
      
      // 2.1 นับจำนวนแถวการสอบทั้งหมด
      const totalExamRows = await prisma.schedule.count();
      
      // 2.2 นับจำนวนอาจารย์ทั้งหมดจากตาราง Professor
      const totalProfessors = await prisma.professor.count();
      
      // 2.3 นับจำนวนบุคลากรทั้งหมด
      const totalStaff = await prisma.invigilator.count({
        where: { type: 'บุคลากร' }
      });
      
      // 2.4 คำนวณโควต้าสำหรับอาจารย์แต่ละคน (หาร)
      const professorQuota = Math.floor(totalExamRows / totalProfessors);
      
      // 2.5 คำนวณโควต้าเหลือสำหรับบุคลากร
      const remainingQuota = totalExamRows - (professorQuota * totalProfessors);
      
      // 2.6 คำนวณโควต้าสำหรับบุคลากรแต่ละคน (หาร)
      const staffQuota = totalStaff > 0 ? Math.floor(remainingQuota / totalStaff) : 0;
      
      console.log({
        totalExamRows,
        totalProfessors,
        totalStaff,
        professorQuota,
        remainingQuota,
        staffQuota
      });
      
      // 2.7 อัพเดทโควต้าให้อาจารย์ที่มี invigilator แล้ว
      const professorInvigilators = await prisma.invigilator.updateMany({
        where: { 
          type: 'อาจารย์',
          professorId: { not: null }
        },
        data: { quota: professorQuota }
      });
      
      // 2.8 สร้าง invigilator ใหม่สำหรับอาจารย์ที่ยังไม่มี
      const professorsWithoutInvigilator = await prisma.professor.findMany({
        where: { 
          invigilator: {
            none: {}
          },
          user: {
            isNot: null  // มีการเชื่อมโยงกับผู้ใช้แล้ว
          }
        },
        include: {
          department: true,
          user: true
        }
      });
      
      // สร้าง invigilator ใหม่สำหรับอาจารย์แต่ละคนที่ยังไม่มี
      for (const professor of professorsWithoutInvigilator) {
        // ถ้าอาจารย์มีผู้ใช้งานที่เชื่อมโยงแล้ว
        if (professor.user) {
          await prisma.invigilator.create({
            data: {
              userId: professor.user.id,
              departmentId: professor.departmentId,
              professorId: professor.id,
              type: 'อาจารย์',
              quota: professorQuota,
              assignedQuota: 0
            }
          });
          stats.professorsAssigned++;
        } else {
          // ถ้าอาจารย์ยังไม่มีผู้ใช้งานที่เชื่อมโยง เราอาจจะต้องสร้างผู้ใช้งานใหม่
          // หรือข้ามไป แล้วแต่ความต้องการของระบบ
          console.log(`Professor ${professor.name} has no linked user account`);
        }
      }
      
      // 2.9 อัพเดทโควต้าให้บุคลากร
      if (totalStaff > 0) {
        const staffUpdated = await prisma.invigilator.updateMany({
          where: { type: 'บุคลากร' },
          data: { quota: staffQuota }
        });
        
        stats.invigilatorsUpdated += staffUpdated.count;
      }
      
      stats.professorQuota = professorQuota;
      stats.staffQuota = staffQuota;
      stats.invigilatorsUpdated += professorInvigilators.count;
    } else {
      // วิธีการคำนวณโควต้าตามค่าเริ่มต้น
      // ถ้ามีโค้ดอยู่แล้ว ให้คงไว้ตามเดิม
      
      // ตัวอย่างการคำนวณแบบค่าเริ่มต้น:
      // 1. อัพเดทโควต้าตามค่าเริ่มต้นของแต่ละภาควิชา
      const departments = await prisma.department.findMany();
      
      for (const department of departments) {
        const invigilators = await prisma.invigilator.findMany({
          where: {
            OR: [
              { departmentId: department.id },
              { professor: { departmentId: department.id } }
            ]
          }
        });
        
        for (const invigilator of invigilators) {
          // กำหนดค่าโควต้าตามค่าเริ่มต้น (อาจมีการกำหนดให้ต่างกันตามประเภทของผู้คุมสอบ)
          const defaultQuota = invigilator.type === 'อาจารย์' ? 5 : 3;
          
          if (invigilator.quota !== defaultQuota) {
            await prisma.invigilator.update({
              where: { id: invigilator.id },
              data: { quota: defaultQuota }
            });
            stats.invigilatorsUpdated++;
          }
        }
      }
    }
    
    return NextResponse.json({ 
      message: 'Data updated successfully', 
      stats 
    });
  } catch (error) {
    console.error('Error updating data:', error);
    return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
  }
}
