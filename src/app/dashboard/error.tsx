// src/app/error.tsx
'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCcw, Home, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();
    
    useEffect(() => {
        console.error('Error details:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
            <div className="w-full max-w-2xl p-8 mx-4">
                {/* Error Card */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-red-50 p-6 border-b border-red-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-100 rounded-full">
                                <AlertCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-red-600">
                                    ระบบพบข้อผิดพลาด
                                </h2>
                                <p className="text-red-600/80 mt-1">
                                    กรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Error Details */}
                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <h3 className="font-medium text-gray-700 mb-2">รายละเอียดข้อผิดพลาด:</h3>
                                <p className="text-gray-600 font-mono text-sm">
                                    {error.message || 'ไม่พบรายละเอียดข้อผิดพลาด'}
                                </p>
                            </div>
                            
                            {error.digest && (
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <h3 className="font-medium text-gray-700 mb-2">รหัสข้อผิดพลาด:</h3>
                                    <code className="text-sm font-mono text-gray-600">
                                        {error.digest}
                                    </code>
                                </div>
                            )}
                        </div>

                        {/* KMITL Logo */}
                        <div className="flex justify-center py-4">
                            <div className="w-64 h-64 relative opacity-50">
                                <Image
                                    src="/kmitl-fight-logo.png"
                                    alt="KMITL Logo"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="flex-1 px-4 py-3 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <Home className="w-4 h-4" />
                                กลับสู่หน้าหลัก
                            </button>
                            <button
                                onClick={() => router.back()}
                                className="flex-1 px-4 py-3 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                ย้อนกลับ
                            </button>
                            <button
                                onClick={reset}
                                className="flex-1 px-4 py-3 flex items-center justify-center gap-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                <RefreshCcw className="w-4 h-4" />
                                ลองใหม่อีกครั้ง
                            </button>
                        </div>
                    </div>
                </div>

                {/* Help Text */}
                <p className="text-center text-gray-500 text-sm mt-6">
                    หากยังพบปัญหา กรุณาติดต่อ{' '}
                    <a href="mailto:support@example.com" className="text-blue-500 hover:underline">
                        ฝ่ายสนับสนุน
                    </a>
                </p>
            </div>
        </div>
    );
}