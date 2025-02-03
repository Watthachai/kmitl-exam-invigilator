'use client';

import React, { useState, useTransition, useCallback } from 'react';
import { parseExcelFile } from '@/app/lib/excel-wrapper';
import { utils as XLSXUtils, write as XLSXWrite } from 'xlsx';
import toast, { Toaster } from 'react-hot-toast';
import ImportProgress from '@/app/components/ui/import-progress';
import { useDropzone } from 'react-dropzone';

interface TableData {
  [key: string]: string | number | null | boolean;
}

const EditableCell = ({ value, onChange }: { value: string | number | boolean | null; onChange: (value: string) => void }) => {
  return (
    <input
      type="text"
      value={value?.toString() ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded"
    />
  );
};

const fillSequenceAndSubject = (data: TableData[]) => {
  let currentNumber: number | null = null;
  let currentSubject: string | number | boolean | null = null;

  return data.map((row, index) => {
    const sequenceNum = Number(row["ลำดับ"]);
    if (row["ลำดับ"] && !isNaN(sequenceNum) && sequenceNum > 0) {
      currentNumber = sequenceNum;
      console.log(`Found number: ${currentNumber} at row ${index}`);
    }

    if (row["วิชา"] && row["วิชา"].toString().trim() !== '') {
      currentSubject = row["วิชา"];
      console.log(`Found subject: ${currentSubject} at row ${index}`);
    }

    if (currentNumber !== null || currentSubject !== null) {
      return {
        ...row,
        "ลำดับ": currentNumber || row["ลำดับ"],
        "วิชา": currentSubject || row["วิชา"]
      };
    }

    return row;
  });
};

const FileUpload = ({ onFileUpload }: { onFileUpload: (file: File) => void }) => {
  // Add state persistence
  const [fileName, setFileName] = useState<string>(() => {
    // Check if we have a stored filename
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('lastUploadedFile');
      return stored || '';
    }
    return '';
  });
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles?.length > 0) {
      const file = acceptedFiles[0];
      // Store filename in state and session
      setFileName(file.name);
      sessionStorage.setItem('lastUploadedFile', file.name);
      onFileUpload(file);
      toast.success(`อัพโหลดไฟล์ ${file.name} สำเร็จ`);
    }
  }, [onFileUpload]);

  // Rest of the component remains the same
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  return (
    <div className="relative">
      <div {...getRootProps()} className={`
        flex items-center gap-3 px-4 py-2
        border-2 border-dashed rounded-lg cursor-pointer
        transition-all duration-200
        ${fileName ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
        ${isDragActive ? 'border-blue-400 bg-blue-50 scale-102' : ''}
      `}>
        <input {...getInputProps()} />
        
        <svg 
          className={`w-5 h-5 ${fileName ? 'text-green-500' : 'text-gray-400'}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {fileName ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          )}
        </svg>

        <span className={`text-sm ${fileName ? 'text-green-600' : 'text-gray-600'}`}>
          {fileName 
            ? `ไฟล์ที่เลือก: ${fileName}`
            : 'คลิกหรือลากไฟล์มาวาง (.xlsx, .xls)'}
        </span>
      </div>

      {isDragActive && (
        <div className="fixed inset-0 bg-blue-500/10 backdrop-blur-sm z-50 pointer-events-none">
          <div className="flex items-center justify-center h-full">
            <div className="bg-white p-6 rounded-lg shadow-xl border-2 border-blue-500 border-dashed animate-pulse">
              <div className="text-xl text-blue-500 flex items-center gap-2">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                วางไฟล์ที่นี่
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function TablePage() {
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [editedData, setEditedData] = useState<TableData[]>([]);
  const [originalData, setOriginalData] = useState<TableData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [scheduleDateOption, setScheduleDateOption] = useState<'ช่วงเช้า' | 'ช่วงบ่าย' | null>(null);
  const [showDatePrompt, setShowDatePrompt] = useState(false);
  const [isPending] = useTransition(); // For handling loading states during server actions
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStage, setImportStage] = useState('');
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const data = await parseExcelFile(file);
        setTableData(data);
        toast.success('Excel file imported successfully!');
      } catch (error) {
        console.error('Error importing file:', error);
        toast.error('Error importing file');
      }
    }
  };

  const handleSaveChanges = () => {
    const savedData = [...editedData];
    setTableData(savedData);
    setIsEditing(false);
    toast.success('Changes saved successfully');
  };

  const handleExport = () => {
    try {
      const currentData = isEditing ? editedData : tableData;
      const ws = XLSXUtils.json_to_sheet(currentData);
      const wb = XLSXUtils.book_new();
      XLSXUtils.book_append_sheet(wb, ws, 'ข้อมูลตารางสอบ');
      const excelBuffer = XLSXWrite(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ช้อมูลตารางสอบทั้งหมด.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Table exported successfully');
    } catch (error) {
      console.error('Error exporting file:', error);
      toast.error('Failed to export table');
    }
  };

  const handleFillData = () => {
    const filledData = fillSequenceAndSubject([...editedData]);
    setEditedData(filledData);
    setTableData(filledData);
    console.log('Updated data:', filledData);
    toast.success('Data filled successfully');
  };

  const handleCellChange = (rowIndex: number, key: string, newValue: string) => {
    const updatedData = [...editedData];
    updatedData[rowIndex] = {
      ...updatedData[rowIndex],
      [key]: newValue
    };
    setEditedData(updatedData);
  };

  const handleEditClick = () => {
    setOriginalData([...tableData]);
    setEditedData([...tableData]);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setTableData([...originalData]);
    setEditedData([]);
    setOriginalData([]);
    setIsEditing(false);
  };

  const handleSaveToDatabase = () => {
    if (editedData.length === 0) {
      toast.error('No data to save to the database.');
      return;
    }
    setShowDatePrompt(true);
  };

// Update existing confirmSaveToDatabase function
const confirmSaveToDatabase = async () => {
  const stages = {
    INIT: { progress: 0, message: '🚀 Starting import...' },
    PROCESSING: { progress: 20, message: '📝 Processing records...' },
    DATA_IMPORT: { progress: 40, message: '💾 Importing data...' },
    SAVING: { progress: 70, message: '📥 Saving to database...' },
    COMPLETE: { progress: 100, message: '✅ Import complete!' }
  };

  try {
    setIsImporting(true);
    setImportProgress(stages.INIT.progress);
    setImportLogs([stages.INIT.message]);
    
    // Process records in larger chunks
    const dataToSave = isEditing ? editedData : tableData;
    const chunkSize = 10; // Increased chunk size
    
    for (let i = 0; i < dataToSave.length; i += chunkSize) {
      const chunk = dataToSave.slice(i, i + chunkSize);
      const currentProgress = Math.min(70, Math.floor((i / dataToSave.length) * 50) + 20);
      
      setImportStage('Processing & Saving');
      setImportProgress(currentProgress);
      setImportLogs(prev => [...prev, 
        `📊 Processing batch ${Math.floor(i/chunkSize) + 1}/${Math.ceil(dataToSave.length/chunkSize)}`
      ]);

      // API call
      const response = await fetch('/api/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: chunk,
          scheduleOption: scheduleDateOption,
          examDate: selectedDate?.toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to import batch ${Math.floor(i/chunkSize) + 1}`);
      }

      await new Promise(r => setTimeout(r, 300)); // Reduced delay
    }

    // Complete
    setImportStage('Complete');
    setImportProgress(100);
    setImportLogs(prev => [...prev, stages.COMPLETE.message]);
    
    toast.success('Data imported successfully');
    setShowDatePrompt(false);
    setScheduleDateOption(null);
    setSelectedDate(null);
    setIsImporting(false);

  } catch (error) {
    setImportLogs(prev => [...prev, `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    setIsImporting(false);
  }
};

  const cancelSaveToDatabase = () => {
    setShowDatePrompt(false);
    setScheduleDateOption(null);
  };

  // Update addMissingRoomEntries function to group rows
const addMissingRoomEntries = () => {
  const roomCount: Record<string, number> = {};
  const systemGeneratedRows: TableData[] = [];
  
  // First pass: count rooms and mark existing rows
  const newData = tableData.map(row => {
    const room = row["ห้อง"]?.toString();
    if (room) {
      roomCount[room] = (roomCount[room] || 0) + 1;
    }
    return row;
  });

  // Second pass: create system generated rows
  Object.entries(roomCount).forEach(([room, count]) => {
    if (count < 2) {
      const existingRow = tableData.find(row => row["ห้อง"]?.toString() === room);
      if (existingRow) {
        const existingNote = existingRow["หมายเหตุ"]?.toString() || '';
        systemGeneratedRows.push({
          ...existingRow,
          "หมายเหตุ": existingNote ? `${existingNote}, เพิ่มแถวโดยระบบ` : "เพิ่มแถวโดยระบบ"
        });
      }
    }
  });

  // Combine original and system generated rows
  setTableData([...newData, ...systemGeneratedRows]);
  toast.success("เพิ่มแถวที่ขาดเรียบร้อยแล้ว!");
};


  return (
    <div className="p-6 space-y-6 min-h-screen">
      <Toaster />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">หน้านำเข้าข้อมูลตารางสอบ</h1>
        
        {/* Move FileUpload to center when no data */}
        {tableData.length === 0 ? (
          <div className="fixed inset-0 flex items-center justify-center">
            <div className="w-[600px] p-12 rounded-xl bg-white/50 backdrop-blur-sm shadow-lg border-2 border-dashed border-gray-200">
              <FileUpload 
                onFileUpload={(file) => handleFileUpload({ target: { files: [file] } } as any)} 
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <FileUpload 
              onFileUpload={(file) => handleFileUpload({ target: { files: [file] } } as any)} 
            />
            {tableData.length > 0 && (
              <>
                <button
                  onClick={() => handleEditClick()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  disabled={isEditing}
                >
                  แก้ไขตาราง
                </button>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  ส่งออกเป็น Excel
                </button>
                <button
                  onClick={handleFillData}
                  className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
                  disabled={!isEditing || editedData.length === 0}
                >
                  เติมลำดับและรายวิชา
                </button>
                
                <button
                  onClick={addMissingRoomEntries}
                  className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                >
                  เพิ่มห้องที่ขาด
                </button>

                <button
                  onClick={handleSaveToDatabase}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
                  disabled={isPending || (isEditing && editedData.length === 0) || (!isEditing && tableData.length === 0)}
                >
                  บันทึกลงฐานข้อมูล {isPending && <>(กำลังบันทึก...) </>}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {tableData.length > 0 && (
        <>
          <div className="bg-white/30 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100">
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full border-collapse">
                <thead className="bg-white/95 backdrop-blur-sm sticky top-0 z-10">
                  <tr className="border-b border-gray-100">
                    {Object.keys(tableData[0]).map((header) => (
                      <th
                        key={header}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(isEditing ? editedData : tableData).map((row, rowIndex) => {
                    const isSystemGenerated = row["หมายเหตุ"]?.toString().includes("เพิ่มแถวโดยระบบ");
                    const isPreviousSystemGenerated = rowIndex > 0 && 
                      tableData[rowIndex-1]["หมายเหตุ"]?.toString().includes("เพิ่มแถวโดยระบบ");
                  
                    return (
                      <React.Fragment key={`row-${rowIndex}`}>
                        <tr 
                          className={`relative ${
                            isSystemGenerated 
                              ? "bg-yellow-100 border-t-2 border-orange-300" 
                              : isPreviousSystemGenerated 
                                ? "bg-yellow-50 border-b-2 border-orange-300"
                                : ""
                          }`}
                        >
                          {Object.entries(row).map(([key, value], cellIndex) => (
                            <td key={`cell-${rowIndex}-${cellIndex}`} className="px-6 py-4 whitespace-nowrap">
                              {isSystemGenerated && cellIndex === 0 && (
                                <div className="absolute -left-1 top-1 -translate-y-1/2">
                                  <div className="bg-orange-400 text-white text-xs px-2 py-1 rounded-r shadow-sm">
                                    เพิ่มแถวโดยระบบ ↓
                                  </div>
                                </div>
                              )}
                              {isEditing ? (
                                <EditableCell
                                  value={value}
                                  onChange={(newValue) => handleCellChange(rowIndex, key, newValue)}
                                />
                              ) : (
                                value
                              )}
                            </td>
                          ))}
                        </tr>
                        {isSystemGenerated && (
                          <tr key={`separator-${rowIndex}`} className="h-1 bg-gradient-to-r from-orange-200 to-transparent" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {isEditing && (
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Save Changes
              </button>
            </div>
          )}
        </>
      )}

      {showDatePrompt && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center">
          <div className="bg-white rounded-lg p-8 max-w-sm space-y-4">
            <h2 className="text-lg font-bold">เลือกตัวเลือกตารางสอบ</h2>
            
            {/* Add Date Picker */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                เลือกวันที่
              </label>
              <input
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                required
              />
            </div>

            {/* Existing Time Options */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                เลือกช่วงเวลา
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="ช่วงเช้า"
                    checked={scheduleDateOption === 'ช่วงเช้า'}
                    onChange={() => setScheduleDateOption('ช่วงเช้า')}
                  />
                  <span>ช่วงเช้า</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="ช่วงบ่าย"
                    checked={scheduleDateOption === 'ช่วงบ่าย'}
                    onChange={() => setScheduleDateOption('ช่วงบ่าย')}
                  />
                  <span>ช่วงบ่าย</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={cancelSaveToDatabase}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmSaveToDatabase}
                disabled={!selectedDate || !scheduleDateOption}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {isImporting && (
        <ImportProgress
          progress={importProgress}
          currentStage={importStage}
          logs={importLogs}
        />
      )}
    </div>
  );
}