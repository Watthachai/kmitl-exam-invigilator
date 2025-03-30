import { NextResponse } from "next/server";
import prisma from '@/app/lib/prisma';
import { parseExcelFile } from '@/app/lib/excel-wrapper';

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
    
    // Import data to database
    const result = await prisma.$transaction(async (tx) => {
      const imported = [];
      
      for (const row of validRows) {
        // Check if invigilator with the same name already exists
        const existingInvigilator = await tx.invigilator.findFirst({
          where: {
            name: String(row.name),
            type: 'บุคลากร',
            departmentId
          }
        });
        
        if (existingInvigilator) {
          continue; // Skip if already exists
        }
        
        // Create new invigilator
        const newInvigilator = await tx.invigilator.create({
          data: {
            name: String(row.name ?? ''),
            type: 'บุคลากร',
            departmentId,
            quota: 3, // Default quota
          }
        });
        
        imported.push(newInvigilator);
      }
      
      return imported;
    });
    
    return NextResponse.json({ 
      message: 'Invigilators imported successfully',
      imported: result.length,
      total: validRows.length
    });
  } catch (error) {
    console.error("Error importing invigilators:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to import invigilators'
    }, { status: 500 });
  }
}