import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { ExamData } from '@/app/types';
import { Professor, Department, Invigilator } from '@prisma/client';
import { departments } from '@/app/lib/data/departments';

interface ImportRequest {
  data: ExamData[];
  scheduleOption: 'ช่วงเช้า' | 'ช่วงบ่าย';
  examDate: string;
}


// Create validated department mappings with unique codes
const departmentMappings = departments.map(dept => ({
  name: dept.name,
  codes: [dept.code]
}));

export async function GET() {
  const departments = await prisma.department.findMany();
  return NextResponse.json(departments);
}

export async function createDepartment(request: Request) {
  try {
    const { name, code } = await request.json();
    
    // Check for existing department with same code or name
    const existing = await prisma.department.findFirst({
      where: {
        OR: [
          { code },
          { name }
        ]
      }
    });

    if (existing) {
      return NextResponse.json({ 
        error: 'Department with this code or name already exists' 
      }, { status: 400 });
    }

    const department = await prisma.department.create({
      data: { name, code }
    });
    return NextResponse.json(department);
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json({ 
      error: 'Failed to create department' 
    }, { status: 500 });
  }
}

// Create lookup map with validation for unique codes
const departmentMap: Record<string, string> = {};
departmentMappings.forEach(mapping => {
  mapping.codes.forEach(code => {
    if (departmentMap[code]) {
      console.warn(`Duplicate department code found: ${code}`);
    }
    departmentMap[code] = mapping.name;
  });
});

// Update getDepartmentCode to use code lookup first
function getDepartmentCode(subjectCode: string): string {
  const firstTwoDigits = subjectCode.substring(0, 2);
  console.log(`Looking up department for subject code: ${subjectCode}`);

  // First try exact match on department code
  const exactMatch = departments.find(dept => dept.code === firstTwoDigits);
  if (exactMatch) {
    console.log(`Found exact department match: ${exactMatch.name}`);
    return exactMatch.name;
  }

  // Then try prefix match
  for (const dept of departments) {
    if (subjectCode.startsWith(dept.code.padStart(2, '0'))) {
      console.log(`Found prefix department match: ${dept.name}`);
      return dept.name;
    }
  }

  console.log(`No department match found, using default department`);
  return 'ส่วนกลาง';
}

async function createProfessorAsInvigilator(
  professor: Professor, 
  department: Department
): Promise<Invigilator> {
  return await prisma.invigilator.upsert({
    where: { 
      professorId: professor.id,
    },
    create: {
      name: professor.name,
      type: 'อาจารย์',
      department: {
        connect: { id: department.id }
      },
      professor: {
        connect: { id: professor.id }
      },
      quota: 4,
      assignedQuota: 0
    },
    update: {
      name: professor.name,
      department: {
        connect: { id: department.id }
      }
    }
  });
}

// Update findOrCreateProfessors function to use transaction properly
async function findOrCreateProfessors(names: string[], subjectCode: string) {
  const professors = [];
  const deptCode = subjectCode.substring(0, 2);
  const department = await prisma.department.findFirst({
    where: { code: deptCode }
  });

  if (!department) {
    throw new Error(`Department not found for code: ${deptCode}`);
  }

  for (const name of names) {
    const trimmedName = name.trim();
    const result = await prisma.$transaction(async (prismaClient) => {
      const professor = await prismaClient.professor.upsert({
        where: { name: trimmedName },
        create: {
          name: trimmedName,
          departmentId: department.id,
        },
        update: {}
      });

      const invigilator = await prismaClient.invigilator.upsert({
        where: { 
          professorId: professor.id,
        },
        create: {
          name: professor.name,
          type: 'อาจารย์',
          department: {
            connect: { id: department.id }
          },
          professor: {
            connect: { id: professor.id }
          },
          quota: 4,
          assignedQuota: 0
        },
        update: {
          name: professor.name,
          department: {
            connect: { id: department.id }
          }
        }
      });
      
      return {
        professor,
        invigilator
      };
    });

    professors.push(result.professor);
  }
  
  return professors;
}

