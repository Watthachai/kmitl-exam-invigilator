import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { ExamData } from '@/app/types';

interface ImportRequest {
  data: ExamData[];
  scheduleOption: 'ช่วงเช้า' | 'ช่วงบ่าย';
  examDate: string;
}

// Define department mappings with arrays
const departmentMappings = [
  { codes: ['00'], name: 'ส่วนกลาง' },
  { codes: ['01'], name: 'วิศวกรรมโทรคมนาคม' },
  { codes: ['02'], name: 'วิศวกรรมไฟฟ้า' },
  { codes: ['04', '34', '10', '104', '133'], name: 'วิศวกรรมอิเล็กทรอนิกส์' },
  { codes: ['06', '066', '068', '306', '00672', '106', '116', '121'], name: 'วิศวกรรมการวัดคุม' },
  { codes: ['05'], name: 'วิศวกรรมเครื่องกล' },
  { codes: ['07'], name: 'วิศวกรรมคอมพิวเตอร์' },
  { codes: ['09'], name: 'วิศวกรรมโยธา' },
  { codes: ['11', '21'], name: 'วิศวกรรมอุตสาหการ' },
  { codes: ['12'], name: 'วิศวกรรมเคมี' },
];

// Create lookup map
const departmentMap: Record<string, string> = {};
departmentMappings.forEach(mapping => {
  mapping.codes.forEach(code => {
    departmentMap[code] = mapping.name;
  });
});

// Helper function to get department name
const getDepartmentName = (code: string): string => {
  return departmentMap[code] || 'Unknown Department';
};

// Add this helper function
async function getDepartmentFromSubjectCode(subjectCode: string) {
  // Extract department code (first 2-3 digits)
  const deptCode = subjectCode.trim().substring(1, 3);
  
  const departmentName = getDepartmentName(deptCode);
  if (!departmentName) {
    throw new Error(`Unknown department code: ${deptCode}`);
  }

  const department = await prisma.department.findFirst({
    where: { name: departmentName }
  });

  if (!department) {
    throw new Error(`Department not found: ${departmentName}`);
  }

  return department;
}

async function findOrCreateProfessors(names: string[], subjectCode: string) {
  const professors = [];
  const department = await getDepartmentFromSubjectCode(subjectCode);

  for (const name of names) {
    const trimmedName = name.trim();
    const professor = await prisma.professor.findFirst({
      where: { name: trimmedName }
    });
    
    if (!professor) {
      const newProfessor = await prisma.professor.create({
        data: {
          name: trimmedName,
          department: {
            connect: { id: department.id }
          }
        }
      });
      professors.push(newProfessor);
    } else {
      professors.push(professor);
    }
  }
  return professors;
}

// Add this function to find or create default invigilator
async function getDefaultInvigilator() {
  const defaultInvigilator = await prisma.invigilator.findFirst();
  if (!defaultInvigilator) {
    return await prisma.invigilator.create({
      data: {
        name: "Default Invigilator",
        type: "INTERNAL"
      }
    });
  }
  console.log('Default invigilator:', defaultInvigilator);
  return defaultInvigilator;
}

async function processExamData(examData: ExamData[], scheduleOption: string, examDate: Date) {
  const defaultInvigilator = await getDefaultInvigilator();
  const processedSchedules = new Set(); // Track processed schedules

  for (const row of examData) {
    try {
      // Get department from subject code
      const subjectCode = row.วิชา.trim().split(' ')[0];
      const department = await getDepartmentFromSubjectCode(subjectCode);
      
      const professorNames = row.ผู้สอน.split(',');
      const professors = await findOrCreateProfessors(professorNames, subjectCode);

      await prisma.$transaction(async (tx) => {
        // Process Subject with dynamic departmentId
        const [code, ...nameParts] = row.วิชา.trim().split(' ');
        const subject = await tx.subject.upsert({
          where: { code: code.trim() },
          create: {
            code: code.trim(),
            name: nameParts.join(' '),
            departmentId: department.id  // Dynamic department ID
          },
          update: { name: nameParts.join(' ') }
        });

        // Process Room
        const room = await tx.room.upsert({
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

        // Update SubjectGroup creation to use upsert
        const subjectGroup = await tx.subjectGroup.upsert({
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
            await tx.subjectGroupProfessor.upsert({
              where: {
                subjectGroupId_professorId: {
                  subjectGroupId: subjectGroup.id,
                  professorId: professors[i].id
                }
              },
              create: {
                subjectGroup: { connect: { id: subjectGroup.id } },
                professor: { connect: { id: professors[i].id } }
              },
              update: {} // No updates needed
            });
          }
        }

        // Create unique key for schedule
        const scheduleKey = `${examDate}_${scheduleOption}_${row.เวลา}_${row.อาคาร}_${row.ห้อง}_${subjectGroup.id}`;
        
        // Check if schedule already processed
        if (processedSchedules.has(scheduleKey)) {
          console.log(`Skipping duplicate schedule: ${scheduleKey}`);
          return;
        }

        const [startTime, endTime] = row.เวลา.split(' - ');
        
        // Log schedule creation attempt
        console.log('Attempting to create schedule:', {
          date: examDate,
          option: scheduleOption,
          startTime,
          endTime,
          room: room.id,
          subjectGroup: subjectGroup.id
        });

        await tx.schedule.upsert({
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
            invigilatorId: defaultInvigilator.id
          },
          update: {} // No updates needed for duplicates
        });

        processedSchedules.add(scheduleKey);
        
      }, {
        timeout: 10000
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error processing row: ${JSON.stringify(row)}\n${errorMessage}`);
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ImportRequest;
    
    // Validate required fields
    if (!body?.data?.length) {
      return NextResponse.json({ error: 'Missing exam data' }, { status: 400 });
    }
    if (!body.scheduleOption) {
      return NextResponse.json({ error: 'Missing schedule option' }, { status: 400 });
    }
    if (!body.examDate) {
      return NextResponse.json({ error: 'Missing exam date' }, { status: 400 });
    }

    // Validate each exam data entry
    const invalidRows = body.data.filter(row => !validateExamData(row));
    if (invalidRows.length > 0) {
      return NextResponse.json({
        error: 'Invalid exam data entries found',
        invalidRows
      }, { status: 400 });
    }

    await processExamData(body.data, body.scheduleOption, new Date(body.examDate));
    return NextResponse.json({ message: 'Data imported successfully' });

  } catch (error) {
    // Type-safe error handling
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';

    console.error('Import error:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({
      error: 'Import failed',
      details: errorMessage
    }, { status: 500 });
  }
}

function validateExamData(data: ExamData): boolean {
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
}