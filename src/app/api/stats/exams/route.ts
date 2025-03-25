import { prisma } from '@/app/lib/prisma';
import { NextResponse } from 'next/server';

interface DailyStats {
  date: string;
  morningCount: number;
  afternoonCount: number;
  roomCount: Set<string>;
  subjectCount: Set<string>;
  invigilatorCount: number;
  departmentCount: Set<string>;
}

interface StatsResponse {
  date: string;
  morningCount: number;
  afternoonCount: number;
  total: number;
  roomCount: number;
  subjectCount: number;
  departmentCount: number;
  invigilatorCount: number;
}

export async function GET() {
  try {
    // Get current date and date 30 days ago
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const schedules = await prisma.schedule.findMany({
      where: {
        date: {
          gte: thirtyDaysAgo,
          lte: today,
        },
      },
      include: {
        room: true,
        subjectGroup: {
          include: {
            subject: {
              include: {
                department: true
              }
            }
          }
        },
        invigilator: true
      },
      orderBy: {
        date: 'asc',
      },
    });

    const statsMap = schedules.reduce<Record<string, DailyStats>>((acc, schedule) => {
      if (!schedule.date) return acc;

      const dateKey = schedule.date.toISOString().split('T')[0];
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          morningCount: 0,
          afternoonCount: 0,
          roomCount: new Set<string>(),
          subjectCount: new Set<string>(),
          invigilatorCount: 0,
          departmentCount: new Set<string>()
        };
      }

      // Count schedules based on scheduleDateOption
      if (schedule.scheduleDateOption === 'MORNING') {
        acc[dateKey].morningCount++;
      } else if (schedule.scheduleDateOption === 'AFTERNOON') {
        acc[dateKey].afternoonCount++;
      }

      // Track unique rooms
      if (schedule.room?.id) {
        acc[dateKey].roomCount.add(schedule.room.id);
      }
      
      // Track unique subjects and departments
      if (schedule.subjectGroup?.subject?.id) {
        acc[dateKey].subjectCount.add(schedule.subjectGroup.subject.id);
        
        if (schedule.subjectGroup.subject.department?.id) {
          acc[dateKey].departmentCount.add(schedule.subjectGroup.subject.department.id);
        }
      }

      // Count invigilators
      if (schedule.invigilator) {
        acc[dateKey].invigilatorCount++;
      }

      return acc;
    }, {});

    const stats: StatsResponse[] = Object.values(statsMap).map(stat => ({
      date: stat.date,
      morningCount: stat.morningCount,
      afternoonCount: stat.afternoonCount,
      total: stat.morningCount + stat.afternoonCount,
      roomCount: stat.roomCount.size,
      subjectCount: stat.subjectCount.size,
      departmentCount: stat.departmentCount.size,
      invigilatorCount: stat.invigilatorCount
    }));

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'max-age=0, s-maxage=60, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Error fetching schedule stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule statistics' }, 
      { status: 500 }
    );
  }
}