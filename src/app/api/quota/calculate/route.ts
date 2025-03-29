import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { options } from '@/app/api/auth/[...nextauth]/options';

export async function GET() {
  try {
    // ตรวจสอบสิทธิ์ admin
    const session = await getServerSession(options);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 1. นับจำนวนแถวการสอบทั้งหมด
    const totalExamRows = await prisma.schedule.count();
    
    // 2. นับจำนวนอาจารย์ทั้งหมดจากตาราง Professor
    const professorCount = await prisma.professor.count();
    
    // 3. นับจำนวนบุคลากรทั้งหมดจากตาราง Invigilator (ที่ไม่ใช่อาจารย์)
    const staffCount = await prisma.invigilator.count({
      where: { type: 'บุคลากร' }
    });
    
    // 4. คำนวณโควต้าสำหรับอาจารย์แต่ละคน
    const professorQuota = professorCount > 0 ? Math.floor(totalExamRows / professorCount) : 0;
    
    // 5. คำนวณโควต้าเหลือสำหรับบุคลากร
    const remainingQuota = totalExamRows - (professorQuota * professorCount);
    
    // 6. คำนวณโควต้าสำหรับบุคลากรแต่ละคน
    const staffQuota = staffCount > 0 ? Math.floor(remainingQuota / staffCount) : 0;
    
    // 7. คำนวณข้อมูลเพิ่มเติมเพื่อแสดงผล
    // - จำนวนอาจารย์ที่ยังไม่มี invigilator
    // แก้ไขการใช้ invigilator: null เป็นการใช้ none operator
    const professorsWithoutInvigilator = await prisma.professor.count({
      where: {
        invigilator: {
          none: {}
        }
      }
    });
    
    // - จำนวนอาจารย์ที่มี invigilator แล้ว
    // แก้ไขเป็นใช้ some operator
    const professorsWithInvigilator = await prisma.professor.count({
      where: {
        invigilator: {
          some: {}
        }
      }
    });
    
    return NextResponse.json({
      totalExamRows,
      professorCount,
      staffCount,
      professorQuota,
      remainingQuota,
      staffQuota,
      professorsWithoutInvigilator,
      professorsWithInvigilator
    });
  } catch (error) {
    console.error('Error calculating quotas:', error);
    return NextResponse.json({ error: 'Failed to calculate quotas' }, { status: 500 });
  }
}