import prisma from '@/app/lib/prisma';


interface ProcessedData {
  subject: {
    code: string;
    name: string;
    departmentId?: string; // Add departmentId
  };
  subjectGroup: {
    groupNumber: string;
    year: number;
    studentCount: number;
  };
  professors: string[];
  room: {
    building: string;
    roomNumber: string;
  };
  time: string;
  notes?: string;
}

export const createSubjectWithRelations = async (data: ProcessedData) => {
  return await prisma.$transaction(async (tx) => {
    try {
      // Find or create default department if not provided
      const department = data.subject.departmentId 
        ? await tx.department.findUnique({ where: { id: data.subject.departmentId } })
        : await tx.department.findFirst();

      if (!department) {
        throw new Error('No department found');
      }

      const subject = await tx.subject.upsert({
        where: { code: data.subject.code },
        update: {
          name: data.subject.name,
          departmentId: department.id
        },
        create: {
          code: data.subject.code,
          name: data.subject.name,
          departmentId: department.id
        }
      });

      const room = await tx.room.upsert({
        where: {
          building_roomNumber: {
            building: data.room.building,
            roomNumber: data.room.roomNumber
          }
        },
        update: {},
        create: {
          building: data.room.building,
          roomNumber: data.room.roomNumber
        }
      });

      const professorPromises = data.professors.map(name =>
        tx.professor.upsert({
          where: { name },
          update: { departmentId: department.id },
          create: { 
            name,
            departmentId: department.id
          }
        })
      );
      const professors = await Promise.all(professorPromises);

      const subjectGroup = await tx.subjectGroup.create({
        data: {
          groupNumber: data.subjectGroup.groupNumber,
          year: data.subjectGroup.year,
          studentCount: data.subjectGroup.studentCount,
          subject: { connect: { id: subject.id } },
          professors: {
            connect: professors.map(prof => ({ id: prof.id }))
          }
        }
      });

      return { subject, subjectGroup, room, professors };
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  });
};

