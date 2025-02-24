// src/app/api/seed/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function POST() {
    try {
      // คำนวณจำนวนตารางสอบทั้งหมด
      const scheduleStats = await prisma.schedule.aggregate({
        where: {
          OR: [
            { examType: 'MIDTERM' },
            { examType: 'FINAL' }
          ]
        },
        _count: true
      });
  
      // นับจำนวนอาจารย์ทั้งหมด
      const totalInvigilators = await prisma.invigilator.count({
        where: {
          type: 'อาจารย์'
        }
      });

      // ป้องกันการหารด้วย 0
      if (totalInvigilators === 0) {
        return NextResponse.json(
          { error: 'ไม่พบข้อมูลอาจารย์ในระบบ กรุณาเพิ่มข้อมูลอาจารย์ก่อน' },
          { status: 400 }
        );
      }
  
      // คำนวณโควต้าพื้นฐาน
      const baseQuota = Math.max(1, Math.floor(scheduleStats._count / totalInvigilators));
      const remainingQuota = Math.max(1, scheduleStats._count % totalInvigilators);
      
      console.log('Debug before staff update:', {
        remainingQuota,
        remainingQuotaType: typeof remainingQuota,
        baseQuota,
        baseQuotaType: typeof baseQuota,
        scheduleCount: scheduleStats._count,
        invigilatorCount: totalInvigilators
      });
      
      // แก้ไขการอัพเดตบุคลากร
      const staffUpdate = prisma.invigilator.updateMany({
        where: {
          type: 'บุคลากร'
        },
        data: {
          quota: remainingQuota,
          assignedQuota: 0
        }
      });

      // แก้ไขการอัพเดตอาจารย์ - ใช้ Promise.all แยกต่างหาก
      const professorUpdates = await prisma.invigilator.findMany({
        where: { 
          type: 'อาจารย์', 
          professorId: { not: null } 
        },
        include: { professor: true }
      }).then(professors => 
        professors.map(prof => 
          prisma.invigilator.update({
            where: { id: prof.id },
            data: { 
              quota: baseQuota,  // ต้องระบุ quota
              assignedQuota: 0,
              departmentId: prof.professor?.departmentId
            }
          })
        )
      );

      // รวม transactions ทั้งหมด
      await prisma.$transaction([
        ...professorUpdates,
        staffUpdate,
        // อัพเดทวิชา GenEd (90)
        prisma.schedule.updateMany({
          where: {
            subjectGroup: {
              subject: {
                department: {
                  code: '90'  // เฉพาะวิชาเสรีทั่วไป
                }
              }
            }
          },
          data: {
            isGenEd: true,
            priority: false,
            departmentQuota: Math.ceil(baseQuota * 1.5)  // เพิ่มโควต้าให้วิชา GenEd
          }
        }),

        // อัพเดทวิชาส่วนกลางวิศวะ (00)
        prisma.schedule.updateMany({
          where: {
            subjectGroup: {
              subject: {
                department: {
                  code: '00'  // วิชาส่วนกลางวิศวะ
                }
              }
            }
          },
          data: {
            isGenEd: false,
            priority: false,  // ไม่ใช่ priority แต่จะให้บุคลากรคุมได้
            departmentQuota: baseQuota,  // โควต้าปกติ
            staffPreferred: true  // เพิ่มฟิลด์ใหม่เพื่อมาร์กว่าควรให้บุคลากรคุม
          }
        }),

        // อัพเดทวิชาของภาควิชาอื่นๆ
        prisma.schedule.updateMany({
          where: {
            subjectGroup: {
              subject: {
                department: {
                  NOT: {
                    code: {
                      in: ['90', '00']
                    }
                  }
                }
              }
            }
          },
          data: {
            priority: true,
            isGenEd: false,
            departmentQuota: baseQuota,
            staffPreferred: false
          }
        })
      ]);

      console.log('Debug values:', {
        totalSchedules: scheduleStats._count,
        totalInvigilators,
        baseQuota,
        remainingQuota
      });

      return NextResponse.json({
        message: 'Successfully seeded data',
        stats: {
          totalSchedules: scheduleStats._count,
          totalInvigilators,
          baseQuota,
          remainingQuota
        }
      });

    } catch (error) {
      console.error('Error seeding data:', error);
      return NextResponse.json(
        { error: 'Failed to seed data' },
        { status: 500 }
      );
    }
}