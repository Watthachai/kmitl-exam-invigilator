import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';
import { parseExcelFile } from '@/app/lib/excel-wrapper-for-invigilator';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const departmentId = formData.get('departmentId') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    if (!departmentId) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }
    
    // Check file type
    if (!file.name.endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Only .xlsx files are supported' }, { status: 400 });
    }
    
    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId }
    });
    
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    
    // Parse Excel file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const rows = await parseExcelFile(new File([buffer], file.name, { type: file.type }));
    
    // Filter out invalid rows (must have name)
    const validRows = rows.filter(row => row.name);
    
    if (validRows.length === 0) {
      return NextResponse.json({ error: 'No valid data found in file' }, { status: 400 });
    }
    
    // ป้องกันการใช้ transaction ที่นานเกินไปหรือไม่สมบูรณ์
    // โดยใช้วิธีการนำเข้าแบบชุด (batch) แทน
    let imported = 0;
    let skipped = 0;
    
    // เตรียมข้อมูลเพื่อลดการค้นหาซ้ำ
    const existingInvigilators = await prisma.invigilator.findMany({
      where: {
        type: 'บุคลากร',
        departmentId
      },
      select: {
        name: true
      }
    });
    
    // สร้าง Set ของชื่อผู้คุมสอบที่มีอยู่แล้วเพื่อการค้นหาที่รวดเร็ว
    const existingNames = new Set(existingInvigilators.map(inv => inv.name.toLowerCase()));
    
    // ประมวลผลข้อมูลเป็นชุด (batch processing)
    // แบ่งเป็นชุดละ 25 รายการเพื่อไม่ให้ transaction ใหญ่เกินไป
    const BATCH_SIZE = 25;
    
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      
      // ใช้ transaction สำหรับแต่ละชุด
      await prisma.$transaction(async (tx) => {
        for (const row of batch) {
          const normalizedName = String(row.name).trim().toLowerCase();
          
          // ข้ามรายการที่มีอยู่แล้ว (ใช้ Set แทนการค้นหาใน DB ทุกครั้ง)
          if (existingNames.has(normalizedName)) {
            skipped++;
            continue;
          }
          
          // สร้างผู้คุมสอบใหม่
          await tx.invigilator.create({
            data: {
              name: String(row.name).trim(),
              type: 'บุคลากร',
              departmentId,
              quota: 3, // Default quota
            }
          });
          
          // เพิ่มชื่อลงใน Set เพื่อไม่ให้มีการสร้างซ้ำในชุดถัดไป
          existingNames.add(normalizedName);
          imported++;
        }
      });
      
      // รอสักเล็กน้อยระหว่างแต่ละชุดเพื่อลดภาระ
      if (i + BATCH_SIZE < validRows.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return NextResponse.json({ 
      message: 'Invigilators imported successfully',
      imported: imported,
      skipped: skipped,
      total: validRows.length
    });
  } catch (error) {
    console.error("Error importing invigilators:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to import invigilators'
    }, { status: 500 });
  }
}