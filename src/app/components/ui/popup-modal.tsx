"use client";

import { useEffect } from 'react';
import { motion } from 'framer-motion';

interface PopupModalProps {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmText: string;
  children: React.ReactNode;
  className?: string;
  confirmButtonClass?: string;
  cancelButtonClass?: string;
  isProcessing?: boolean;
  maxWidth?: string;
  confirmIcon?: React.ReactNode; // Add this prop
}

interface PopupModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmIcon?: React.ReactNode;
  maxWidth?: string;
  confirmDisabled?: boolean;
}

export default function PopupModal({
  title,
  onClose,
  onConfirm,
  confirmText,
  children,
  className,
  confirmButtonClass,
  cancelButtonClass,
  isProcessing = false,
  maxWidth = 'lg', // Default to lg
  confirmIcon, // Add this prop
}: PopupModalProps) {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, isProcessing]);

  // Generate the max-width class dynamically
  const getMaxWidthClass = () => {
    const sizes = {
      'sm': 'max-w-sm',
      'md': 'max-w-md',
      'lg': 'max-w-lg',
      'xl': 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      '4xl': 'max-w-4xl',
      '5xl': 'max-w-5xl',
      '6xl': 'max-w-6xl',
      '7xl': 'max-w-7xl',
      'full': 'max-w-full',
    };
    
    return sizes[maxWidth as keyof typeof sizes] || 'max-w-lg';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] m-0"
    >
      {/* Backdrop with blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !isProcessing && onClose()}
      />

      {/* Modal Content */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`bg-white rounded-xl shadow-xl ${getMaxWidthClass()} w-full mx-auto overflow-hidden flex flex-col max-h-[90vh] ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            <button 
              onClick={onClose}
              disabled={isProcessing}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal content - with overflow handling */}
          <div className="p-4 overflow-auto flex-grow">
            {children}
          </div>

          {/* Modal footer */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className={`px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors 
                disabled:opacity-50 disabled:cursor-not-allowed ${cancelButtonClass}`}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing}
              className={`px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${confirmButtonClass}`}
            >
              {confirmIcon && confirmIcon}
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}