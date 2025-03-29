import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { sendExamScheduleNotification, sendQuotaNotification } from '@/app/lib/email-service';
import { logActivity } from '@/app/lib/activity-logger';

export async function POST(request: Request) {
  try {
    // ไม่ใช้ session อีกต่อไป เพื่อหลีกเลี่ยงปัญหา JWT_SESSION_ERROR
    const data = await request.json();
    const { type, filters } = data;
    
    if (!type || (type !== 'schedule' && type !== 'quota')) {
      return NextResponse.json(
        { error: 'ประเภทการแจ้งเตือนไม่ถูกต้อง' },
        { status: 400 }
      );
    }
    
    // สร้าง whereClause สำหรับค้นหาผู้ใช้
    const whereClause: {
      invigilator: {
        isNot: null;
        departmentId?: string;
        type?: string;
      };
      email?: {
        endsWith?: string;
        not?: null;
      };
    } = {
      invigilator: { 
        isNot: null
      }
    };
    
    // เพิ่มเงื่อนไขตามที่ระบุใน filters
    if (filters?.departmentId) {
      whereClause.invigilator.departmentId = filters.departmentId;
    }
    
    if (filters?.type) {
      whereClause.invigilator.type = filters.type;
    }
    
    // กรองตามประเภทอีเมล
    if (filters?.emailFilter) {
      if (filters.emailFilter === 'kmitl') {
        whereClause.email = {
          endsWith: '@kmitl.ac.th',
          not: null
        };
      } else if (filters.emailFilter === 'non-empty') {
        whereClause.email = {
          not: null
        };
      }
      // 'all' ไม่ต้องมีเงื่อนไขเพิ่มเติม
    }
    
    // ดึงข้อมูลผู้ใช้ตามเงื่อนไข
    const users = await prisma.user.findMany({
      where: whereClause,
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
            },
            department: true
          }
        }
      }
    });
    
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้ที่ตรงตามเงื่อนไข' },
        { status: 404 }
      );
    }
    
    // เริ่มส่งอีเมล
    const results = {
      total: users.length,
      success: 0,
      failed: 0,
      failures: []
    };
    
    for (const user of users) {
      try {
        if (!user.email) {
          results.failed++;
          results.failures.push(`${user.name || 'ผู้ใช้ไม่ระบุชื่อ'}: ไม่มีอีเมล`);
          continue;
        }
        
        if (type === 'schedule') {
          // ส่งเฉพาะผู้ที่มีตารางสอบ
          if (!user.invigilator || user.invigilator.schedules.length === 0) {
            results.failed++;
            results.failures.push(`${user.name || user.email}: ไม่มีตารางสอบ`);
            continue;
          }
          
          // ส่งอีเมลแจ้งเตือนตารางสอบ
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
          results.success++;
        } 
        else if (type === 'quota') {
          // ส่งเฉพาะผู้ที่มีข้อมูล invigilator
          if (!user.invigilator) {
            results.failed++;
            results.failures.push(`${user.name || user.email}: ไม่มีข้อมูลผู้คุมสอบ`);
            continue;
          }
          
          // ส่งอีเมลแจ้งเตือนโควต้า
          await sendQuotaNotification(
            user.email,
            user.name || 'ผู้คุมสอบ',
            {
              quotaUsed: user.invigilator.assignedQuota,
              quotaTotal: user.invigilator.quota,
              remainingQuota: user.invigilator.quota - user.invigilator.assignedQuota
            }
          );
          results.success++;
        }
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error);
        results.failed++;
        results.failures.push(`${user.name || user.email}: ${error.message}`);
      }
    }
    
    // บันทึกกิจกรรม
    await logActivity(
      'BULK_EMAIL_NOTIFICATION',
      `ส่งอีเมลแบบ Bulk (${type}) ทั้งหมด ${results.total} รายการ สำเร็จ ${results.success} รายการ`,
      prisma,
      'system'
    );
    
    return NextResponse.json({
      success: true,
      message: `ส่งอีเมล ${type} แบบ Bulk สำเร็จ ${results.success} จาก ${results.total} รายการ`,
      results
    });
    
  } catch (error) {
    console.error('Error sending bulk email notifications:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งอีเมลแจ้งเตือนแบบ Bulk' },
      { status: 500 }
    );
  }
}