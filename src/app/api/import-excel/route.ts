import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { ExamData } from '@/app/types';
import { Prisma } from '@prisma/client';
import { departments } from '@/app/lib/data/departments';

interface ImportRequest {
  data: ExamData[];
  scheduleOption: 'ช่วงเช้า' | 'ช่วงบ่าย';
  examDate: string;
  examType: 'MIDTERM' | 'FINAL';
  academicYear: number;
  semester: 1 | 2;
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
  tx: Prisma.TransactionClient
): Promise<string> {
  console.log(`Processing subject code: ${code}`);

  // เพิ่มการตรวจสอบวิชา GenEd ก่อน
  const genEdPrefixes = ['901', '902', '903', '904', '905', '906', '966'];
  if (genEdPrefixes.some(prefix => code.startsWith(prefix))) {
    console.log(`Found GenEd subject for code: ${code}`);
    return 'วิชาเสรีทั่วไป';
  }

  // 1. ตรวจสอบรหัสเต็มก่อน (สำหรับกรณีพิเศษเช่น SIIE)
  const specialDept = departments.find(dept => dept.codes.includes(code));
  if (specialDept) {
    console.log(`Found special department: ${specialDept.name} for code: ${code}`);
    return specialDept.name;
  }

  // 2. ตรวจสอบรหัส 4 หลักสำหรับวิชานานาชาติ (เช่น 1300, 1301)
  const fourDigitCode = code.substring(0, 4);
  const internationalDept = departments.find(dept => dept.codes.includes(fourDigitCode));
  if (internationalDept) {
    console.log(`Found international department: ${internationalDept.name} for code: ${fourDigitCode}`);
    return internationalDept.name;
  }

  // 3. ตรวจสอบรหัสภาควิชา (หลักที่ 3-4)
  if (code.startsWith('01')) {
    const deptCode = code.substring(2, 4);
    // สร้าง mapping สำหรับรหัสภาควิชา
    const deptMapping: { [key: string]: string } = {
      '00': 'ส่วนกลาง',
      '01': 'วิศวกรรมโทรคมนาคม',
      '02': 'วิศวกรรมไฟฟ้า',
      '04': 'วิศวกรรมอิเล็กทรอนิกส์',
      '05': 'วิศวกรรมเครื่องกล',
      '06': 'วิศวกรรมการวัดคุม',
      '07': 'วิศวกรรมคอมพิวเตอร์',
      '08': 'วิศวกรรมระบบควบคุม',
      '09': 'วิศวกรรมโยธา',
      '10': 'วิศวกรรมเกษตร',
      '11': 'วิศวกรรมอาหาร',
      '12': 'วิศวกรรมเคมี',
      '13': 'วิศวกรรมคนตรีและสื่อประสม',
      '14': 'วิศวกรรมพลังงานไฟฟ้า',
      '20': 'วิศวกรรมปิโตรเคมี',
      '21': 'วิศวกรรมอุตสาหการ',
      '23': 'วิศวกรรมระบบไอโอทีและสารสนเทศ',
      '24': 'วิศวกรรมแมคคาทรอนิกส์',
      '25': 'วิศวกรรมอัตโนมัติ',
      '26': 'วิศวกรรมนวัตกรรมคอมพิวเตอร์',
      '28': 'วิศวกรรมซอฟต์แวร์',
      '30': 'วิศวกรรมไฟฟ้า(นานาชาติ)',
      '32': 'วิศวกรรมโยธา(นานาชาติ)',
      '34': 'วิศวกรรมไฟฟ้าสื่อสารและอิเล็กทรอนิกส์',
      '35': 'วิศวกรรมอุตสาหการ(นานาชาติ)',
      '36': 'วิศวกรรมเคมี(นานาชาติ)',
      '37': 'วิศวกรรมโยธา(ต่อเนื่อง)',
      '38': 'วิศวกรรมเกษตร(ต่อเนื่อง)',
      '40': 'วิศวกรรมอวกาศและภูมิสารสนเทศ',
      '41': 'วิศวกรรมหุ่นยนต์และปัญญาประดิษฐ์',
      '45': 'วิศวกรรมไฟฟ้า(ต่อเนื่อง)',
      '51': 'วิศวกรรมพลังงาน',
      '52': 'วิศวกรรมการเงิน',
      '53': 'วิศวกรรมและการเป็นผู้ประกอบการ',
      '92': 'วิศวกรรม-ชีวการแพทย์',
      '99': 'ไม่มีภาควิชา'
    };

    if (deptMapping[deptCode]) {
      console.log(`Found department by subject code (3-4): ${deptMapping[deptCode]} for code: ${code}`);
      return deptMapping[deptCode];
    }
  }

  // 4. ถ้าไม่พบในกรณีข้างต้น ค้นหาในฐานข้อมูล
  const department = await tx.department.findFirst({
    where: {
      OR: [
        { code: code.substring(2, 4) }, // หลักที่ 3-4
        { code: code.substring(0, 4) }, // 4 หลักแรก
        { code: code.substring(0, 3)},
        { code }, // รหัสเต็ม
        {
          metadata: {
            path: ['codes'],
            array_contains: [code]
          }
        }
      ]
    }
  });

  if (department) {
    console.log(`Found department in database: ${department.name} for code: ${code}`);
    return department.name;
  }

  // 5. ถ้าไม่พบทั้งหมด
  console.warn(`No department found for code: ${code}`);
  return 'ไม่มีภาควิชา';
}

