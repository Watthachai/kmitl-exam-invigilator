import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // สร้าง query object สำหรับ Prisma
    const whereClause: {
      OR?: { recipientName?: { contains: string; mode: 'insensitive' }; recipientEmail?: { contains: string; mode: 'insensitive' } }[];
      status?: string;
      type?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};
    
    // กรองตามการค้นหา
    if (search) {
      whereClause.OR = [
        { recipientName: { contains: search, mode: 'insensitive' } },
        { recipientEmail: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    // กรองตามสถานะ
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    // กรองตามประเภท
    if (type && type !== 'all') {
      whereClause.type = type;
    }
    
    // กรองตามช่วงวันที่
    if (startDate || endDate) {
      whereClause.createdAt = {};
      
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      
      if (endDate) {
        // ตั้งเวลาเป็น 23:59:59 ของวันที่สิ้นสุด
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = endDateTime;
      }
    }
    
    // ดึงข้อมูล email logs
    const emailLogs = await prisma.emailLog.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        sentBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      take: 500, // จำกัดไม่เกิน 500 รายการ
    });
    
    return NextResponse.json(emailLogs);
  } catch (error) {
    console.error('Error fetching email logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email logs' },
      { status: 500 }
    );
  }
}