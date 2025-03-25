import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { storage } from '@/app/lib/storage';

// Add storage keys constant
const STORAGE_KEYS = {
  FILE_NAME: 'lastUploadedFile'
} as const;

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  onClear?: () => void;
  defaultFileName?: string;
}

export const FileUpload = ({ onFileUpload, defaultFileName = '' }: FileUploadProps) => {
  const [fileName, setFileName] = useState(defaultFileName);


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
    <div className="relative w-full">
      <div
        {...getRootProps()}
        className={`
          flex flex-col sm:flex-row items-center justify-center gap-1 p-1
          border-2 border-dashed rounded-xl cursor-pointer
          transition-all duration-300 ease-out
          hover:shadow-lg hover:border-blue-400/50
          ${fileName ? 'border-green-300 bg-green-50/80' : 'border-gray-300'}
          ${isDragActive ? 'border-blue-400 bg-blue-50/80 scale-[1.02] shadow-xl' : ''}
          relative overflow-hidden group
        `}
      >
        <input {...getInputProps()} />
        
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500" />
          <div className="absolute inset-0 bg-grid-pattern" />
        </div>

        {/* Icon Section */}
        <div className={`
          relative w-8 h-8 flex items-center justify-center
          rounded-full transition-all duration-300
          ${fileName ? 'bg-green-100' : 'bg-gray-100'}
          ${isDragActive ? 'scale-110 bg-blue-100' : ''}
          group-hover:scale-110
        `}>
          <svg 
            className={`
              w-5 h-5 transition-all duration-300
              ${fileName ? 'text-green-500' : 'text-gray-400'}
              ${isDragActive ? 'text-blue-500 scale-110' : ''}
              group-hover:scale-110
            `}
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
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <span className={`
            text-base sm:text-lg font-medium transition-colors duration-300
            ${fileName ? 'text-green-600' : 'text-gray-700'}
          `}>
            {fileName 
              ? `ไฟล์ที่เลือก: ${fileName}`
              : 'คลิกหรือลากไฟล์มาวาง'
            }
          </span>
          {!fileName && (
            <span className="text-sm text-gray-400 mt-1">
              รองรับไฟล์ .xlsx และ .xls (ไม่เกิน 5MB)
            </span>
          )}
        </div>


        {/* Progress Indicator for Drag */}
        <div className={`
          absolute bottom-0 left-0 h-1 bg-blue-500
          transition-all duration-300 ease-out
          ${isDragActive ? 'w-full' : 'w-0'}
        `} />
      </div>
    </div>
  );
};