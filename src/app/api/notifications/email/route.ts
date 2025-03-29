import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/app/lib/prisma';
import { sendExamScheduleNotification, sendQuotaNotification } from '@/app/lib/email-service';
import { logActivity } from '@/app/lib/activity-logger';

// แก้ไขปัญหา authOptions is not defined
export async function POST(request: Request) {
  try {
    // 1. แก้ไขการเรียกใช้ getServerSession
    // วิธีที่ 1: ใช้ getServerAuthSession แทน (ถ้ามี)
    // const session = await getServerAuthSession();
    
    // วิธีที่ 2: ใช้โดยไม่ต้องส่ง authOptions (ถ้าคุณใช้ app directory)
    const session = await getServerSession();
    
    // วิธีที่ 3: นำเข้า authOptions จากไฟล์ที่เก็บ
    // import { authOptions } from '@/app/api/auth/[...nextauth]/route';
    // const session = await getServerSession(authOptions);
    
    // ตรวจสอบ session ในรูปแบบที่ปลอดภัยยิ่งขึ้น
    if (!session || !session.user) {
      console.log('No session or user found');
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' },
        { status: 401 }
      );
    }

    // ดึงข้อมูลผู้ใช้จากฐานข้อมูลเพื่อตรวจสอบบทบาท
    const user = await prisma.user.findUnique({
      where: { 
        id: session.user.id,
        // หรือ email ถ้ามี
        // email: session.user.email 
      }
    });

    if (!user || user.role !== 'admin') {
      console.log('User is not admin');
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์ในการเข้าถึงข้อมูล' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { type, filters } = data;
    
    // กรองผู้ใช้ตามเงื่อนไข
    const whereClause: {
      invigilator: { isNot: null; departmentId?: string; type?: string };
      email: { endsWith: string; not: null };
    } = {
      invigilator: { 
        isNot: null
      },
      // เพิ่มเงื่อนไขตรวจสอบอีเมล
      email: {
        endsWith: "@kmitl.ac.th",  // กรองเฉพาะอีเมล KMITL
        not: null                  // ต้องมีค่าอีเมล
      }
    };
    
    // เพิ่มเงื่อนไขการกรอง
    if (filters?.departmentId) {
      whereClause.invigilator.departmentId = filters.departmentId;
    }
    
    if (filters?.type) {
      whereClause.invigilator.type = filters.type;
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
      failures: [] as string[]
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
        } else if (type === 'quota') {
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
        results.failures.push(`${user.name || user.email}: ${(error as Error).message}`);
      }
    }
    
    // บันทึกกิจกรรม
    await logActivity(
      'BULK_EMAIL_NOTIFICATION',
      `ส่งอีเมลแบบ Bulk (${type}) ทั้งหมด ${results.total} รายการ สำเร็จ ${results.success} รายการ`,
      prisma,
      session.user.id
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