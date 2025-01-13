import * as XLSX from 'xlsx';

interface ExcelRow {
  [key: string]: string | number | null;
}

export const parseExcelFile = (file: File): Promise<ExcelRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { 
          type: 'array',
          codepage: 874, // Thai encoding (Windows-874)
        });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          defval: null, // Default value for empty cells
          raw: false // Convert to formatted strings
        }) as ExcelRow[];
        
        resolve(jsonData);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};