// Add this function to find or create default invigilator
async function getDefaultInvigilator(): Promise<Invigilator> {
  const defaultDepartment = await prisma.department.findFirst();
  if (!defaultDepartment) {
    throw new Error('No default department found');
  }

  const defaultInvigilator = await prisma.invigilator.findFirst();
  if (!defaultInvigilator) {
    return await prisma.invigilator.create({
      data: {
        name: "Default Invigilator",
        type: "บุคลากร",
        department: {
          connect: { id: defaultDepartment.id }
        },
        quota: 4,
        assignedQuota: 0
      }
    });
  }
  return defaultInvigilator;
}

// Update the subject upsert operation
async function upsertSubject(subjectCode: string, subjectName: string) {
  const departmentName = getDepartmentCode(subjectCode);
  
  // First find or create department
  let department = await prisma.department.findUnique({
    where: { name: departmentName }
  });

  if (!department) {
    department = await prisma.department.create({
      data: { 
        name: 'No department found',
        code: '99'
      }
    });
    console.warn(`Department not found for ${departmentName}, using default department`);
  }

  // Then upsert subject with department ID
  const subject = await prisma.subject.upsert({
    where: { code: subjectCode },
    create: {
      code: subjectCode,
      name: subjectName,
      departmentId: department.id
    },
    update: {
      name: subjectName,
      departmentId: department.id
    }
  });

  return { subject, department };
}

async function getAvailableInvigilator(departmentId: string): Promise<Invigilator | null> {
  return await prisma.invigilator.findFirst({
    where: {
      departmentId,
      assignedQuota: {
        lt: 4 // Less than quota
      }
    },
    orderBy: {
      assignedQuota: 'asc'
    }
  });
}

