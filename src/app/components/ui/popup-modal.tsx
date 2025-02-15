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
  isProcessing = false
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
          className={`bg-white rounded-xl shadow-xl max-w-lg w-full mx-auto overflow-hidden ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="p-2 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          </div>

          {/* Modal content */}
          <div className="p-2">
            {children}
          </div>

          {/* Modal footer */}
          <div className="p-2 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
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
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClass}`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}