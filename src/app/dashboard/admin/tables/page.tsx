'use client';

import { useState, useTransition } from 'react';
import { parseExcelFile } from '@/app/lib/excel-wrapper';
import { utils as XLSXUtils, write as XLSXWrite } from 'xlsx';
import toast, { Toaster } from 'react-hot-toast';
import ImportProgress from '@/app/components/ui/import-progress';
interface TableData {
  [key: string]: string | number | null;
}

const EditableCell = ({ value, onChange }: { value: string | number | null; onChange: (value: string) => void }) => {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded"
    />
  );
};

const fillSequenceAndSubject = (data: TableData[]) => {
  let currentNumber: number | null = null;
  let currentSubject: string | number | null = null;

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
  // ... existing validation ...

  const stages = {
    INIT: { progress: 0, message: '🚀 Initializing import process...' },
    VALIDATION: { progress: 5, message: '🔍 Validating data structure...' },
    DEPARTMENTS: { progress: 15, message: '🏢 Processing departments...' },
    PROFESSORS: { progress: 30, message: '👨‍🏫 Processing professors...' },
    SUBJECTS: { progress: 45, message: '📚 Creating/updating subjects...' },
    ROOMS: { progress: 60, message: '🏫 Processing rooms...' },
    GROUPS: { progress: 75, message: '👥 Creating subject groups...' },
    SCHEDULES: { progress: 85, message: '📅 Creating exam schedules...' },
    COMPLETE: { progress: 100, message: '✅ Import completed!' }
  };

  try {
    setIsImporting(true);
    setImportProgress(stages.INIT.progress);
    setImportLogs([stages.INIT.message]);
    await new Promise(r => setTimeout(r, 1000));

    // Validation Stage
    setImportStage('Validation');
    setImportProgress(stages.VALIDATION.progress);
    setImportLogs(prev => [...prev, stages.VALIDATION.message]);
    await new Promise(r => setTimeout(r, 1000));

    // Process each record
    const dataToSave = isEditing ? editedData : tableData;
    const chunkSize = 5;
    
    for (let i = 0; i < dataToSave.length; i += chunkSize) {
      const chunk = dataToSave.slice(i, i + chunkSize);
      
      // Department Processing
      setImportStage('Processing Departments');
      setImportProgress(stages.DEPARTMENTS.progress);
      setImportLogs(prev => [...prev, `${stages.DEPARTMENTS.message} (${i + 1}-${Math.min(i + chunkSize, dataToSave.length)})`]);
      await new Promise(r => setTimeout(r, 800));

      // Professor Processing
      setImportStage('Processing Professors');
      setImportProgress(stages.PROFESSORS.progress);
      setImportLogs(prev => [...prev, `${stages.PROFESSORS.message} (${i + 1}-${Math.min(i + chunkSize, dataToSave.length)})`]);
      await new Promise(r => setTimeout(r, 800));

      // Subject Processing
      setImportStage('Processing Subjects');
      setImportProgress(stages.SUBJECTS.progress);
      setImportLogs(prev => [...prev, `${stages.SUBJECTS.message} (${i + 1}-${Math.min(i + chunkSize, dataToSave.length)})`]);
      await new Promise(r => setTimeout(r, 800));

      // Room Processing
      setImportStage('Processing Rooms');
      setImportProgress(stages.ROOMS.progress);
      setImportLogs(prev => [...prev, `${stages.ROOMS.message} (${i + 1}-${Math.min(i + chunkSize, dataToSave.length)})`]);
      await new Promise(r => setTimeout(r, 800));

      // Group Processing
      setImportStage('Creating Groups');
      setImportProgress(stages.GROUPS.progress);
      setImportLogs(prev => [...prev, `${stages.GROUPS.message} (${i + 1}-${Math.min(i + chunkSize, dataToSave.length)})`]);
      await new Promise(r => setTimeout(r, 800));

      // Schedule Creation
      setImportStage('Creating Schedules');
      setImportProgress(stages.SCHEDULES.progress);
      setImportLogs(prev => [...prev, `${stages.SCHEDULES.message} (${i + 1}-${Math.min(i + chunkSize, dataToSave.length)})`]);
      
      // Actual API call
      const response = await fetch('/api/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: chunk,
          scheduleOption: scheduleDateOption,
          examDate: selectedDate ? selectedDate.toISOString() : null
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to import chunk ${i + 1}-${Math.min(i + chunkSize, dataToSave.length)}`);
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    // Complete
    setImportStage('Complete');
    setImportProgress(stages.COMPLETE.progress);
    setImportLogs(prev => [...prev, stages.COMPLETE.message]);
    await new Promise(r => setTimeout(r, 1000));

    toast.success('Data imported successfully');
    setShowDatePrompt(false);
    setScheduleDateOption(null);
    setSelectedDate(null);
    setIsImporting(false);

  } catch (error) {
    setImportLogs(prev => [...prev, `❌ Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`]);
    toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    setIsImporting(false);
  }
};

  const cancelSaveToDatabase = () => {
    setShowDatePrompt(false);
    setScheduleDateOption(null);
  };


  return (
    <div className="p-6 space-y-6">
      <Toaster />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Table Import Page</h1>
        <div className="space-x-2">
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          {tableData.length > 0 && (
            <>
              <button
                onClick={() => handleEditClick()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                disabled={isEditing}
              >
                Edit Table
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Export to Excel
              </button>
              <button
                onClick={handleFillData}
                className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
                disabled={!isEditing || editedData.length === 0}
              >
                Fill Sequence & Subject
              </button>
              <button
                onClick={handleSaveToDatabase}
                className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
                disabled={isPending || (isEditing && editedData.length === 0) || (!isEditing && tableData.length === 0)}
              >
                Save to Database {isPending && <>(Saving...) </>}
              </button>
            </>
          )}
        </div>
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
                  {(isEditing ? editedData : tableData).map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {Object.entries(row).map(([key, value], cellIndex) => (
                        <td key={`${rowIndex}-${cellIndex}`} className="px-6 py-4 whitespace-nowrap">
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
                  ))}
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
            <h2 className="text-lg font-bold">Select Schedule Options</h2>
            
            {/* Add Date Picker */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Date
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
                Select Time Slot
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="ช่วงเช้า"
                    checked={scheduleDateOption === 'ช่วงเช้า'}
                    onChange={() => setScheduleDateOption('ช่วงเช้า')}
                  />
                  <span>ช่วงเช้า Schedule</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="ช่วงบ่าย"
                    checked={scheduleDateOption === 'ช่วงบ่าย'}
                    onChange={() => setScheduleDateOption('ช่วงบ่าย')}
                  />
                  <span>ช่วงบ่าย Schedule</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={cancelSaveToDatabase}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveToDatabase}
                disabled={!selectedDate || !scheduleDateOption}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
              >
                Confirm
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