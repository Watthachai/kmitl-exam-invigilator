import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function POST() {
  try {
    console.log('🔍 เริ่มต้นกระบวนการคำนวณโควต้า...');

    // 1. ดึงข้อมูลจำนวนตารางสอบทั้งหมด
    console.log('📊 กำลังดึงข้อมูลจำนวนตารางสอบ...');
    const scheduleStats = await prisma.schedule.groupBy({
      by: ['subjectGroupId'],
      _count: true,
      where: {
        OR: [{ examType: 'MIDTERM' }, { examType: 'FINAL' }]
      }
    });
    console.log(`✅ พบตารางสอบทั้งหมด ${scheduleStats.length} กลุ่ม`);

    // 2. ดึงข้อมูลอาจารย์แยกตามภาควิชา
    console.log('📋 กำลังดึงข้อมูลอาจารย์ตามภาควิชา...');
    const departmentStats = await prisma.invigilator.groupBy({
      by: ['departmentId'],
      _count: true,
      where: { type: 'อาจารย์' }
    });
    console.log(`✅ พบภาควิชาทั้งหมด ${departmentStats.length} ภาควิชา`);

    // 3. คำนวณ quota สำหรับแต่ละภาควิชา
    for (const deptStat of departmentStats) {
      const departmentId = deptStat.departmentId;
      const invigilatorsInDept = deptStat._count;

      console.log(`\n📌 ภาควิชา ID: ${departmentId}`);
      console.log(`👨‍🏫 จำนวนอาจารย์ในภาควิชา: ${invigilatorsInDept}`);

      if (invigilatorsInDept === 0) {
        console.log('⚠️ ข้ามภาควิชานี้เนื่องจากไม่มีอาจารย์');
        continue;
      }

      // คำนวณจำนวนตารางสอบที่ต้องดูแลโดยภาควิชานี้
      const schedulesForDept = await Promise.all(
        scheduleStats.map(async s => {
          const subjectGroup = await prisma.subjectGroup.findUnique({
            where: { id: s.subjectGroupId },
            include: { subject: true }
          });
          return subjectGroup?.subject.departmentId === departmentId ? s : null;
        })
      ).then(results => results.filter(Boolean));

      const totalSchedulesForDept = schedulesForDept.reduce((sum, s) => sum + (s as NonNullable<typeof s>)._count, 0);

      console.log(`📚 จำนวนตารางสอบของภาควิชา: ${totalSchedulesForDept}`);

      // คำนวณโควต้าพื้นฐานต่ออาจารย์
      const baseQuota = Math.floor(totalSchedulesForDept / invigilatorsInDept);
      let remainingQuota = totalSchedulesForDept % invigilatorsInDept;

      console.log(`✂️ คำนวณโควต้า: อาจารย์แต่ละคนจะได้ ${baseQuota}`);
      console.log(`🧮 เศษโควต้าที่ยังไม่ได้จัดสรร: ${remainingQuota}`);

      // อัพเดต quota ให้อาจารย์ทุกคนในภาควิชา
      const updatedInvigilators = await prisma.invigilator.updateMany({
        where: { departmentId: departmentId, type: 'อาจารย์' },
        data: { quota: baseQuota, assignedQuota: 0 }
      });

      console.log(`✅ อัปเดตโควต้าให้อาจารย์ ${updatedInvigilators.count} คน`);

      // 4. แจก quota ที่เหลือให้บุคลากรทั่วไป
      if (remainingQuota > 0) {
        console.log('🎯 กำลังแจกจ่ายโควต้าที่เหลือให้บุคลากรทั่วไป...');

        const generalStaff = await prisma.invigilator.findMany({
          where: { departmentId: departmentId, type: 'บุคลากรทั่วไป' },
          take: remainingQuota
        });

        for (const staff of generalStaff) {
          await prisma.invigilator.update({
            where: { id: staff.id },
            data: { quota: (staff.quota || 0) + 1 }
          });
          console.log(`✅ ให้โควต้าเพิ่ม 1 กับบุคลากร ID: ${staff.id}`);
          remainingQuota--;
          if (remainingQuota === 0) break;
        }

        if (remainingQuota > 0) {
          console.log(`⚠️ โควต้าที่ยังเหลืออยู่หลังจากแจก: ${remainingQuota}`);
        }
      }

      // อัพเดต department quota
      await prisma.department.update({
        where: { id: departmentId },
        data: { quota: totalSchedulesForDept }
      });

      console.log(`🏛️ อัปเดตโควต้ารวมของภาควิชาเป็น ${totalSchedulesForDept}`);
    }

    console.log('🎉 กระบวนการจัดสรรโควต้าเสร็จสมบูรณ์');
    return NextResponse.json({ message: 'Updated quotas successfully' });
  } catch (error) {
    console.error('❌ Error updating quotas:', error);
    return NextResponse.json({ error: 'Failed to update quotas' }, { status: 500 });
  }
}