// Update findOrCreateProfessors with better department handling
async function findOrCreateProfessors(
  names: string[], 
  department: { id: string, name: string },
  tx: Prisma.TransactionClient
) {
  const professors = [];

  // Get existing professors first
  const existingProfs = await tx.professor.findMany({
    where: { name: { in: names.map(n => n.trim()) } },
    include: { department: true }
  });

  for (const name of names) {
    const trimmedName = name.trim();
    const existingProf = existingProfs.find(p => p.name === trimmedName);

    // If professor exists but in different department, don't update department
    const professor = await tx.professor.upsert({
      where: { name: trimmedName },
      create: {
        name: trimmedName,
        departmentId: department.id,
      },
      update: existingProf?.departmentId ? {} : { departmentId: department.id }
    });
    
    professors.push(professor);
  }
  
  return professors;
}

// Add missing upsertSubject function
async function upsertSubject(
  code: string, 
  name: string, 
  tx: Prisma.TransactionClient
) {
  const deptName = await getDepartmentNameFromCode(code, tx);
  const department = await tx.department.findFirstOrThrow({
    where: { name: deptName }
  });

  // เช็คว่าเป็นวิชา GenEd หรือไม่
  const genEdPrefixes = ['901', '902', '903', '904', '905', '906', '966'];
  const isGenEd = genEdPrefixes.some(prefix => code.startsWith(prefix));

  const subject = await tx.subject.upsert({
    where: { code },
    create: {
      code,
      name,
      departmentId: department.id,
      isGenEd // เพิ่ม flag isGenEd
    },
    update: {
      name,
      departmentId: department.id,
      isGenEd // อัพเดท flag isGenEd
    }
  });

  return { subject, department };
}

