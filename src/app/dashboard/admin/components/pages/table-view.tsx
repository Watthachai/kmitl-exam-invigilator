'use client';

import { useState } from 'react';
import { parseExcelFile } from '@/app/lib/excel-wrapper';
import { utils as XLSXUtils, write as XLSXWrite } from 'xlsx';
import toast, { Toaster } from 'react-hot-toast';

interface TableRow {
  [key: string]: string | number | null;
}

interface TableData {
  [key: string]: any;
}

const EditableCell = ({ value, onChange }: { value: any; onChange: (value: any) => void }) => {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded"
    />
  );
};

export default function TableImportPage() {
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [editedData, setEditedData] = useState<TableData[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const data = await parseExcelFile(file);
        setTableData(data);
      } catch (error) {
        console.error('Error importing file:', error);
      }
    }
  };

  const handleCellChange = (rowIndex: number, columnName: string, value: any) => {
    const newData = [...editedData];
    newData[rowIndex][columnName] = value;
    setEditedData(newData);
  };

  const handleSaveChanges = () => {
    setTableData(editedData);
    setIsEditing(false);
    toast.success('Changes saved successfully');
  };

  const handleExport = () => {
    try {
      const ws = XLSXUtils.json_to_sheet(tableData);
      const wb = XLSXUtils.book_new();
      XLSXUtils.book_append_sheet(wb, ws, 'Sheet1');
      
      // Generate Excel file
      const excelBuffer = XLSXWrite(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'exported-table.xlsx';
      link.click();
      
      toast.success('Table exported successfully');
    } catch (error) {
      console.error('Error exporting file:', error);
      toast.error('Failed to export table');
    }
  };

  return (
    <div className="p-6">
      <Toaster />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Table Import Page</h1>
        <div className="space-x-2">
          {tableData.length > 0 && (
            <>
              <button
                onClick={() => {
                  setEditedData([...tableData]);
                  setIsEditing(true);
                }}
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
            </>
          )}
        </div>
      </div>
      
      <div className="mb-4">
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
      </div>

      {tableData.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
              <tbody className="bg-white divide-y divide-gray-200">
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

          {isEditing && (
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedData([]);
                }}
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
    </div>
  );
}