// Update processExamData to use validateExamData
async function processExamData(examData: ExamData[], scheduleOption: string, examDate: Date) {
  // Validate inputs
  if (!Array.isArray(examData)) {
    throw new Error('Invalid exam data: expected array');
  }

  if (!examData.every(validateExamData)) {
    throw new Error('Invalid exam data format');
  }

  const defaultInvigilator = await getDefaultInvigilator();
  const processedSchedules = new Set();

  // Process each row
  for (const row of examData) {
    try {
      await prisma.$transaction(async (tx) => {
        // Parse subject details once at the start
        const [subjectCode, ...subjectNameParts] = row.วิชา.trim().split(' ');
        const trimmedSubjectCode = subjectCode.trim();
        
        // Get professors for the subject
        const professorNames = row.ผู้สอน.split(',');
        const professors = await findOrCreateProfessors(professorNames, trimmedSubjectCode);

        // Create or update subject
        const { subject, department } = await upsertSubject(
          trimmedSubjectCode, 
          subjectNameParts.join(' ')
        );

        // Process Room
        const room = await prisma.room.upsert({
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

        // Create or update subject group
        const subjectGroup = await prisma.subjectGroup.upsert({
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

        // Link additional professors
        if (professors.length > 1) {
          for (let i = 1; i < professors.length; i++) {
            await prisma.subjectGroupProfessor.upsert({
              where: {
                subjectGroupId_professorId: {
                  subjectGroupId: subjectGroup.id,
                  professorId: professors[i].id
                }
              },
              create: {
                id: `${subjectGroup.id}_${professors[i].id}`,
                subjectGroupId: subjectGroup.id,
                professorId: professors[i].id
              },
              update: {}
            });
          }
        }

        // Create unique schedule key and check for duplicates
        const scheduleKey = `${examDate}_${scheduleOption}_${row.เวลา}_${row.อาคาร}_${row.ห้อง}_${subjectGroup.id}`;
        if (processedSchedules.has(scheduleKey)) {
          console.log(`Skipping duplicate schedule: ${scheduleKey}`);
          return;
        }

        const [startTime, endTime] = row.เวลา.split(' - ');

        // Create or update schedule
        const schedule = await prisma.schedule.upsert({
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
          create: {
            date: examDate,
            scheduleDateOption: scheduleOption.toUpperCase(),
            startTime: new Date(`1970-01-01T${startTime}`),
            endTime: new Date(`1970-01-01T${endTime}`),
            roomId: room.id,
            subjectGroupId: subjectGroup.id,
            invigilatorId: (await getAvailableInvigilator(department.id))?.id || defaultInvigilator.id
          },
          update: {}
        });

        // Update invigilator assignment count
        await updateInvigilatorQuota(schedule.invigilatorId);

        processedSchedules.add(scheduleKey);
      }, {
        maxWait: 10000,
        timeout: 10000
      });
    } catch (error) {
      const txError = validateTransactionError(error);
      console.error('Row processing failed:', txError);
      throw txError;
    }
  }
}

// Update seedDepartments function to handle the initial department creation
async function seedDepartments() {
  try {
    console.log('Starting department seeding...');
    
    await prisma.$transaction(async (tx) => {
      // Create default department
      await tx.department.upsert({
        where: { code: '00' },
        create: {
          name: 'ส่วนกลาง',
          code: '00'
        },
        update: {}
      });

      // Create other departments
      for (const dept of departments) {
        await tx.department.upsert({
          where: { code: dept.code },
          create: {
            name: dept.name,
            code: dept.code
          },
          update: { name: dept.name }
        });
      }
    });

    const deptCount = await prisma.department.count();
    console.log(`Department seeding completed. Total: ${deptCount}`);
    return true;

  } catch (error) {
    console.error('Error seeding departments:', error);
    throw error;
  }
}

// Update POST handler with proper error response
export async function POST(request: Request) {
  try {
    // Input validation
    if (!request.body) {
      return NextResponse.json({ 
        success: false,
        error: 'No request body' 
      }, { status: 400 });
    }

    let body: ImportRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid JSON in request body' 
      }, { status: 400 });
    }

    if (!body?.data?.length || !body.scheduleOption || !body.examDate) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Process data in transaction
    try {
      await prisma.$transaction(async (tx) => {
        await seedDepartments();
        await processExamData(
          body.data,
          body.scheduleOption,
          new Date(body.examDate)
        );
      }, {
        maxWait: 30000, // 30s max wait
        timeout: 30000  // 30s timeout
      });

      return NextResponse.json({
        success: true,
        message: 'Data imported successfully'
      });

    } catch (txError) {
      // Handle transaction errors
      console.error('Transaction failed:', txError);
      throw new Error(`Transaction failed: ${txError.message}`);
    }

  } catch (error) {
    // Root error handler
    console.error('Import failed:', error);
    
    // Format error response
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Add API endpoint for invigilator stats
export async function getInvigilatorStats(departmentId?: string) {
  return await prisma.invigilator.findMany({
    where: departmentId ? { departmentId } : undefined,
    include: {
      professor: {
        include: {
          subjectGroups: true
        }
      },
      schedules: true,
      department: true
    }
  });
}
async function updateInvigilatorQuota(invigilatorId: string) {
  const scheduleCount = await prisma.schedule.count({
    where: { invigilatorId }
  });

  await prisma.invigilator.update({
    where: { id: invigilatorId },
    data: { assignedQuota: scheduleCount }
  });
}

// Add validation helper
function validateExamData(data: ExamData): boolean {
  try {
    return !!(
      data.วิชา?.trim() &&
      data.กลุ่ม?.trim() &&
      data['ชั้นปี']?.trim() &&
      data['นศ.']?.trim() &&
      data.เวลา?.trim() &&
      data['ผู้สอน']?.trim() &&
      data.อาคาร?.trim() &&
      data.ห้อง?.trim()
    );
  } catch (error) {
    console.error('Validation error:', error);
    return false;
  }
}

// Add this validation helper
function validateTransactionError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  
  if (typeof error === 'string') {
    return new Error(error);
  }
  
  return new Error('Unknown transaction error occurred');
}