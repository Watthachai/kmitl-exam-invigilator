import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { ExamData } from '@/app/types/exam';

async function processExamData(examData: ExamData[], scheduleOption: 'morning' | 'afternoon') {
    return await prisma.$transaction(async (tx) => {
      try {
        for (const row of examData) {
          // Process Subject
          const [code, ...nameParts] = row.วิชา.trim().split(' ');
          const subject = await tx.subject.upsert({
            where: { code: code.trim() },
            create: {
              code: code.trim(),
              name: nameParts.join(' '),
              departmentId: "cm64jppxh000f6qftcl0e4ik6" // Your department ID
            },
            update: { name: nameParts.join(' ') }
          });
  
          // Process Professor(s)
          const professorNames = row.ผู้สอน.split(',');
          const professors = await Promise.all(
            professorNames.map(async (name) => {
              const trimmedName = name.trim();
              // First try to find existing professor
              let professor = await tx.professor.findFirst({
                where: { name: trimmedName }
              });
  
              // If not found, create new professor
              if (!professor) {
                professor = await tx.professor.create({
                  data: {
                    name: trimmedName,
                    departmentId: "cm64jppxh000f6qftcl0e4ik6"
                  }
                });
              }
  
              return professor;
            })
          );
  
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
  
          // Process SubjectGroup
          const subjectGroup = await tx.subjectGroup.create({
            data: {
              groupNumber: row.กลุ่ม.trim(),
              year: parseInt(row['ชั้นปี'].trim()),
              studentCount: parseInt(row['นศ.'].trim()),
              subjectId: subject.id,
              professorId: professors[0].id
            }
          });
  
          // Process Schedule
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
        }
      } catch (error) {
        console.error('Transaction error:', error);
        throw error;
      }
    });
  }
  
  export async function POST(request: Request) {
    try {
      const body = await request.json();
      if (!body?.data || !body?.scheduleOption) {
        return NextResponse.json({
          error: 'Invalid request data'
        }, { status: 400 });
      }
  
      await processExamData(body.data, body.scheduleOption);
      return NextResponse.json({ message: 'Data imported successfully' });
  
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Import error:', { message: errorMessage });
      
      return NextResponse.json({
        error: 'Import failed',
        details: errorMessage
      }, { status: 500 });
    }
  }