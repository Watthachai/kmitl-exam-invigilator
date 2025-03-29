import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { logActivity } from './activity-logger';
import prisma from './prisma';

// สร้าง transporter สำหรับส่งอีเมล
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: Boolean(process.env.EMAIL_SECURE === 'true'),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// อีเมลฟังก์ชันสำหรับแจ้งเตือนตารางสอบ
export async function sendExamScheduleNotification(
  to: string,
  userName: string,
  schedules: {
    date: Date;
    startTime: Date;
    endTime: Date;
    subjectName: string;
    subjectCode: string;
    roomBuilding: string;
    roomNumber: string;
  }[],
  userId?: string
) {
  // สร้าง HTML สำหรับแสดงตารางคุมสอบ
  const schedulesHtml = schedules.map(schedule => `
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;">${format(new Date(schedule.date), 'EEEE d MMMM yyyy', { locale: th })}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${format(new Date(schedule.startTime), 'HH:mm', { locale: th })} - ${format(new Date(schedule.endTime), 'HH:mm', { locale: th })}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${schedule.subjectCode} - ${schedule.subjectName}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${schedule.roomBuilding} ${schedule.roomNumber}</td>
    </tr>
  `).join('');

  // ตัวอย่าง HTML template email
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">แจ้งเตือนตารางคุมสอบ</h2>
      <p>เรียน คุณ${userName},</p>
      <p>ทางคณะวิศวกรรมศาสตร์ สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง ขอแจ้งตารางคุมสอบของท่าน ดังนี้</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 10px; border: 1px solid #ddd;">วันที่</th>
            <th style="padding: 10px; border: 1px solid #ddd;">เวลา</th>
            <th style="padding: 10px; border: 1px solid #ddd;">วิชา</th>
            <th style="padding: 10px; border: 1px solid #ddd;">ห้อง</th>
          </tr>
        </thead>
        <tbody>
          ${schedulesHtml}
        </tbody>
      </table>
      
      <p style="margin-top: 20px;">สามารถตรวจสอบข้อมูลเพิ่มเติมได้ที่ <a href="${process.env.NEXTAUTH_URL}/dashboard/schedule">ระบบบริหารจัดการการคุมสอบ</a></p>
      
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        คณะวิศวกรรมศาสตร์ สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง
      </p>
    </div>
  `;

  try {
    // ส่งอีเมล
    const info = await transporter.sendMail({
      from: `"ระบบคุมสอบ KMITL" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject: 'แจ้งเตือนตารางคุมสอบ - คณะวิศวกรรมศาสตร์ KMITL',
      html,
    });

    // บันทึกการส่งอีเมลลงฐานข้อมูล
    await prisma.emailLog.create({
      data: {
        type: 'schedule',
        recipientEmail: to,
        recipientName: userName,
        status: 'success',
        sentById: userId || null
      }
    });

    // บันทึกกิจกรรม
    await logActivity(
      'EMAIL_NOTIFICATION',
      `ส่งอีเมลแจ้งเตือนตารางสอบให้กับ ${userName} <${to}> สำเร็จ`,
      prisma
    );

    return info;
  } catch (error) {
    // บันทึกความล้มเหลวในการส่งอีเมล
    await prisma.emailLog.create({
      data: {
        type: 'schedule',
        recipientEmail: to,
        recipientName: userName,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        sentById: userId || null
      }
    });

    // บันทึกความล้มเหลว
    await logActivity(
      'EMAIL_NOTIFICATION',
      `ส่งอีเมลแจ้งเตือนตารางสอบให้กับ ${userName} <${to}> ล้มเหลว: ${error.message}`,
      prisma
    );

    throw error;
  }
}

// อีเมลฟังก์ชันสำหรับแจ้งเตือนโควต้าคุมสอบ
export async function sendQuotaNotification(
  to: string,
  userName: string,
  quotaInfo: {
    quotaUsed: number;
    quotaTotal: number;
    remainingQuota: number;
  },
  userId?: string
) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">แจ้งเตือนโควต้าคุมสอบ</h2>
      <p>เรียน คุณ${userName},</p>
      <p>ทางคณะวิศวกรรมศาสตร์ สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง ขอแจ้งข้อมูลโควต้าคุมสอบของท่าน ดังนี้</p>
      
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-top: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span>โควต้าทั้งหมด:</span>
          <span><strong>${quotaInfo.quotaTotal}</strong></span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span>ใช้ไปแล้ว:</span>
          <span><strong>${quotaInfo.quotaUsed}</strong></span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span>คงเหลือ:</span>
          <span><strong>${quotaInfo.remainingQuota}</strong></span>
        </div>
      </div>
      
      <p style="margin-top: 20px;">กรุณาลงทะเบียนคุมสอบให้ครบตามโควต้าที่กำหนด สามารถเลือกได้ที่ <a href="${process.env.NEXTAUTH_URL}/dashboard">ระบบบริหารจัดการการคุมสอบ</a></p>
      
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        คณะวิศวกรรมศาสตร์ สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง
      </p>
    </div>
  `;

  try {
    // ส่งอีเมล
    const info = await transporter.sendMail({
      from: `"ระบบคุมสอบ KMITL" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject: 'แจ้งเตือนโควต้าคุมสอบ - คณะวิศวกรรมศาสตร์ KMITL',
      html,
    });

    // บันทึกการส่งอีเมลลงฐานข้อมูล
    await prisma.emailLog.create({
      data: {
        type: 'quota',
        recipientEmail: to,
        recipientName: userName,
        status: 'success',
        sentById: userId || null
      }
    });

    // บันทึกกิจกรรม
    await logActivity(
      'EMAIL_NOTIFICATION',
      `ส่งอีเมลแจ้งเตือนโควต้าให้กับ ${userName} <${to}> สำเร็จ`,
      prisma
    );

    return info;
  } catch (error) {
    // บันทึกความล้มเหลวในการส่งอีเมล
    await prisma.emailLog.create({
      data: {
        type: 'quota',
        recipientEmail: to,
        recipientName: userName,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        sentById: userId || null
      }
    });

    // บันทึกความล้มเหลว
    await logActivity(
      'EMAIL_NOTIFICATION',
      `ส่งอีเมลแจ้งเตือนโควต้าให้กับ ${userName} <${to}> ล้มเหลว: ${error.message}`,
      prisma
    );

    throw error;
  }
}