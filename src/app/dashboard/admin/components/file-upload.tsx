import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { storage } from '@/app/lib/storage';

// Add storage keys constant
const STORAGE_KEYS = {
  FILE_NAME: 'lastUploadedFile'
} as const;

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  defaultFileName?: string;
}

export const FileUpload = ({ onFileUpload, defaultFileName = '' }: FileUploadProps) => {
  const [fileName, setFileName] = useState(defaultFileName);

  // Load saved filename on mount
  useEffect(() => {
    const savedFileName = storage.get(STORAGE_KEYS.FILE_NAME);
    if (savedFileName) setFileName(savedFileName);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles?.length > 0) {
      const file = acceptedFiles[0];
      try {
        setFileName(file.name);
        // Save to both storage mechanisms
        storage.set(STORAGE_KEYS.FILE_NAME, file.name);
        sessionStorage.setItem(STORAGE_KEYS.FILE_NAME, file.name);
        onFileUpload(file);
        toast.success(`อัพโหลดไฟล์ ${file.name} สำเร็จ`);
      } catch (error) {
        toast.error('เกิดข้อผิดพลาดในการอัพโหลดไฟล์');
        console.error('File upload error:', error);
      }
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false,
    maxSize: 5242880 // 5MB limit
  });

  return (
    <div className="relative">
      <div
        {...getRootProps()}
        className={`
          flex items-center justify-center gap-3 px-6 py-4
          border-2 border-dashed rounded-lg cursor-pointer
          transition-all duration-200 ease-in-out
          ${fileName ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400'}
          ${isDragActive ? 'border-blue-400 bg-blue-50 scale-105' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <svg 
          className={`w-6 h-6 ${fileName ? 'text-green-500' : 'text-gray-400'}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {fileName ? (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          ) : (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          )}
        </svg>

        <div className="flex flex-col items-center">
          <span className={`text-sm ${fileName ? 'text-green-600' : 'text-gray-600'}`}>
            {fileName 
              ? `ไฟล์ที่เลือก: ${fileName}`
              : 'คลิกหรือลากไฟล์มาวาง'
            }
          </span>
          {!fileName && (
            <span className="text-xs text-gray-400 mt-1">
              รองรับไฟล์ .xlsx และ .xls
            </span>
          )}
        </div>
      </div>
    </div>
  );
};