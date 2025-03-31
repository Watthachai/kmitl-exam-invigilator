"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Database, Loader2, RefreshCw, BookOpen, Users, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface QuotaCalculation {
  totalExamRows: number;
  professorCount: number;
  staffCount: number;
  professorQuota: number;
  staffQuota: number;
  remainingQuota: number;
  professorsWithoutInvigilator: number;
  professorsWithInvigilator: number;
}

export default function QuotaCalculatorPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [calculation, setCalculation] = useState<QuotaCalculation | null>(null);
  
  const fetchCalculation = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/quota/calculate');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch calculation');
      }
      
      const calculationData = await response.json();
      setCalculation(calculationData);
    } catch (error) {
      console.error('Error fetching calculation:', error);
      toast.error('ไม่สามารถดึงข้อมูลการคำนวณโควต้าได้');
      setCalculation(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const applyQuotas = async () => {
    try {
      setIsApplying(true);
      const response = await fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotaType: 'proportional' })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to apply quotas');
      }
      
      const resultData = await response.json();
      toast.success('อัพเดทโควต้าสำเร็จ');
      console.log('Quota update result:', resultData);
      
      // รีเฟรชข้อมูลหลังจากอัพเดทโควต้า
      fetchCalculation();
    } catch (error) {
      console.error('Error applying quotas:', error);
      toast.error('เกิดข้อผิดพลาดในการอัพเดทโควต้า');
    } finally {
      setIsApplying(false);
    }
  };
  
  useEffect(() => {
    fetchCalculation();
  }, []);
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">เครื่องคำนวณโควต้า</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchCalculation}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>รีเฟรช</span>
          </button>
          <button
            onClick={applyQuotas}
            disabled={isApplying || isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {isApplying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            <span>บันทึกโควต้า</span>
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-gray-500">กำลังคำนวณโควต้า...</p>
          </div>
        </div>
      ) : calculation ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Database className="w-5 h-5" /> ข้อมูลเบื้องต้น
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">จำนวนแถวสอบทั้งหมด:</dt>
                    <dd className="font-semibold">{calculation.totalExamRows}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">จำนวนอาจารย์ทั้งหมด:</dt>
                    <dd className="font-semibold">{calculation.professorCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">จำนวนบุคลากร:</dt>
                    <dd className="font-semibold">{calculation.staffCount}</dd>
                  </div>
                  <div className="flex justify-between text-xs">
                    <dt className="text-gray-500">อาจารย์ที่มี Invigilator:</dt>
                    <dd className="font-semibold">{calculation.professorsWithInvigilator}</dd>
                  </div>
                  <div className="flex justify-between text-xs">
                    <dt className="text-gray-500">อาจารย์ที่ยังไม่มี Invigilator:</dt>
                    <dd className="font-semibold">{calculation.professorsWithoutInvigilator}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="bg-green-50">
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <BookOpen className="w-5 h-5" /> อาจารย์
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-center mb-3">
                  <div className="text-3xl font-bold text-green-600">{calculation.professorQuota}</div>
                  <div className="text-xs text-gray-500">โควต้าต่ออาจารย์ 1 คน</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium">วิธีคำนวณ:</span> {calculation.totalExamRows} แถวสอบ ÷ {calculation.professorCount} อาจารย์ = {calculation.professorQuota} โควต้า/คน
                  </div>
                </div>
                
                {calculation.professorsWithoutInvigilator > 0 && (
                  <div className="mt-3 bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-sm">
                    <div className="flex items-center gap-2 text-yellow-700 font-medium">
                      <AlertCircle className="w-4 h-4" />
                      <span>พบอาจารย์ที่ยังไม่มี Invigilator</span>
                    </div>
                    <p className="text-gray-600 mt-1">
                      เมื่อกดบันทึก ระบบจะสร้าง Invigilator อัตโนมัติให้อาจารย์ที่มีบัญชีผู้ใช้ในระบบแล้ว ({calculation.professorsWithoutInvigilator} คน)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="bg-purple-50">
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Users className="w-5 h-5" /> บุคลากร
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-center mb-3">
                  <div className="text-3xl font-bold text-purple-600">{calculation.staffQuota}</div>
                  <div className="text-xs text-gray-500">โควต้าต่อบุคลากร 1 คน</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium">จำนวนที่เหลือ:</span> {calculation.remainingQuota} แถวสอบ
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">วิธีคำนวณ:</span> {calculation.remainingQuota} แถวที่เหลือ ÷ {calculation.staffCount || 1} บุคลากร = {calculation.staffQuota} โควต้า/คน
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {calculation.professorsWithoutInvigilator > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-blue-800">
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span>สร้าง Invigilator อัตโนมัติ</span>
              </h3>
              <p className="text-sm">
                ระบบจะสร้าง Invigilator อัตโนมัติให้อาจารย์ที่มีบัญชีผู้ใช้ในระบบแล้ว และยังไม่มี Invigilator จำนวน {calculation.professorsWithoutInvigilator} คน
                เมื่อกดปุ่ม &quot;บันทึกโควต้า&quot; ระบบจะกำหนดโควต้าให้อาจารย์เหล่านี้ด้วยโดยอัตโนมัติ
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="bg-red-50 p-4 rounded-lg text-red-700">
          ไม่สามารถคำนวณโควต้าได้ กรุณาตรวจสอบข้อมูลในระบบ
        </div>
      )}
      
      <div className="bg-blue-50 p-4 rounded-lg text-blue-700 text-sm">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Database className="w-4 h-4" /> วิธีการคำนวณ
        </h3>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>ระบบจะคำนวณโควต้าโดยนำจำนวนแถวสอบทั้งหมดมาหารด้วยจำนวนอาจารย์ <strong>ทั้งหมด</strong> ในตาราง Professor</li>
          <li>โควต้าที่เหลือจากการแบ่งให้อาจารย์จะถูกนำไปแบ่งให้บุคลากร</li>
          <li>อาจารย์ที่ยังไม่มี Invigilator แต่มีบัญชีผู้ใช้ในระบบจะได้รับการสร้าง Invigilator และกำหนดโควต้าอัตโนมัติ</li>
          <li>เมื่อกดบันทึก ระบบจะอัพเดทโควต้าให้ผู้คุมสอบทุกคนตามประเภท</li>
        </ol>
      </div>
    </div>
  );
}