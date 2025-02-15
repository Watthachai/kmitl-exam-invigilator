"use client";

import { WifiOff } from 'lucide-react';

export function NetworkError() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue/80 backdrop-blur-sm">
      <div className="text-center space-y-6 p-8 max-w-md mx-auto bg-white rounded-xl shadow-lg">
        <div className="flex justify-center">
          <WifiOff className="h-16 w-16 text-[#FF4E00]" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้
          </h2>
          <p className="text-gray-600">
            กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณแล้วลองใหม่อีกครั้ง
          </p>
        </div>

        <div className="flex items-center justify-center space-x-2">
          <div className="w-3 h-3 bg-[#FF4E00] rounded-full animate-bounce" />
          <div className="w-3 h-3 bg-[#FF4E00] rounded-full animate-bounce [animation-delay:0.2s]" />
          <div className="w-3 h-3 bg-[#FF4E00] rounded-full animate-bounce [animation-delay:0.4s]" />
        </div>
      </div>
    </div>
  );
}