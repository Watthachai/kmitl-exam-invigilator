import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { ExamData } from '@/app/types';
import { Prisma } from '@prisma/client';
import { departments } from '@/app/lib/data/departments';

interface ImportRequest {
  data: ExamData[];
  scheduleOption: 'ช่วงเช้า' | 'ช่วงบ่าย';
  examDate: string;
}

// Keep only the functions we use
export async function GET() {
  const departments = await prisma.department.findMany();
  return NextResponse.json(departments);
}

// Helper function to get department name
// Update getDepartmentNameFromCode function to handle multiple codes
async function getDepartmentNameFromCode(
  code: string,
  prismaClient: Prisma.TransactionClient
): Promise<string> {
  const department = await prismaClient.department.findFirst({
    where: {
      OR: [
        { code },
        {
          metadata: {
            path: ['codes'],
            array_contains: [code]
          }
        }
      ]
    }
  });

  return department?.name || 'ไม่มีภาควิชา';
}

// Update findOrCreateProfessors with better department handling
async function findOrCreateProfessors(
  names: string[], 
  department: { id: string, name: string },
  prismaClient: Prisma.TransactionClient
) {
  const professors = [];

  // Get existing professors first
  const existingProfs = await prismaClient.professor.findMany({
    where: { name: { in: names.map(n => n.trim()) } },
    include: { department: true }
  });

  for (const name of names) {
    const trimmedName = name.trim();
    const existingProf = existingProfs.find(p => p.name === trimmedName);

    // If professor exists but in different department, don't update department
    const professor = await prismaClient.professor.upsert({
      where: { name: trimmedName },
      create: {
        name: trimmedName,
        departmentId: department.id,
      },
      update: existingProf?.departmentId ? {} : { departmentId: department.id }
    });

    // ตรวจสอบ invigilator ที่มีอยู่แล้ว
    const existingInvigilator = await prismaClient.invigilator.findFirst({
      where: {
        OR: [
          { professorId: professor.id },
          { 
            AND: {
              type: 'อาจารย์',
              name: professor.name
            }
          }
        ]
      }
    });

    if (!existingInvigilator) {
      // สร้าง invigilator ใหม่เฉพาะเมื่อยังไม่มี
      await prismaClient.invigilator.create({
        data: {
          name: professor.name,
          type: 'อาจารย์',
          department: { connect: { id: department.id } },
          professor: { connect: { id: professor.id } },
          quota: 4,
          assignedQuota: 0
        }
      });
    } else if (existingInvigilator.professorId !== professor.id) {
      // อัพเดทการเชื่อมโยงกับ professor ถ้าจำเป็น
      await prismaClient.invigilator.update({
        where: { id: existingInvigilator.id },
        data: {
          professor: { connect: { id: professor.id } }
        }
      });
    }
    
    professors.push(professor);
  }
  
  return professors;
}

// Add missing upsertSubject function
async function upsertSubject(
  code: string, 
  name: string, 
  prismaClient: Prisma.TransactionClient
) {
  const deptName = await getDepartmentNameFromCode(code, prismaClient);
  const department = await prismaClient.department.findFirstOrThrow({
    where: { name: deptName }
  });

  const subject = await prismaClient.subject.upsert({
    where: { code },
    create: {
      code,
      name,
      departmentId: department.id
    },
    update: {
      name,
      departmentId: department.id
    }
  });

  return { subject, department };
}

