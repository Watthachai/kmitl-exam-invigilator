import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    // ใช้ select แทน include เพื่อเลือกเฉพาะฟิลด์ที่จำเป็น
    const schedules = await prisma.schedule.findMany({
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        scheduleDateOption: true,
        examType: true,
        academicYear: true,
        semester: true,
        notes: true,
        room: {
          select: {
            id: true,
            building: true,
            roomNumber: true,
            capacity: true
          }
        },
        subjectGroup: {
          select: {
            id: true,
            groupNumber: true,
            year: true,
            studentCount: true,
            subject: {
              select: {
                code: true,
                name: true,
                department: {
                  select: {
                    name: true
                  }
                }
              }
            },
            professor: {
              select: {
                id: true,
                name: true
              }
            },
            additionalProfessors: {
              select: {
                professor: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        invigilator: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      },
      where: {
        // เพิ่มเงื่อนไขถ้าต้องการ
      },
      orderBy: [
        { date: 'asc' },
        { scheduleDateOption: 'asc' }
      ]
    });
    
    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

// ส่วน POST function ยังคงเหมือนเดิม...
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scheduleDateOption, ...otherData } = body;

    // Validate required fields
    if (!body?.subjectGroupId || !body?.date || !body?.startTime || 
        !body?.endTime || !body?.roomId || !body?.invigilatorId ||
        !body?.examType || !body?.academicYear || !body?.semester) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Begin transaction
    return await prisma.$transaction(async (prismaClient) => {
      if (body.updateQuota) {
        // Update invigilator quota
        await prismaClient.invigilator.update({
          where: { id: body.invigilatorId },
          data: {
            assignedQuota: {
              increment: 1
            }
          }
        });
      }

      const schedule = await prismaClient.schedule.create({
        data: {
          ...otherData,
          scheduleDateOption: scheduleDateOption, // ตรวจสอบว่ามีการส่งค่านี้มาด้วย
        },
        include: {
          subjectGroup: {
            include: {
              subject: true,
              professor: true
            }
          },
          room: true,
          invigilator: true
        }
      });

      return NextResponse.json(schedule);
    });
  } catch (error) {
    console.error('Schedule creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
}