// Update the processExamData function
async function processExamData(
  examData: ExamData[], 
  scheduleOption: string, 
  examDate: Date,
  examType: 'MIDTERM' | 'FINAL',
  academicYear: number,
  semester: 1 | 2,
  tx: Prisma.TransactionClient
) {
  if (!Array.isArray(examData)) {
    throw new Error('Invalid exam data: expected array');
  }

  const processedSchedules = new Map<string, number>(); // เปลี่ยนจาก Set เป็น Map เพื่อเก็บจำนวนครั้ง
  const roomSchedules: Record<string, boolean> = {};

  for (const row of examData) {
    if (!validateExamData(row)) {
      throw new Error('Invalid exam data format');
    }

    // เช็คว่าห้องนี้มีการลงทะเบียนแล้วหรือไม่
    const roomKey = `${row.อาคาร}_${row.ห้อง}_${examDate}_${scheduleOption}`;
    
    // ดำเนินการปกติ
    // Update the relevant part in processExamData
const [subjectCode, ...subjectNameParts] = row.วิชา.split(' ');
const trimmedSubjectCode = subjectCode === 'ไม่ระบุรหัสวิชา' 
  ? 'UNKNOWN' 
  : subjectCode.trim();

    // Get subject and department first
    const { subject, department } = await upsertSubject(
      trimmedSubjectCode, 
      subjectNameParts.join(' '),
      tx
    );

    // Pass department to findOrCreateProfessors
    // Handle empty professor names
    const professorNames = row.ผู้สอน === 'ไม่ระบุอาจารย์' 
      ? ['ไม่ระบุอาจารย์'] 
      : row.ผู้สอน.split(',').map(name => name.trim()).filter(Boolean);

    const professors = await findOrCreateProfessors(
      professorNames, 
      department, 
      tx
    );

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
        professorId: professors[0].id, // Connect to the first professor
      },
      update: {
        studentCount: parseInt(row['นศ.'].trim()),
      }
    });

    // Add additional professors to the subject group
    // Start from index 1 since the first professor is already the main professor
    if (professors.length > 1) {
      // Delete any existing additional professors first to avoid duplicates
      await tx.subjectGroupProfessor.deleteMany({
        where: {
          subjectGroupId: subjectGroup.id
        }
      });

      // Add each additional professor
      for (let i = 1; i < professors.length; i++) {
        await tx.subjectGroupProfessor.create({
          data: {
            subjectGroupId: subjectGroup.id,
            professorId: professors[i].id
          }
        });
      }
    }

    const [startTime, endTime] = row.เวลา.split(' - ');
    
    // เช็คว่ามีตารางสอบในห้องและเวลาเดียวกันหรือไม่
    const existingSchedules = await tx.schedule.count({
      where: {
        date: examDate,
        roomId: room.id,
        startTime: new Date(`1970-01-01T${startTime}`),
        endTime: new Date(`1970-01-01T${endTime}`),
        scheduleDateOption: scheduleOption.toUpperCase()
      }
    });

    // อนุญาตให้มีได้ไม่เกิน 2 คนต่อห้อง
    if (existingSchedules < 2) {
      try {
        const scheduleKey = `${room.id}_${startTime}_${endTime}_${examDate}`;
        const scheduleData = {
          date: examDate,
          scheduleDateOption: scheduleOption.toUpperCase(),
          startTime: new Date(`1970-01-01T${startTime}`),
          endTime: new Date(`1970-01-01T${endTime}`),
          roomId: room.id,
          subjectGroupId: subjectGroup.id,
          notes: existingSchedules === 1 ? 'เพิ่มแถวโดยระบบ' : row.หมายเหตุ?.toString() || '',
          examType,
          academicYear,
          semester,
          invigilatorPosition: existingSchedules + 1
        };

        await tx.schedule.create({
          data: scheduleData
        });

        processedSchedules.set(scheduleKey, existingSchedules + 1);
        roomSchedules[roomKey] = true;
      } catch (error) {
        console.error('Schedule creation failed:', error);
        throw error;
      }
    }
  }

  // แก้ไขส่วนการเพิ่มแถวที่ขาด
  for (const row of examData) {
    // เช็คจำนวน schedules ที่มีอยู่แล้ว
    const room = await tx.room.findFirst({
      where: {
        building: row.อาคาร.trim(),
        roomNumber: row.ห้อง.trim()
      }
    });

    if (!room) continue;

    const existingSchedulesCount = await tx.schedule.count({
      where: {
        date: examDate,
        scheduleDateOption: scheduleOption.toUpperCase(),
        examType,
        academicYear,
        semester,
        roomId: room.id
      }
    });

    // สร้างเพิ่มเติมเฉพาะถ้ามีน้อยกว่า 2 รายการ
    if (existingSchedulesCount < 2) {
      // Get room and subject group data first
      const room = await tx.room.findFirst({
        where: {
          building: row.อาคาร.trim(),
          roomNumber: row.ห้อง.trim()
        }
      });

      if (!room) continue;

      const [subjectCode] = row.วิชา.trim().split(' ');
      const { subject } = await upsertSubject(
        subjectCode.trim(),
        '', // Name not needed for lookup
        tx
      );

      const subjectGroup = await tx.subjectGroup.findFirst({
        where: {
          subjectId: subject.id,
          groupNumber: row.กลุ่ม.trim(),
          year: parseInt(row['ชั้นปี'].trim())
        }
      });

      if (!subjectGroup) continue;

      // สร้าง schedule เพิ่มเติมสำหรับห้องที่ขาด
      const scheduleData = {
        date: examDate,
        scheduleDateOption: scheduleOption.toUpperCase(),
        startTime: new Date(`1970-01-01T${row.เวลา.split(' - ')[0]}`),
        endTime: new Date(`1970-01-01T${row.เวลา.split(' - ')[1]}`),
        roomId: room.id,
        subjectGroupId: subjectGroup.id,
        notes: 'เพิ่มแถวโดยระบบ',
        examType,
        academicYear,
        semester
      };

      await tx.schedule.create({
        data: scheduleData
      });
    }
  }
}

