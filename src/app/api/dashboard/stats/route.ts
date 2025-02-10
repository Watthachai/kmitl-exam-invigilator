import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    // Get all stats in parallel
    const [departments, invigilators, schedules, rooms] = await Promise.all([
      // Get department count
      prisma.department.count(),

      // Get invigilator count
      prisma.invigilator.count(),

      // Get upcoming exams for next 7 days
      prisma.schedule.count({
        where: {
          date: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Get rooms with schedules
      prisma.room.findMany({
        include: {
          _count: {
            select: { schedules: true }
          }
        }
      })
    ]);

    // Calculate room utilization
    const roomsWithSchedules = rooms.filter(room => room._count.schedules > 0);
    const roomUtilization = Math.round((roomsWithSchedules.length / rooms.length) * 100);

    return NextResponse.json({
      departmentCount: departments,
      invigilatorCount: invigilators,
      upcomingExams: schedules,
      roomUtilization: roomUtilization || 0
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch dashboard stats'
    }, { 
      status: 500 
    });
  }
}