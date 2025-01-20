// src/app/lib/actions.ts
'use server';

import prisma from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';

interface TableData {
  [key: string]: string | number | null;
}

async function processAndSaveRowServerAction(row: TableData, dateOption: 'morning' | 'afternoon') {
  try {
    const subjectFull = row["วิชา"]?.toString().trim();
    const subjectMatch = subjectFull?.match(/(\d+)\s+(.+)/);
    const subjectCode = subjectMatch?.[1];
    const subjectName = subjectMatch?.[2];

    if (!subjectCode || !subjectName) {
      console.warn(`Skipping row due to invalid subject format: ${subjectFull}`);
      return;
    }

    const subject = await prisma.subject.upsert({
      where: { code: subjectCode },
      update: { name: subjectName },
      create: { code: subjectCode, name: subjectName, departmentId: 'defaultDepartmentId' }, // Replace 'defaultDepartmentId' with actual logic to get department
    });

    const groupNumber = row["กลุ่ม"]?.toString().trim();
    const year = Number(row["ชั้นปี"]);
    const studentCount = Number(row["นศ."]);

    if (!groupNumber || isNaN(year) || isNaN(studentCount)) {
      console.warn(`Skipping row due to missing or invalid group information for subject: ${subjectCode}`);
      return;
    }

    const subjectGroup = await prisma.subjectGroup.create({
      data: {
        groupNumber: groupNumber,
        year: year,
        studentCount: studentCount,
        subjectId: subject.id,
        professorId: 'defaultProfessorId', // Will be updated later
      },
    });

    const professorNames = row["ผู้สอน"]?.toString().split(',').map(name => name.trim());

    if (professorNames) {
      for (const professorName of professorNames) {
        const professor = await prisma.professor.upsert({
          where: { name: professorName },
          update: {},
          create: {
            name: professorName,
            departmentId: 'defaultDepartmentId', // Replace with actual logic
          },
        });

        // Connect professor to subject group
        await prisma.subjectGroup.update({
          where: { id: subjectGroup.id },
          data: { professorId: professor.id },
        });
      }
    }

    const building = row["อาคาร"]?.toString().trim();
    const roomNumber = row["ห้อง"]?.toString().trim();

    if (building && roomNumber) {
      const room = await prisma.room.upsert({
        where: { building_roomNumber: { building: building, roomNumber: roomNumber } },
        update: {},
        create: { building: building, roomNumber: roomNumber },
      });

      const timeString = row["เวลา"]?.toString().trim();
      if (timeString) {
        const [startTimeStr, endTimeStr] = timeString.split('-');
        const [startHour, startMinute] = startTimeStr?.split(':').map(Number) || [];
        const [endHour, endMinute] = endTimeStr?.split(':').map(Number) || [];

        if (!isNaN(startHour) && !isNaN(startMinute) && !isNaN(endHour) && !isNaN(endMinute)) {
          let scheduleDate: Date;
          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth();
          const currentDate = now.getDate();

          if (dateOption === 'morning') {
            scheduleDate = new Date(currentYear, currentMonth, currentDate, 0, 0, 0);
          } else {
            scheduleDate = new Date(currentYear, currentMonth, currentDate, 12, 0, 0);
          }

          const startTime = new Date(scheduleDate);
          startTime.setHours(startHour);
          startTime.setMinutes(startMinute);

          const endTime = new Date(scheduleDate);
          endTime.setHours(endHour);
          endTime.setMinutes(endMinute);

          await prisma.schedule.create({
            data: {
              date: scheduleDate,
              startTime: startTime,
              endTime: endTime,
              roomId: room.id,
              subjectGroupId: subjectGroup.id,
              invigilatorId: 'defaultInvigilatorId', // Replace with actual logic
            },
          });
        } else {
          console.warn(`Invalid time format for subject: ${subjectCode}`);
        }
      }
    }
  } catch (error: any) {
    console.error('Error processing row (server action):', error);
    throw new Error(`Error processing row for วิชา: ${row["วิชา"]}: ${error.message}`);
  }
}

export async function saveDataToDatabaseAction(editedData: TableData[], scheduleDateOption: 'morning' | 'afternoon') {
  try {
    for (const row of editedData) {
      await processAndSaveRowServerAction(row, scheduleDateOption);
    }
    revalidatePath('/dashboard/admin/tables'); // Optional: clear the cache for this path
    return { success: true, message: 'Data saved to database successfully' };
  } catch (error: any) {
    console.error('Error saving data (server action):', error);
    return { success: false, message: `Failed to save data to database: ${error.message || 'Unknown error'}` };
  }
}