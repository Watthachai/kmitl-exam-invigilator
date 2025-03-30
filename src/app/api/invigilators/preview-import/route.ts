import { NextResponse } from "next/server";
import { parseExcelFile } from '@/app/lib/excel-wrapper-for-invigilator';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Check file type
    if (!file.name.endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Only .xlsx files are supported' }, { status: 400 });
    }
    
    // Parse Excel file to get preview data
    try {
      const preview = await parseExcelFile(file);
      
      // Filter out invalid rows
      const validRows = preview.filter(row => row.name && String(row.name).trim() !== '');
      
      // ส่งกลับข้อมูลตัวอย่าง (จำกัดจำนวนแถวเพื่อป้องกันการตอบสนองที่ใหญ่เกินไป)
      return NextResponse.json({ 
        message: 'File previewed successfully',
        preview: validRows.slice(0, 100), // แสดงไม่เกิน 100 แถว
        totalRows: validRows.length
      });
    } catch (parseError) {
      console.error("Error parsing Excel file:", parseError);
      return NextResponse.json({ 
        error: parseError instanceof Error ? parseError.message : 'Failed to parse Excel file'
      }, { status: 400 });
    }
  } catch (error) {
    console.error("Error previewing file:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to preview file'
    }, { status: 500 });
  }
}