import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    // Get all the stats in parallel
    const [
      departments,
      invigilatorStats,
      upcomingExams,
      rooms
    ] = await Promise.all([
      // Get department count
      prisma.department.count(),

      // Get invigilator stats
      prisma.invigilator.aggregate({
        _count: { id: true },
        _avg: { assignedQuota: true }
      }),

      // Get upcoming exams for next 7 days
      prisma.schedule.findMany({
        where: {
          date: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          subjectGroup: {
            include: {
              subject: true
            }
          },
          room: true,
          invigilator: true
        }
      }),

      // Get room utilization
      prisma.room.findMany({
        include: {
          schedules: true
        }
      })
    ]);

    // Calculate room utilization
    const totalRooms = rooms.length;
    const roomsInUse = rooms.filter(room => room.schedules.length > 0).length;
    const roomUtilization = totalRooms ? Math.round((roomsInUse / totalRooms) * 100) : 0;

    // Calculate exam trends
    const examTrends = upcomingExams.reduce((acc, exam) => {
      const date = exam.date.toISOString().split('T')[0];
      acc[date] = acc[date] || { morning: 0, afternoon: 0 };
      if (exam.scheduleDateOption === 'ช่วงเช้า') {
        acc[date].morning++;
      } else {
        acc[date].afternoon++;
      }
      return acc;
    }, {} as Record<string, { morning: number; afternoon: number }>);

    return NextResponse.json({
      stats: {
        departmentCount: departments,
        invigilatorCount: invigilatorStats._count.id,
        averageQuota: Math.round(invigilatorStats._avg.assignedQuota || 0),
        upcomingExamCount: upcomingExams.length,
        roomUtilization
      },
      examTrends: Object.entries(examTrends).map(([date, counts]) => ({
        date,
        morningExams: counts.morning,
        afternoonExams: counts.afternoon
      })),
      recentExams: upcomingExams.slice(0, 5).map(exam => ({
        id: exam.id,
        subject: exam.subjectGroup.subject.name,
        date: exam.date,
        room: `${exam.room.building}-${exam.room.roomNumber}`,
        invigilator: exam.invigilator?.name || 'Not assigned'
      }))
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500 
    });
  }
}