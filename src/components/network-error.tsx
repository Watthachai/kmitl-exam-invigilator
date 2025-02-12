"use client";

import { WifiOff, RefreshCcw } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

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

        <div className="flex justify-center"> {/* Added this wrapper div */}
          <Button 
            onClick={() => window.location.reload()}
            variant="default"
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            ลองใหม่อีกครั้ง
          </Button>
        </div>
      </div>
    </div>
  );
}