import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { logActivity } from '@/app/lib/activity-logger';
import { sendExamScheduleNotification, sendQuotaNotification } from '@/app/lib/email-service';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { type, email } = data;
    
    // ตรวจสอบการส่งข้อมูลที่จำเป็น
    if (!email) {
      return NextResponse.json(
        { error: 'กรุณาระบุอีเมล' },
        { status: 400 }
      );
    }
    
    if (!type || (type !== 'schedule' && type !== 'quota')) {
      return NextResponse.json(
        { error: 'ประเภทการแจ้งเตือนไม่ถูกต้อง' },
        { status: 400 }
      );
    }
    
    // ค้นหาผู้ใช้จากอีเมล
    const user = await prisma.user.findFirst({
      where: { 
        email: email 
      },
      include: {
        invigilator: {
          include: {
            schedules: {
              include: {
                room: true,
                subjectGroup: {
                  include: {
                    subject: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลผู้ใช้' },
        { status: 404 }
      );
    }
    
    if (!user.email) {
      return NextResponse.json(
        { error: 'ผู้ใช้ไม่มีอีเมล' },
        { status: 400 }
      );
    }
    
    // ส่งอีเมลตามประเภท
    if (type === 'schedule') {
      // ตรวจสอบว่ามีตารางสอบหรือไม่
      if (!user.invigilator || !user.invigilator.schedules || user.invigilator.schedules.length === 0) {
        return NextResponse.json(
          { error: 'ไม่มีตารางสอบสำหรับผู้ใช้นี้' },
          { status: 400 }
        );
      }
      
      await sendExamScheduleNotification(
        user.email,
        user.name || 'ผู้คุมสอบ',
        user.invigilator.schedules.map(schedule => ({
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          subjectName: schedule.subjectGroup.subject.name,
          subjectCode: schedule.subjectGroup.subject.code,
          roomBuilding: schedule.room.building,
          roomNumber: schedule.room.roomNumber
        }))
      );
    } 
    else if (type === 'quota') {
      // ตรวจสอบว่ามี invigilator หรือไม่
      if (!user.invigilator) {
        return NextResponse.json(
          { error: 'ไม่มีข้อมูลผู้คุมสอบ' },
          { status: 400 }
        );
      }
      
      await sendQuotaNotification(
        user.email,
        user.name || 'ผู้คุมสอบ',
        {
          quotaUsed: user.invigilator.assignedQuota || 0,
          quotaTotal: user.invigilator.quota || 0,
          remainingQuota: (user.invigilator.quota || 0) - (user.invigilator.assignedQuota || 0)
        }
      );
    }
    
    // บันทึกกิจกรรม - เปลี่ยนการส่ง userId เป็น null เพื่อแก้ไขปัญหา foreign key constraint
    await logActivity(
      'EMAIL_NOTIFICATION',
      `ส่งอีเมลแจ้งเตือน ${type} ให้กับ ${user.name || user.email}`,
      prisma,
      null // เปลี่ยนจาก 'system' เป็น null
    );
    
    return NextResponse.json({
      success: true,
      message: `ส่งอีเมลไปยัง ${user.email} เรียบร้อยแล้ว`
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งอีเมล' },
      { status: 500 }
    );
  }
}