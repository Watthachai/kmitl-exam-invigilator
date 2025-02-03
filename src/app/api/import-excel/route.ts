import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { ExamData } from '@/app/types';
import { Invigilator, PrismaClient } from '@prisma/client';
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

function getDepartmentCode(subjectCode: string): string {
  // For subject codes starting with '01', check the substring (2,4) for department code
  if (subjectCode.startsWith('01')) {
    const deptCode = subjectCode.substring(2, 4);
    console.log(`Subject ${subjectCode} -> Extracted department code: ${deptCode}`);
    
    // First check exact match with extracted code
    const exactMatch = departments.find(dept => dept.code === deptCode);
    if (exactMatch) {
      console.log(`Found exact department match: ${exactMatch.name} (${deptCode})`);
      return exactMatch.name;
    }

    // If no exact match found for 01XXXXXX pattern, return default
    console.log(`No department match found for ${deptCode}, using default department`);
    return 'ไม่มีภาควิชา';
  }

  console.log(`No department match found for ${subjectCode}, using default department`);
  return 'ไม่มีภาควิชา';
}

// Remove unused function since invigilator creation is handled inline

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
        name: 'ไม่มีภาควิชา',
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

// Fix processExamData function
async function processExamData(
  examData: ExamData[], 
  scheduleOption: string, 
  examDate: Date,
  prismaClient: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
) {
  if (!Array.isArray(examData)) {
    throw new Error('Invalid exam data: expected array');
  }

  const defaultInvigilator = await getDefaultInvigilator();
  const processedSchedules = new Set();

  for (const row of examData) {
    const [subjectCode, ...subjectNameParts] = row.วิชา.trim().split(' ');
    const trimmedSubjectCode = subjectCode.trim();
    
    const professorNames = row.ผู้สอน.split(',');
    const professors = await findOrCreateProfessors(professorNames, trimmedSubjectCode);

    const { subject, department } = await upsertSubject(
      trimmedSubjectCode, 
      subjectNameParts.join(' ')
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
      const invigilatorId = await getInvigilatorId(department.id, defaultInvigilator.id);
      
      try {
        const schedule = await prismaClient.schedule.upsert({
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
            invigilatorId
          },
          update: {
            invigilatorId
          }
        });

        if (schedule) {
          await updateInvigilatorQuota(schedule.invigilatorId);
          processedSchedules.add(scheduleKey);
        }
      } catch (error) {
        console.error('Schedule creation failed:', error);
        throw validateTransactionError(error);
      }
    }
  }
}

// Add this helper function
async function getInvigilatorId(departmentId: string, defaultId: string): Promise<string> {
  const available = await getAvailableInvigilator(departmentId);
  return available?.id || defaultId;
}

// Update seedDepartments to use prismaClient
async function seedDepartments(
  prismaClient: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
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
      await seedDepartments(tx);
      await processExamData(
        body.data, 
        body.scheduleOption, 
        new Date(body.examDate),
        tx
      );
      return { success: true };
    }, {
      maxWait: 30000,
      timeout: 60000
    });

    return NextResponse.json(result);

  } catch (error) {
    const validatedError = validateTransactionError(error);
    return NextResponse.json({
      success: false,
      error: validatedError.message
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
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