// Helper functions for handling empty fields
function parseField(value: string | number | null | undefined, defaultValue: string): string {
  if (!value || value.toString().trim() === '') {
    return defaultValue;
  }
  return value.toString().trim();
}

function parseNumber(value: string | number | null | undefined, defaultValue: number): number {
  if (!value || value.toString().trim() === '') {
    return defaultValue;
  }
  const parsed = parseInt(value.toString().trim());
  return isNaN(parsed) ? defaultValue : parsed;
}

// Update validation helper to handle empty fields
function validateExamData(data: ExamData): boolean {
  if (!data || typeof data !== 'object') return false;
  
  // Handle empty fields with default values
  data.วิชา = parseField(data.วิชา, 'ไม่ระบุรหัสวิชา');
  data.กลุ่ม = parseField(data.กลุ่ม, 'ไม่ระบุกลุ่ม');
  data['ชั้นปี'] = parseField(data['ชั้นปี'], 'ทุกชั้นปี');
  data['นศ.'] = parseNumber(data['นศ.'], 0).toString();
  data.เวลา = parseField(data.เวลา, '00:00 - 00:00');
  data['ผู้สอน'] = parseField(data['ผู้สอน'], 'ไม่ระบุอาจารย์');
  data.อาคาร = parseField(data.อาคาร, 'ไม่ระบุอาคาร');
  data.ห้อง = parseField(data.ห้อง, 'ไม่ระบุห้อง');
  data.หมายเหตุ = parseField(data.หมายเหตุ, '');

  return true; // Always return true since we're providing default values
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

// Update seedDepartments to handle multiple codes
async function seedDepartments(tx: Prisma.TransactionClient) {
  try {
    console.log('Checking if departments need updating...');
    
    // First, get all existing departments with their metadata
    const existingDepartments = await tx.department.findMany({
      select: {
        code: true,
        name: true,
        metadata: true
      }
    });

    // Create a map for faster lookups
    const existingDeptMap = new Map(
      existingDepartments.map(dept => [dept.code, dept])
    );

    // Track which departments need updates
    const departsToUpdate = departments.filter(dept => {
      const existing = existingDeptMap.get(dept.code);
      if (!existing) return true; // New department

      // Check if any data has changed
      return existing.name !== dept.name ||
        JSON.stringify((existing.metadata as { codes: string[] })?.codes) !== JSON.stringify(dept.codes);
    });

    if (departsToUpdate.length === 0) {
      console.log('All departments are up to date, skipping seed');
      return true;
    }

    console.log(`Updating ${departsToUpdate.length} departments...`);
    
    // Only upsert departments that need updating
    for (const dept of departsToUpdate) {
      console.log(`Seeding department: ${dept.name} (${dept.code})`);
      await tx.department.upsert({
        where: { code: dept.code },
        create: {
          name: dept.name,
          code: dept.code,
          metadata: { codes: dept.codes }
        },
        update: { 
          name: dept.name,
          metadata: { codes: dept.codes }
        }
      });
    }

    console.log(`Department update completed. Updated: ${departsToUpdate.length}`);
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
          description: `Starting import of ${body.data.length} exam schedules for ${body.examType} ${body.academicYear}/${body.semester}`
        }
      });

      // Seed departments first
      await seedDepartments(tx);

      // Process exam data within same transaction
      await processExamData(
        body.data, 
        body.scheduleOption, 
        new Date(body.examDate),
        body.examType,
        body.academicYear,
        body.semester,
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
      maxWait: 90000, // 90s timeout
      timeout: 1200000, // 30s timeout
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