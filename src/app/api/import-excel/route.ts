import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { ExamData } from '@/app/types';
import { Prisma } from '@prisma/client';
import { departments } from '@/app/lib/data/departments';
import { logActivity } from '@/app/lib/activity-logger';

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
function getDepartmentNameFromCode(subjectCode: string): string {
  if (subjectCode.startsWith('01')) {
    const deptCode = subjectCode.substring(2, 4);
    const exactMatch = departments.find(dept => dept.code === deptCode);
    return exactMatch ? exactMatch.name : 'ไม่มีภาควิชา';
  }
  return 'ไม่มีภาควิชา';
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

    // Create/update invigilator with same logic
    await prismaClient.invigilator.upsert({
      where: { professorId: professor.id },
      create: {
        name: professor.name,
        type: 'อาจารย์',
        department: { connect: { id: department.id } },
        professor: { connect: { id: professor.id } },
        quota: 4,
        assignedQuota: 0
      },
      update: {
        name: professor.name,
        ...(existingProf?.departmentId ? {} : {
          department: { connect: { id: department.id } }
        })
      }
    });
    
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
  const deptName = getDepartmentNameFromCode(code);
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
async function seedDepartments(
  prismaClient: Prisma.TransactionClient
) {
  try {
    console.log('Starting department seeding...');
    
    await prismaClient.department.upsert({
      where: { code: '00' },
      create: {
        name: 'ส่วนกลาง',
        code: '00'
      },
      update: {}
    });

    for (const dept of departments) {
      await prismaClient.department.upsert({
        where: { code: dept.code },
        create: {
          name: dept.name,
          code: dept.code
        },
        update: { name: dept.name }
      });
    }

    const deptCount = await prismaClient.department.count();
    console.log(`Department seeding completed. Total: ${deptCount}`);
    return true;

  } catch (error) {
    console.error('Error seeding departments:', error);
    throw validateTransactionError(error);
  }
}

// Fix POST handler
export async function POST(request: Request) {
  try {
    const body = await request.json() as ImportRequest;
    
    if (!body?.data?.length || !body.scheduleOption || !body.examDate) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid request data'
      }, { status: 400 });
    }

    // Add validation using validateExamData
    if (!body.data.every(validateExamData)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid exam data format'
      }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      console.log('Starting transaction...');
      await seedDepartments(tx);
      await processExamData(
        body.data, 
        body.scheduleOption, 
        new Date(body.examDate),
        tx
      );
      console.log('Transaction completed');

      // Log the import activity
      await logActivity('IMPORT', `Imported ${body.data.length} exam schedules for ${body.examDate}`, tx);

      return { success: true };
    }, {
      maxWait: 30000,
      timeout: 60000
    });

    return NextResponse.json(result || { success: false });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      success: false,
      error: message
    }, { status: 500 });
  }
}