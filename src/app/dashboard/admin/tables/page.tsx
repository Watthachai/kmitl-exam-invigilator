'use client';

import React, { useState } from 'react';
import { parseExcelFile } from '@/app/lib/excel-wrapper';

export default function TableManagerPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadMessage('Please select an Excel file.');
      return;
    }

    try {
      const jsonData = await parseExcelFile(selectedFile);
      console.log('Parsed Excel Data:', jsonData); // You can see the parsed data in the console

      // Send the jsonData to your API route
      const response = await fetch('/api/import-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
      });

      const result = await response.json();
      setUploadMessage(result.message || 'Data import initiated.');
      console.log('API Response:', result);

    } catch (error: any) {
      console.error('Error processing Excel file:', error);
      setUploadMessage(`Error processing file: ${error.message}`);
    }
  };

  return (
    <div>
      <h1>Table Manager</h1>
      <p>Manage tables here.</p>

      <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!selectedFile}>
        Upload Excel Data
      </button>

      {uploadMessage && <p>{uploadMessage}</p>}
    </div>
  );
}