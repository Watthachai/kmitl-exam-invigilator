import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { Prisma } from '@prisma/client';
import { logActivity } from '@/app/lib/activity-logger';

export async function GET() {
  try {
    // 1. ดึงข้อมูลผู้คุมสอบทั้งหมดพร้อมข้อมูลที่เกี่ยวข้อง
    const invigilators = await prisma.invigilator.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        departmentId: true,
        professorId: true,
        quota: true,
        assignedQuota: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: {
            name: true,
            code: true
          }
        },
        professor: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        },
        schedules: true,
        user: true
      }
    });
    
    // 2. ดึงข้อมูลอาจารย์ที่ไม่มี invigilator
    const professorsWithoutInvigilator = await prisma.professor.findMany({
      where: {
        invigilator: {
          none: {}
        }
      },
      select: {
        id: true,
        name: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });
    
    // 3. สร้างรายการอาจารย์ในรูปแบบเดียวกับ invigilator
    const professorsAsInvigilators = professorsWithoutInvigilator.map(professor => ({
      id: `prof_${professor.id}`, // ใส่ prefix เพื่อแยกแยะว่าเป็น ID ของอาจารย์
      name: professor.name,
      type: 'อาจารย์', // ตั้งประเภทเป็นอาจารย์
      departmentId: professor.department?.id,
      professorId: professor.id,
      quota: 3, // ตั้งค่าโควต้าเริ่มต้น
      assignedQuota: 0, // เริ่มต้นที่ยังไม่มีการกำหนดโควต้า
      department: professor.department,
      professor: {
        id: professor.id,
        name: professor.name,
        department: professor.department
      },
      schedules: [],
      isProfessor: true, // เพิ่มฟิลด์พิเศษเพื่อระบุว่าเป็นอาจารย์
      displayName: professor.name // เพิ่ม displayName เพื่อใช้แสดงผล
    }));
    
    // 4. แก้ไขข้อมูล invigilators ที่เชื่อมต่อกับ professor
    const modifiedInvigilators = invigilators.map(invigilator => {
      // ถ้า invigilator เชื่อมต่อกับ professor ให้ใช้ชื่ออาจารย์
      if (invigilator.professor) {
        
        return {
          ...invigilator,
          displayName: invigilator.professor.name, // ใช้ชื่ออาจารย์เสมอ
          isProfessor: true // ระบุว่าเป็นอาจารย์
        };
      }
      return {
        ...invigilator,
        displayName: invigilator.name,
        isProfessor: false // ระบุว่าไม่ใช่อาจารย์
      };
    });
    
    // 5. รวมข้อมูลทั้งหมดเข้าด้วยกัน
    const combinedInvigilators = [...modifiedInvigilators, ...professorsAsInvigilators];
    
    return NextResponse.json(combinedInvigilators);
  } catch (error) {
    console.error('Error fetching invigilators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invigilators' }, 
      { status: 500 }
    );
  }
}

// ส่วน POST function ยังคงเหมือนเดิม
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const invigilator = await prisma.$transaction(async (tx) => {
      const newInvigilator = await tx.invigilator.create({ 
        data,
        include: {
          department: true,
          professor: true
        }
      });
      
      // Check if userId exists before passing it to logActivity
      if (newInvigilator.userId) {
        await logActivity(
          'CREATE', 
          `Added invigilator ${data.name} (${newInvigilator.department?.name || 'No department'})`,
          prisma, // Pass the prisma instance
          newInvigilator.userId
        );
      } else {
        await logActivity(
          'CREATE', 
          `Added invigilator ${data.name} (${newInvigilator.department?.name || 'No department'})`,
          prisma
        );
      }
      
      return newInvigilator;
    });
    
    return NextResponse.json(invigilator);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Invigilator already exists' }, 
          { status: 409 }
        );
      }
    }
    console.error('Error creating invigilator:', error);
    return NextResponse.json(
      { error: 'Failed to create invigilator' }, 
      { status: 500 }
    );
  }
}