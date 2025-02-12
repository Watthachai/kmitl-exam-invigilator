"use client";

import { useEffect } from 'react';
import { NetworkError } from '@/components/network-error';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application Error:', error);
  }, [error]);

  // Check if error is related to network connectivity
  if (error.message.includes('fetch') || error.message.includes('network')) {
    return <NetworkError />;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold">เกิดข้อผิดพลาด</h2>
        <p className="text-gray-600">ขออภัย มีบางอย่างผิดพลาด กรุณาลองใหม่อีกครั้ง</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-500 text-white rounded-md"
        >
          ลองใหม่
        </button>
      </div>
    </div>
  );
}