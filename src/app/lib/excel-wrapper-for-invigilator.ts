import * as XLSX from 'xlsx';

interface ExcelRow {
  name: string;
  email?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export async function parseExcelFile(file: File): Promise<ExcelRow[]> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Parsing Excel file:', file.name, file.type, file.size);
      
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Read Excel file with options to handle errors
      const workbook = XLSX.read(buffer, { 
        type: 'buffer',
        cellDates: true,
        cellNF: false,
        cellText: false
      });
      
      console.log('Workbook loaded, sheet names:', workbook.SheetNames);
      
      // Check if workbook has sheets
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        reject(new Error('Excel file has no sheets'));
        return;
      }
      
      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        reject(new Error('Excel sheet is empty'));
        return;
      }
      
      // แสดงคอลัมน์ที่มีในไฟล์ (เพื่อการดีบัก)
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      const headerRow: { [key: number]: string } = {};
      
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
        const cellValue = worksheet[cellAddress]?.v;
        
        if (cellValue) {
          headerRow[C] = cellValue;
        }
      }
      
      console.log('Header row columns:', headerRow);
      
      // Convert to JSON with options to handle raw values
      const rawData = XLSX.utils.sheet_to_json<Record<string, string | number | boolean | null | undefined>>(worksheet, {
        raw: false,         // สตริงข้อความแทนที่จะใช้ค่าคำนวณหรือสูตร
        defval: '',         // ค่าเริ่มต้นสำหรับเซลล์ที่ว่าง
        header: 'A'         // ใช้ตัวอักษรคอลัมน์เป็นชื่อคอลัมน์
      });
      
      console.log('Raw data sample:', rawData.slice(0, 2), 'Total rows:', rawData.length);
      
      // ตัด row แรกออก (ข้ามรายการแรกซึ่งเป็นหัวคอลัมน์)
      const dataWithoutHeader = rawData.slice(1);
      
      console.log('Data without header, rows:', dataWithoutHeader.length);
      
      // เพิ่มฟังก์ชันทำความสะอาดข้อความ
      function cleanText(text: string | number | boolean | null | undefined): string {
        if (text === null || text === undefined) return '';
        
        // แปลงเป็น string
        const str = String(text).trim();
        
        // ลบช่องว่างซ้ำซ้อน
        return str.replace(/\s+/g, ' ');
      }

      // แก้ไขส่วนประมวลผลข้อมูล
      const processedData = dataWithoutHeader.map((row, index) => {
        // For debugging first few rows
        if (index < 3) {
          console.log('Processing row:', row);
        }
        
        // Get values from columns by their position in Excel (A, B, C, etc.)
        const nameFirst = cleanText(row['C']);
        const nameLast = cleanText(row['D']);
        
        // Combine first and last name
        let fullName = '';
        
        if (nameFirst && nameLast) {
          fullName = `${nameFirst} ${nameLast}`;
        } else if (nameFirst) {
          fullName = nameFirst;
        } else if (nameLast) {
          fullName = nameLast;
        }
        
        // Try alternate column names if the above method fails
        if (!fullName) {
          // Try to find values from all columns
          for (const [key, value] of Object.entries(row)) {
            // Skip empty values and unnecessary columns
            if (!value || key === 'A' || key === 'B') continue;
            
            const cleanValue = cleanText(value);
            if (!cleanValue) continue;
            
            if (!fullName) {
              fullName = cleanValue;
            } else {
              // If we already have a name, this could be the last name
              fullName += ' ' + cleanValue;
              break;
            }
          }
        }
        
        // ตรวจสอบข้อความที่ไม่ควรนำมาใช้เป็นชื่อ
        const excludedTerms = ['ลำดับที่', 'ลำดับ', 'รายชื่อ', 'ชื่อ-นามสกุล', 'ชื่อ', 'นามสกุล'];
        if (excludedTerms.some(term => fullName.includes(term))) {
          return { name: '' };
        }
        
        // ตรวจสอบว่าชื่อมีตัวเลขนำหน้าหรือไม่ (เช่น "1. ชื่อ นามสกุล")
        // และลบตัวเลขออกถ้ามี
        const numericPrefix = fullName.match(/^\d+[\s.)]+(.*)/);
        if (numericPrefix && numericPrefix[1]) {
          fullName = numericPrefix[1].trim();
        }
        
        return { 
          name: fullName,
          email: '' // อาจจะเพิ่ม logic สำหรับอีเมลในอนาคต
        };
      });
      
      // Filter out empty rows
      const validData = processedData.filter(row => row.name && row.name.trim() !== '');
      
      console.log('Processed data, valid rows:', validData.length);
      
      resolve(validData);
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      reject(error);
    }
  });
}