'use client';

import React, { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import { parseExcelFile } from '@/app/lib/excel-wrapper';
import { utils as XLSXUtils, write as XLSXWrite } from 'xlsx';
import toast, { Toaster } from 'react-hot-toast';
import ImportProgress from '@/app/components/ui/import-progress';
import { FileUpload } from '@/app/dashboard/admin/components/file-upload'
import { storage } from '@/app/lib/storage';
import { motion, AnimatePresence } from 'framer-motion';

interface TableData {
  [key: string]: string | number | null | boolean;
}

const EditableCell = ({ value, onChange }: { value: string | number | boolean | null; onChange: (value: string) => void }) => {
  // Calculate minimum width based on content length
  const getContentWidth = (content: string) => {
    const minWidth = 120; // Minimum width in pixels
    const charWidth = 8; // Approximate width per character in pixels
    const contentWidth = Math.max(content.length * charWidth, minWidth);
    return `${contentWidth}px`;
  };

  // Get computed width
  const computedWidth = getContentWidth(value?.toString() ?? '');

  return (
    <input
      type="text"
      value={value?.toString() ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="border-rounded border-gray-300 focus:border-blue-500 rounded
        bg-white/90 backdrop-blur-sm
        min-h-[40px]
        transition-all duration-200
        focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        text-sm sm:text-base px-2"
      style={{
        width: computedWidth,
        minWidth: '120px', // Minimum width
        maxWidth: '400px', // Maximum width to prevent too wide cells
      }}
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

// Update storage keys
const STORAGE_KEYS = {
  FILE_NAME: 'lastUploadedFile',
  TABLE_DATA: 'tableData',
  EDITED_DATA: 'editedData', 
  ORIGINAL_DATA: 'originalData',
  IS_EDITING: 'isEditing',
  FILE_CONTENT: 'lastFileContent' // Add key for file content
} as const;

// Replace storage functions
const saveToStorage = (key: string, data: TableData[] | boolean) => storage.set(key, data);
const loadFromStorage = (key: string) => storage.get(key);

export default function TablePage() {
  // Initialize states with stored values
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [editedData, setEditedData] = useState<TableData[]>([]);
  const [originalData, setOriginalData] = useState<TableData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [scheduleDateOption, setScheduleDateOption] = useState<'ช่วงเช้า' | 'ช่วงบ่าย' | null>(null);
  const [showDatePrompt, setShowDatePrompt] = useState(false);
  const [isPending] = useTransition(); // For handling loading states during server actions
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [lastUploadedFile, setLastUploadedFile] = useState('');

  const logQueue = useRef<string[]>([]);
  const isProcessingQueue = useRef<boolean>(false);

  // Add debounced log update
  const updateLogsState = useCallback(() => {
    if (logQueue.current.length > 0 && !isProcessingQueue.current) {
      isProcessingQueue.current = true;
      const nextLogs = [...logQueue.current];
      logQueue.current = [];
      
      setImportLogs(currentLogs => {
        isProcessingQueue.current = false;
        return [...currentLogs, ...nextLogs];
      });
    }
  }, []);

  // Add log processing effect
  useEffect(() => {
    const timer = setInterval(updateLogsState, 100);
    return () => clearInterval(timer);
  }, [updateLogsState]);

  // Add log helper
  const addLog = useCallback((message: string) => {
    logQueue.current.push(message);
    if (!isProcessingQueue.current) {
      updateLogsState();
    }
  }, [updateLogsState]);

  // Update the useEffect for initial data load
  useEffect(() => {
    const init = async () => {
      try {
        // Load saved file name first
        const savedFileName = sessionStorage.getItem('lastUploadedFile') || '';
        setLastUploadedFile(savedFileName);

        // Load saved table data
        const savedTableData = loadFromStorage(STORAGE_KEYS.TABLE_DATA);
        if (savedTableData && savedTableData.length > 0) {
          setTableData(savedTableData);
          
          // Load other related states
          const savedEditedData = loadFromStorage(STORAGE_KEYS.EDITED_DATA);
          const savedOriginalData = loadFromStorage(STORAGE_KEYS.ORIGINAL_DATA); 
          const savedIsEditing = loadFromStorage(STORAGE_KEYS.IS_EDITING);

          if (savedEditedData) setEditedData(savedEditedData);
          if (savedOriginalData) setOriginalData(savedOriginalData);
          if (savedIsEditing) setIsEditing(savedIsEditing);
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
        // Clear potentially corrupted storage
        sessionStorage.removeItem('lastUploadedFile');
        Object.values(STORAGE_KEYS).forEach(key => storage.remove(key));
      }
    };

    init();
  }, []); // Empty dependency array for initial load only

  // Remove the separate sessionStorage useEffect since we handle it in init()

  // Save state changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TABLE_DATA, tableData);
    saveToStorage(STORAGE_KEYS.EDITED_DATA, editedData);
    saveToStorage(STORAGE_KEYS.ORIGINAL_DATA, originalData);
    saveToStorage(STORAGE_KEYS.IS_EDITING, isEditing);
  }, [tableData, editedData, originalData, isEditing]);

  // Update handleFileUpload to handle both file and storage
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const data = await parseExcelFile(file);
        
        if (!data || data.length === 0) {
          throw new Error('No valid data found in file');
        }

        // Save all states
        setTableData(data);
        setEditedData([]);
        setOriginalData([]);
        setIsEditing(false);
        setLastUploadedFile(file.name);

        // Save to storage
        sessionStorage.setItem('lastUploadedFile', file.name);
        saveToStorage(STORAGE_KEYS.TABLE_DATA, data);
        saveToStorage(STORAGE_KEYS.EDITED_DATA, []);
        saveToStorage(STORAGE_KEYS.ORIGINAL_DATA, []);
        saveToStorage(STORAGE_KEYS.IS_EDITING, false);
        
        toast.success(`นำเข้าไฟล์ ${file.name} สำเร็จ!`);
      } catch (error) {
        console.error('Error importing file:', error);
        toast.error('เกิดข้อผิดพลาดในการนำเข้าไฟล์');
        
        // Clear storage on error
        sessionStorage.removeItem('lastUploadedFile');
        setLastUploadedFile('');
        setTableData([]);
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

// Update confirmSaveToDatabase function
const confirmSaveToDatabase = async () => {
  try {
    setIsImporting(true);
    setImportProgress(0);
    addLog('🚀 Starting import process...');

    const dataToSave = isEditing ? editedData : tableData;
    const totalItems = dataToSave.length;
    const chunkSize = 10;
    const totalChunks = Math.ceil(totalItems / chunkSize);
    
    for (let i = 0; i < dataToSave.length; i += chunkSize) {
      const chunk = dataToSave.slice(i, i + chunkSize);
      const currentChunk = Math.floor(i / chunkSize) + 1;
      
      // Update progress with detailed steps
      setImportProgress((currentChunk / totalChunks) * 100);
      
      // Log start of chunk processing
      addLog(`\n📦 Processing Batch ${currentChunk}/${totalChunks}:`);
      addLog(`⏳ Progress: ${Math.floor((currentChunk / totalChunks) * 100)}%`);
      addLog('├── 🔄 Initializing database transaction...');

      // Log department operations
      addLog('├── 🏢 Processing Departments (10%)');
      addLog(`│   ├── Finding department codes...`);
      addLog(`│   └── Upserting department records...`);

      // Log professor operations
      addLog('├── 👥 Processing Professors (30%)');
      addLog(`│   ├── Creating professor records...`);
      addLog(`│   └── Updating invigilator data...`);

      // Log subject operations
      addLog('├── 📚 Processing Subjects (50%)');
      addLog(`│   ├── Upserting subject records...`);
      addLog(`│   └── Linking departments...`);

      // Log room operations
      addLog('├── 🏫 Processing Rooms (70%)');
      addLog(`│   ├── Creating room records...`);
      addLog(`│   └── Updating room data...`);

      // Log schedule creation
      addLog('├── 📅 Creating Schedules (90%)');
      addLog(`│   ├── Validating time slots...`);
      addLog(`│   └── Inserting schedule records...`);

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
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to import batch ${currentChunk}`);
      }

      await response.json();
      
      // Log success for this chunk
      addLog('└── ✅ Batch Complete:');
      addLog(`    ├── Records processed: ${chunk.length}`);
      addLog(`    └── Total progress: ${Math.floor((currentChunk / totalChunks) * 100)}%\n`);
    }

    // Final success state
    setImportProgress(100);
    addLog('\n🎉 Import Summary:');
    addLog(`├── Total records processed: ${totalItems}`);
    addLog(`├── Number of batches: ${totalChunks}`);
    addLog(`└── Final Status: Complete ✨`);
    
    toast.success('Data imported successfully');
    setShowDatePrompt(false);
    setScheduleDateOption(null);
    setSelectedDate(null);
    setIsImporting(false);

  } catch (error) {
    addLog('\n❌ Error Details:');
    addLog(`├── Message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    addLog(`├── Location: Database transaction`);
    addLog(`└── Status: Import halted`);
    toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    setIsImporting(false);
  }
};

const handleClearFile = useCallback(() => {
  // Clear all states
  setLastUploadedFile('');
  setTableData([]);
  setEditedData([]);
  setOriginalData([]);
  setIsEditing(false);
  setImportLogs([]);
  setImportProgress(0);
  setIsImporting(false);
  setShowDatePrompt(false);
  setScheduleDateOption(null);
  setSelectedDate(null);

  // Clear storage
  sessionStorage.removeItem('lastUploadedFile');
  Object.values(STORAGE_KEYS).forEach(key => storage.remove(key));
  
  // Single toast notification
  toast.success('ล้างข้อมูลเรียบร้อย', {
    id: 'clear-file', // Add unique ID to prevent duplicates
    position: 'top-center'
  });
}, []);

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
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 space-y-6 min-h-screen-auto relative"
    >
      <Toaster
      />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">หน้านำเข้าข้อมูลตารางสอบ</h1>
      </div>

      {/* File upload section - Always show when no data */}
      {(!tableData || tableData.length === 0) ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed inset-0 lg:left-64 flex items-center justify-center z-10"
          >
            <div className="absolute inset-0 bg-gray-50/50 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="relative w-auto m-6 p-12 rounded-xl bg-white shadow-lg border-2 border-dashed border-gray-200"
            >
              <FileUpload 
                onFileUpload={(file) => {
                  const mockEvent = {
                    target: { files: [file] }
                  } as unknown as React.ChangeEvent<HTMLInputElement>;
                  handleFileUpload(mockEvent);
                }}
                onClear={handleClearFile}
                defaultFileName={lastUploadedFile}
              />
            </motion.div>
          </motion.div>
        ) : (
        // Show table and controls only when we have data
        <>
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Mobile dropdown menu */}
            <div className="sm:hidden">
              <select 
                onChange={(e) => {
                  switch(e.target.value) {
                    case 'clear': handleClearFile(); break;
                    case 'edit': handleEditClick(); break;
                    case 'export': handleExport(); break;
                    case 'fill': handleFillData(); break;
                    case 'addMissing': addMissingRoomEntries(); break;
                    case 'save': handleSaveToDatabase(); break;
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="">เลือกการทำงาน</option>
                <option value="clear">ล้างข้อมูล</option>
                <option value="edit" disabled={isEditing}>แก้ไขตาราง</option>
                <option value="export">ส่งออกเป็น Excel</option>
                <option value="fill" disabled={!isEditing || editedData.length === 0}>
                  เติมลำดับและรายวิชา
                </option>
                <option value="addMissing">เพิ่มห้องที่ขาด</option>
                <option value="save" disabled={isPending || (isEditing && editedData.length === 0)}>
                  บันทึกลงฐานข้อมูล
                </option>
              </select>
            </div>

            {/* Desktop buttons */}
            <div className="hidden sm:flex flex-wrap items-center gap-2 w-full max-w-[calc(100vw-theme(space.6)*2)] lg:max-w-[calc(100vw-256px-theme(space.6)*2)]">
              {/* File upload wrapper */}
              <div className="flex-grow min-w-[280px] max-w-md">
                <FileUpload 
                  onFileUpload={(file) => {
                    const mockEvent = {
                      target: { files: [file] }
                    } as unknown as React.ChangeEvent<HTMLInputElement>;
                    handleFileUpload(mockEvent);
                  }}
                  onClear={handleClearFile}
                  defaultFileName={lastUploadedFile}
                />
              </div>
              
              {/* Action buttons wrapper */}
              <div className="flex flex-wrap gap-2">
                {tableData.length > 0 && (
                  <button
                    onClick={handleClearFile}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 whitespace-nowrap text-sm"
                  >
                    ล้างข้อมูล
                  </button>
                )}
                <button
                  onClick={() => handleEditClick()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 whitespace-nowrap text-sm"
                  disabled={isEditing}
                >
                  แก้ไขตาราง
                </button>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 whitespace-nowrap text-sm"
                >
                  ส่งออกเป็น Excel
                </button>
                <button
                  onClick={handleFillData}
                  className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 whitespace-nowrap text-sm"
                  disabled={!isEditing || editedData.length === 0}
                >
                  เติมลำดับและรายวิชา
                </button>
                <button
                  onClick={addMissingRoomEntries}
                  className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 whitespace-nowrap text-sm"
                >
                  เพิ่มห้องที่ขาด
                </button>
                <button
                  onClick={handleSaveToDatabase}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 whitespace-nowrap text-sm"
                  disabled={isPending || (isEditing && editedData.length === 0)}
                >
                  บันทึกลงฐานข้อมูล {isPending && <>(กำลังบันทึก...)</>}
                </button>
              </div>
            </div>
          </div>

          {/* Table section with animation */}
          <AnimatePresence>
            {tableData.length > 0 && (
              <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/30 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100 w-full overflow-hidden"
              >
                {/* Table container with controlled height and scroll */}
                <div className="h-[calc(100vh-280px-4rem)] overflow-hidden"> {/* Reduced height to account for fixed buttons */}
                  <div className="h-full overflow-y-auto">
                    <div className="w-full inline-block align-middle">
                      <div className="overflow-x-auto">
                        <table className="w-full table-auto divide-y divide-gray-100">
                          <thead className="bg-white/95 backdrop-blur-sm sticky top-0 z-10">
                            <tr className="border-b border-gray-100">
                              {Object.keys(tableData[0]).map((header) => (
                                <th
                                  key={header}
                                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
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
                                          <div className="min-h-[40px] py-2">
                                          {value?.toString()}
                                          </div>
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
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isEditing && (
            <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/80 backdrop-blur-sm border-t border-gray-200 shadow-lg z-20">
              <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Editing mode active
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 
                      transition-colors duration-200 text-sm font-medium shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 
                      transition-colors duration-200 text-sm font-medium shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Date prompt modal with proper z-index */}
      {showDatePrompt && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
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

      {/* Import progress with proper z-index */}
      {isImporting && (
        <div className="z-50">
          <ImportProgress
            progress={importProgress}
            currentStage={`Importing ${Math.floor(importProgress)}%`}
            logs={importLogs}
          />
        </div>
      )}
    </motion.div>
  );
}