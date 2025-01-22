import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { ExamData } from '@/app/types';

async function findOrCreateProfessors(names: string[]) {
  const professors = [];
  for (const name of names) {
    const trimmedName = name.trim();
    const professor = await prisma.professor.findFirst({
      where: { name: trimmedName }
    });
    
    if (!professor) {
      const newProfessor = await prisma.professor.create({
        data: {
          name: trimmedName,
          departmentId: "cm64jppxh000f6qftcl0e4ik6"
        }
      });
      professors.push(newProfessor);
    } else {
      professors.push(professor);
    }
  }
  return professors;
}

async function processExamData(examData: ExamData[], scheduleOption: 'morning' | 'afternoon') {
  for (const row of examData) {
    try {
      // Pre-process professors outside main transaction
      const professorNames = row.ผู้สอน.split(',');
      const professors = await findOrCreateProfessors(professorNames);

      await prisma.$transaction(async (tx) => {
        // Process Subject
        const [code, ...nameParts] = row.วิชา.trim().split(' ');
        const subject = await tx.subject.upsert({
          where: { code: code.trim() },
          create: {
            code: code.trim(),
            name: nameParts.join(' '),
            departmentId: "cm64jppxh000f6qftcl0e4ik6"
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

        // Create SubjectGroup
        const subjectGroup = await tx.subjectGroup.create({
          data: {
            groupNumber: row.กลุ่ม.trim(),
            year: parseInt(row['ชั้นปี'].trim()),
            studentCount: parseInt(row['นศ.'].trim()),
            subjectId: subject.id,
            professorId: professors[0].id
          }
        });

        // Create Schedule
        const [startTime, endTime] = row.เวลา.split(' - ');
        await tx.schedule.create({
          data: {
            date: new Date(),
            scheduleDateOption: scheduleOption.toUpperCase(),
            startTime: new Date(`1970-01-01T${startTime}`),
            endTime: new Date(`1970-01-01T${endTime}`),
            roomId: room.id,
            subjectGroupId: subjectGroup.id,
            invigilatorId: 'cm64k02750001pci491acindo'
          }
        });
      }, {
        timeout: 10000
      });
    } catch (error) {
      throw new Error(`Error processing row: ${JSON.stringify(row)}\n${error.message}`);
    }
  }
}

export async function POST(request: Request) {
    try {
      if (!request.body) {
        return NextResponse.json({ 
          error: 'Request body is required' 
        }, { status: 400 });
      }
  
      const body = await request.json();
      
      // Validate request body structure
      if (!body || typeof body !== 'object') {
        return NextResponse.json({ 
          error: 'Invalid request format' 
        }, { status: 400 });
      }
  
      // Validate required fields
      if (!body.data || !Array.isArray(body.data) || !body.scheduleOption) {
        return NextResponse.json({ 
          error: 'Missing required fields: data (array) and scheduleOption' 
        }, { status: 400 });
      }
  
      await processExamData(body.data, body.scheduleOption);
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