// src/app/api/import-data/route.ts
import prisma from '@/app/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const jsonData = await request.json();
    console.log('Received JSON Data:', jsonData);

    const importResults = await processExcelData(jsonData);

    return NextResponse.json({ message: 'Data import process started.', results: importResults }, { status: 200 });
  } catch (error: any) {
    console.error('Error processing data in API route:', error);
    return NextResponse.json({ error: 'Failed to process data', details: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

async function processExcelData(data: any[]) {
  const results = [];

  for (const row of data) {
    try {
      const subjectResult = await processSubject(row['วิชา'] as string);
      const subjectGroupResult = await processSubjectGroup(row['กลุ่ม'] as string, row['ชั้นปี'] as string, row['นศ.'] as string, subjectResult?.subject?.id);
      const professorResults = await processProfessors(row['ผู้สอน'] as string, subjectGroupResult?.subjectGroup?.id);
      const roomResult = await processRoom(row['อาคาร'] as string, row['ห้อง'] as string);
      const scheduleResult = await processSchedule(row['เวลา'] as string, subjectGroupResult?.subjectGroup?.id, roomResult?.room?.id, professorResults.map(p => p.professor?.id).filter(Boolean));

      results.push({
        row,
        subject: subjectResult,
        subjectGroup: subjectGroupResult,
        professors: professorResults,
        room: roomResult,
        schedulePrompt: scheduleResult,
      });
    } catch (error: any) {
      console.error('Error processing row:', row, error);
      results.push({ row, error: error.message });
    }
  }

  return results;
}

async function processSubject(subjectString: string) {
  if (!subjectString) return { error: 'Subject string is missing' };

  const parts = subjectString.trim().split(' ', 1);
  const code = parts[0];
  const name = subjectString.substring(code.length).trim();

  if (!code || !name) return { error: `Could not parse subject string: ${subjectString}` };

  try {
    const existingSubject = await prisma.subject.findUnique({
      where: { code },
    });

    if (existingSubject) {
      return { status: 'Subject already exists', subject: existingSubject };
    }

    const subject = await prisma.subject.create({
      data: {
        code,
        name,
        departmentId: 'YOUR_DEFAULT_DEPARTMENT_ID', // Replace with a valid department ID
      },
    });
    return { status: 'Subject created', subject };
  } catch (error: any) {
    return { error: `Failed to create/find subject: ${error.message}` };
  }
}

async function processSubjectGroup(groupNumber: string, year: string, studentCount: string, subjectId?: string) {
  if (!groupNumber || !year || !studentCount || !subjectId) {
    return { error: 'Missing data for SubjectGroup' };
  }

  try {
    const existingSubjectGroup = await prisma.subjectGroup.findFirst({
      where: {
        groupNumber,
        year: parseInt(year),
        subjectId,
      },
    });

    if (existingSubjectGroup) {
      return { status: 'SubjectGroup already exists', subjectGroup: existingSubjectGroup };
    }

    const subjectGroup = await prisma.subjectGroup.create({
      data: {
        groupNumber,
        year: parseInt(year),
        studentCount: parseInt(studentCount),
        subjectId,
        professorId: 'TEMP_PROFESSOR_ID', // Temporary ID, will be updated
      },
    });
    return { status: 'SubjectGroup created', subjectGroup };
  } catch (error: any) {
    return { error: `Failed to create/find SubjectGroup: ${error.message}` };
  }
}

async function processProfessors(professorsString: string, subjectGroupId?: string) {
  if (!professorsString || !subjectGroupId) {
    return [{ error: 'Missing data for professors or subjectGroupId' }];
  }

  const professorNames = professorsString.split(',').map(name => name.trim());
  const results = [];

  for (const name of professorNames) {
    try {
      const existingProfessor = await prisma.professor.findFirst({
        where: { name },
      });

      let professor;
      if (existingProfessor) {
        professor = existingProfessor;
        results.push({ status: 'Professor already exists', professor });
      } else {
        professor = await prisma.professor.create({
          data: {
            name,
            departmentId: 'YOUR_DEFAULT_DEPARTMENT_ID', // Replace with a valid department ID
          },
        });
        results.push({ status: 'Professor created', professor });
      }

      // Link professor to SubjectGroup
      await prisma.subjectGroup.update({
        where: { id: subjectGroupId },
        data: { professorId: professor.id },
      });

    } catch (error: any) {
      results.push({ error: `Failed to create/find professor ${name}: ${error.message}` });
    }
  }

  return results;
}

async function processRoom(building: string, roomNumber: string) {
  if (!building || !roomNumber) {
    return { error: 'Missing data for Room' };
  }

  try {
    const existingRoom = await prisma.room.findUnique({
      where: {
        building_roomNumber: {
          building,
          roomNumber,
        },
      },
    });

    if (existingRoom) {
      return { status: 'Room already exists', room: existingRoom };
    }

    const room = await prisma.room.create({
      data: {
        building,
        roomNumber,
      },
    });
    return { status: 'Room created', room };
  } catch (error: any) {
    return { error: `Failed to create/find Room: ${error.message}` };
  }
}

async function processSchedule(timeString: string, subjectGroupId?: string, roomId?: string, professorIds?: string[]) {
  if (!timeString) {
    return { prompt: 'Please provide the date (morning or afternoon) for this schedule.' };
  }

  const [startTimeString, endTimeString] = timeString.split(' - ');
  if (!startTimeString || !endTimeString) {
    return { error: `Could not parse time string: ${timeString}` };
  }

  const startTime = new Date(`2023-01-01T${startTimeString}`); // Using a dummy date
  const endTime = new Date(`2023-01-01T${endTimeString}`);     // Using a dummy date

  if (!subjectGroupId || !roomId || !professorIds || professorIds.length === 0) {
    return { error: 'Missing data for Schedule creation' };
  }

  return { prompt: `Schedule details found, waiting for date input for SubjectGroup ID: ${subjectGroupId}, Room ID: ${roomId}, Professors: ${professorIds.join(', ')}` };
}