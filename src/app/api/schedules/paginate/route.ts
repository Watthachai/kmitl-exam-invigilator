import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get pagination params
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const skip = (page - 1) * pageSize;
    
    // Get filter params
    const examType = searchParams.get('examType') || undefined;
    const academicYear = searchParams.get('academicYear') 
      ? parseInt(searchParams.get('academicYear')!) 
      : undefined;
    const semester = searchParams.get('semester') 
      ? parseInt(searchParams.get('semester')!) 
      : undefined;
    const department = searchParams.get('department') || undefined;
    const date = searchParams.get('date') || undefined;
    const timeSlot = searchParams.get('timeSlot') || undefined;
    const searchQuery = searchParams.get('searchQuery') || undefined;
    
    // Build where clause for filtering
    const where: {
      examType?: string;
      academicYear?: number;
      semester?: number;
      date?: Date;
      scheduleDateOption?: string;
      subjectGroup?: {
        subject?: {
          department?: {
            name?: string;
          };
          code?: {
            contains: string;
            mode: 'insensitive';
          };
          name?: {
            contains: string;
            mode: 'insensitive';
          };
        };
        professor?: {
          name?: {
            contains: string;
            mode: 'insensitive';
          };
        };
        additionalProfessors?: {
          some: {
            professor: {
              name: {
                contains: string;
                mode: 'insensitive';
              };
            };
          };
        };
      };
      room?: {
        building?: {
          contains: string;
          mode: 'insensitive';
        };
        roomNumber?: {
          contains: string;
          mode: 'insensitive';
        };
      };
      invigilator?: {
        name?: {
          contains: string;
          mode: 'insensitive';
        };
      };
      OR?: Array<Record<string, unknown>>;
    } = {};
    
    // Filter by exam type if provided
    if (examType) {
      where.examType = examType;
    }
    
    // Filter by academic year if provided
    if (academicYear) {
      where.academicYear = academicYear;
    }
    
    // Filter by semester if provided
    if (semester) {
      where.semester = semester;
    }
    
    // Filter by date if provided
    if (date) {
      where.date = new Date(date);
    }
    
    // Filter by time slot if provided
    if (timeSlot) {
      where.scheduleDateOption = timeSlot;
    }
    
    // Filter by department if provided
    if (department) {
      where.subjectGroup = {
        subject: {
          department: {
            name: department
          }
        }
      };
    }
    
    // Search functionality - improved to support Thai language and search for professors
    if (searchQuery) {
      // แปลงเป็น Array เพื่อใช้ใน OR condition
      const orConditions = [];
      
      // Search in subject code
      orConditions.push({
        subjectGroup: {
          subject: {
            code: {
              contains: searchQuery,
              mode: 'insensitive'
            }
          }
        }
      });
      
      // Search in subject name
      orConditions.push({
        subjectGroup: {
          subject: {
            name: {
              contains: searchQuery,
              mode: 'insensitive'
            }
          }
        }
      });
      
      // Search in professor name
      orConditions.push({
        subjectGroup: {
          professor: {
            name: {
              contains: searchQuery,
              mode: 'insensitive'
            }
          }
        }
      });
      
      // Search in additional professors
      orConditions.push({
        subjectGroup: {
          additionalProfessors: {
            some: {
              professor: {
                name: {
                  contains: searchQuery,
                  mode: 'insensitive'
                }
              }
            }
          }
        }
      });
      
      // Search in room building
      orConditions.push({
        room: {
          building: {
            contains: searchQuery,
            mode: 'insensitive'
          }
        }
      });
      
      // Search in room number
      orConditions.push({
        room: {
          roomNumber: {
            contains: searchQuery,
            mode: 'insensitive'
          }
        }
      });
      
      // Search in invigilator name
      orConditions.push({
        invigilator: {
          name: {
            contains: searchQuery,
            mode: 'insensitive'
          }
        }
      });
      
      // เพิ่มเงื่อนไข OR ทั้งหมดลงใน where
      where.OR = orConditions;
    }
    
    // Get total count for pagination
    const totalItems = await prisma.schedule.count({
      where
    });
    
    const totalPages = Math.ceil(totalItems / pageSize);
    
    // Get schedules with all related data
    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        subjectGroup: {
          include: {
            subject: {
              include: {
                department: true
              }
            },
            professor: true,
            additionalProfessors: {
              include: {
                professor: true
              }
            }
          }
        },
        room: true,
        invigilator: true
      },
      orderBy: [
        { academicYear: 'desc' },
        { semester: 'desc' },
        { date: 'asc' },
        { startTime: 'asc' }
      ],
      skip,
      take: pageSize
    });
    
    return NextResponse.json({
      items: schedules,
      page,
      pageSize,
      totalItems,
      totalPages
    });
    
  } catch (error) {
    console.error('Error in schedules/paginate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}