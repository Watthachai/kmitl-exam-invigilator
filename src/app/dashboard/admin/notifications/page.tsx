'use client';

import { useState, useEffect } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { FiMail, FiSend, FiUsers, FiCalendar, FiPieChart, FiFilter } from 'react-icons/fi';
import PopupModal from '@/app/components/ui/popup-modal';

export default function EmailNotificationsPage() {
  interface Department {
    id: string;
    name: string;
  }

  const [departments, setDepartments] = useState<Department[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkEmailConfig, setBulkEmailConfig] = useState({
    type: 'schedule',
    departmentId: '',
    invigilatorType: '',
    emailFilter: 'kmitl', // เพิ่มตัวเลือกนี้
  });
  
  useEffect(() => {
    fetchDepartments();
  }, []);
  
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      toast.error('ไม่สามารถโหลดข้อมูลภาควิชาได้');
    }
  };
  
  const handleSendBulkEmails = async () => {
    try {
      setIsSending(true);
      
      const response = await fetch('/api/notifications/bulk-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: bulkEmailConfig.type,
          filters: {
            departmentId: bulkEmailConfig.departmentId || undefined,
            type: bulkEmailConfig.invigilatorType || undefined,
            emailFilter: bulkEmailConfig.emailFilter || undefined // เพิ่มตัวกรองอีเมล
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send emails');
      }
      
      const data = await response.json();
      toast.success(`ส่งอีเมลสำเร็จ ${data.results.success} จาก ${data.results.total} รายการ`);
      setShowBulkModal(false);
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send emails');
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <div className="p-6 space-y-6">
      <Toaster />
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">ระบบแจ้งเตือนทางอีเมล</h1>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          onClick={() => setShowBulkModal(true)}
        >
          <span className="flex items-center gap-2">
            <FiMail className="w-4 h-4" />
            ส่งอีเมลแบบกลุ่ม
          </span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <FiCalendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">แจ้งเตือนตารางสอบ</h2>
              <p className="text-gray-600 text-sm">ส่งอีเมลแจ้งเตือนตารางสอบให้กับผู้คุมสอบ</p>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            ระบบจะส่งอีเมลแจ้งเตือนตารางสอบพร้อมรายละเอียดห้องสอบและเวลาสอบให้กับผู้คุมสอบที่เลือก
          </p>
          
          <button 
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            onClick={() => {
              setBulkEmailConfig({...bulkEmailConfig, type: 'schedule'});
              setShowBulkModal(true);
            }}
          >
            ส่งอีเมลแจ้งเตือนตารางสอบ
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <FiPieChart className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">แจ้งเตือนโควต้าคุมสอบ</h2>
              <p className="text-gray-600 text-sm">ส่งอีเมลแจ้งเตือนโควต้าคุมสอบให้กับผู้คุมสอบ</p>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            ระบบจะส่งอีเมลแจ้งเตือนโควต้าคุมสอบทั้งหมด โควต้าที่ใช้ไปแล้ว และโควต้าที่เหลือให้กับผู้คุมสอบ
          </p>
          
          <button 
            className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            onClick={() => {
              setBulkEmailConfig({...bulkEmailConfig, type: 'quota'});
              setShowBulkModal(true);
            }}
          >
            ส่งอีเมลแจ้งเตือนโควต้า
          </button>
        </div>
      </div>
      
      {showBulkModal && (
        <PopupModal
          title={`ส่งอีเมลแจ้งเตือน${bulkEmailConfig.type === 'schedule' ? 'ตารางสอบ' : 'โควต้า'}แบบกลุ่ม`}
          onClose={() => setShowBulkModal(false)}
          onConfirm={handleSendBulkEmails}
          confirmText={isSending ? "กำลังส่ง..." : "ส่งอีเมล"}
          confirmIcon={<FiSend className="w-4 h-4" />}
          isProcessing={isSending}
        >
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-1">
                  <FiFilter className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">กรองผู้รับอีเมล</h4>
                  <p className="text-sm text-gray-600">
                    เลือกเงื่อนไขในการกรองผู้รับอีเมล คุณสามารถเลือกตามภาควิชาและประเภทผู้คุมสอบได้
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ภาควิชา</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={bulkEmailConfig.departmentId}
                  onChange={e => setBulkEmailConfig({...bulkEmailConfig, departmentId: e.target.value})}
                >
                  <option value="">ทุกภาควิชา</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทผู้คุมสอบ</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={bulkEmailConfig.invigilatorType}
                  onChange={e => setBulkEmailConfig({...bulkEmailConfig, invigilatorType: e.target.value})}
                >
                  <option value="">ทั้งหมด</option>
                  <option value="อาจารย์">อาจารย์</option>
                  <option value="บุคลากรทั่วไป">บุคลากรทั่วไป</option>
                </select>
              </div>
              
              {/* เพิ่มตัวเลือกกรองอีเมล */}
              <div className="col-span-2 mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทอีเมล</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={bulkEmailConfig.emailFilter}
                  onChange={e => setBulkEmailConfig({...bulkEmailConfig, emailFilter: e.target.value})}
                >
                  <option value="kmitl">เฉพาะอีเมล @kmitl.ac.th</option>
                  <option value="all">ทุกประเภทอีเมล (ไม่แนะนำ)</option>
                  <option value="non-empty">เฉพาะผู้ที่มีอีเมล</option>
                </select>
                {bulkEmailConfig.emailFilter === 'all' && (
                  <p className="text-xs text-red-500 mt-1">
                    ไม่แนะนำให้ส่งถึงทุกประเภทอีเมล เนื่องจากอาจถูกบล็อกเป็นสแปม
                  </p>
                )}
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <div className="bg-yellow-50 p-4 rounded-lg text-yellow-700 text-sm">
                <div className="flex items-start gap-3">
                  <div className="p-1">
                    <FiUsers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">คำเตือน</h4>
                    <p>
                      การส่งอีเมลจำนวนมากในครั้งเดียวอาจใช้เวลานาน โปรดอย่าปิดหน้าจอนี้ระหว่างการส่งอีเมล
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PopupModal>
      )}
    </div>
  );
}