// Update the processExamData function
async function processExamData(
  examData: ExamData[], 
  scheduleOption: string, 
  examDate: Date,
  prismaClient: Prisma.TransactionClient
) {
  if (!Array.isArray(examData)) {
    throw new Error('Invalid exam data: expected array');
  }

  const processedSchedules = new Set();

  for (const row of examData) {
    if (!validateExamData(row)) {
      throw new Error('Invalid exam data format');
    }
    const [subjectCode, ...subjectNameParts] = row.วิชา.trim().split(' ');
    const trimmedSubjectCode = subjectCode.trim();
    
    // Get subject and department first
    const { subject, department } = await upsertSubject(
      trimmedSubjectCode, 
      subjectNameParts.join(' '),
      prismaClient
    );

    // Pass department to findOrCreateProfessors
    const professorNames = row.ผู้สอน.split(',');
    const professors = await findOrCreateProfessors(
      professorNames, 
      department, 
      prismaClient
    );

    const room = await prismaClient.room.upsert({
      where: {
        building_roomNumber: {
          building: row.อาคาร.trim(),
          roomNumber: row.ห้อง.trim()
        }
      },
      create: {
        building: row.อาคาร.trim(),
        roomNumber: row.ห้อง.trim()
      },
      update: {}
    });

    const subjectGroup = await prismaClient.subjectGroup.upsert({
      where: {
        subjectId_groupNumber_year: {
          subjectId: subject.id,
          groupNumber: row.กลุ่ม.trim(),
          year: parseInt(row['ชั้นปี'].trim())
        }
      },
      create: {
        groupNumber: row.กลุ่ม.trim(),
        year: parseInt(row['ชั้นปี'].trim()),
        studentCount: parseInt(row['นศ.'].trim()),
        subjectId: subject.id,
        professorId: professors[0].id
      },
      update: {
        studentCount: parseInt(row['นศ.'].trim()),
        professorId: professors[0].id
      }
    });

    const [startTime, endTime] = row.เวลา.split(' - ');
    const scheduleKey = `${examDate}_${scheduleOption}_${row.เวลา}_${row.อาคาร}_${row.ห้อง}_${subjectGroup.id}`;

    if (!processedSchedules.has(scheduleKey)) {
      try {
        // Basic schedule data without invigilator
        const scheduleData = {
          date: examDate,
          scheduleDateOption: scheduleOption.toUpperCase(),
          startTime: new Date(`1970-01-01T${startTime}`),
          endTime: new Date(`1970-01-01T${endTime}`),
          roomId: room.id,
          subjectGroupId: subjectGroup.id
        };

        console.log('Creating schedule:', scheduleData);

        await prismaClient.schedule.upsert({
          where: {
            date_scheduleDateOption_startTime_endTime_roomId_subjectGroupId: {
              date: examDate,
              scheduleDateOption: scheduleOption.toUpperCase(),
              startTime: new Date(`1970-01-01T${startTime}`),
              endTime: new Date(`1970-01-01T${endTime}`),
              roomId: room.id,
              subjectGroupId: subjectGroup.id
            }
          },
          create: scheduleData,
          update: {} // Empty update since invigilator will be assigned later
        });

        processedSchedules.add(scheduleKey);
        
      } catch (error) {
        console.error('Schedule creation failed:', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          scheduleKey 
        });
        throw error;
      }
    }
  }
}

// Add validation helper
function validateExamData(data: ExamData): boolean {
  if (!data || typeof data !== 'object') return false;
  
  return Boolean(
    data.วิชา?.trim() &&
    data.กลุ่ม?.trim() &&
    data['ชั้นปี']?.toString()?.trim() &&
    data['นศ.']?.toString()?.trim() &&
    data.เวลา?.trim() &&
    data['ผู้สอน']?.trim() &&
    data.อาคาร?.trim() &&
    data.ห้อง?.trim()
  );
}

// Update error validation helper with type guard
function validateTransactionError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  
  if (typeof error === 'string') {
    return new Error(error);
  }
  
  return new Error('An unexpected error occurred during import');
}

// Update seedDepartments to use prismaClient
// Update seedDepartments to handle multiple codes
async function seedDepartments(prismaClient: Prisma.TransactionClient) {
  try {
    console.log('Starting department seeding...');
    
    for (const dept of departments) {
      await prismaClient.department.upsert({
        where: { code: dept.code },
        create: {
          name: dept.name,
          code: dept.code,
          // Store additional codes as JSON in a metadata field
          metadata: { codes: dept.codes }
        },
        update: { 
          name: dept.name,
          metadata: { codes: dept.codes }
        }
      });
    }

    console.log(`Department seeding completed. Total: ${departments.length}`);
    return true;

  } catch (error) {
    console.error('Error seeding departments:', error);
    throw validateTransactionError(error);
  }
}

// Fix POST handler
// Update POST handler with better activity logging
export async function POST(request: Request) {
  try {
    const body = await request.json() as ImportRequest;
    
    // Start new transaction
    const result = await prisma.$transaction(async (tx) => {
      // Log start
      await tx.activity.create({
        data: {
          type: 'IMPORT',
          description: `Starting import of ${body.data.length} exam schedules`
        }
      });

      // Seed departments first
      await seedDepartments(tx);

      // Process exam data within same transaction
      await processExamData(
        body.data, 
        body.scheduleOption, 
        new Date(body.examDate),
        tx
      );

      // Log success within transaction
      await tx.activity.create({
        data: {
          type: 'IMPORT',
          description: `Successfully imported ${body.data.length} exam schedules`
        }
      });

      return { success: true, count: body.data.length };
    }, {
      maxWait: 10000, // 10s max wait
      timeout: 30000, // 30s timeout
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });

    return NextResponse.json(result);

  } catch (error) {
    // Log error outside transaction since original one rolled back
    await prisma.activity.create({
      data: {
        type: 'IMPORT',
        description: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    });

    console.error('Import failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Import failed'
    }, { 
      status: 500 
    });
  }
}