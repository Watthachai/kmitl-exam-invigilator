"use client";

import { useEffect, useState } from "react";
import { FiCheck, FiX } from 'react-icons/fi';
import { ImSpinner8 } from 'react-icons/im';
import toast, { Toaster } from 'react-hot-toast';
import PopupModal from '@/app/components/ui/popup-modal';

interface Appeal {
  id: string;
  userId: string;
  user: {
    name: string;
    role: string;
  };
  schedule: {
    date: Date;
    scheduleDateOption: 'MORNING' | 'AFTERNOON';
    subjectGroup: {
      subject: {
        code: string;
        name: string;
      };
    };
  };
  type: 'CHANGE_DATE' | 'FIND_REPLACEMENT';
  reason: string;
  preferredDates: Date[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function AdminAppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [newStatus, setNewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');

  useEffect(() => {
    fetchAppeals();
  }, []);

  const fetchAppeals = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/appeals', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Important for sending auth cookies
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('กรุณาเข้าสู่ระบบ');
          return;
        }
        if (response.status === 403) {
          toast.error('ไม่มีสิทธิ์เข้าถึง');
          return;
        }
        throw new Error('Failed to fetch appeals');
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format');
      }

      const data = await response.json();
      setAppeals(data);
    } catch (error) {
      console.error('Failed to fetch appeals:', error);
      toast.error('ไม่สามารถโหลดข้อมูลการร้องเรียนได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAppealStatus = async () => {
    if (!selectedAppeal) return;
    try {
      const response = await fetch(`/api/appeals/${selectedAppeal.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
          adminResponse,
          type: selectedAppeal.type, // เพิ่ม type เข้าไปด้วย
          reason: selectedAppeal.reason // เพิ่มเหตุผลเข้าไปด้วย
        }),
      });
  
      if (!response.ok) {
        if (response.status === 401) {
          toast.error('กรุณาเข้าสู่ระบบ');
          return;
        }
        if (response.status === 403) {
          toast.error('ไม่มีสิทธิ์เข้าถึง');
          return;
        }
        throw new Error('Failed to update appeal');
      }
  
      await response.json();
      toast.success('อัพเดทสถานะเรียบร้อย');
      setShowResponseModal(false);
      setAdminResponse('');
      fetchAppeals();
    } catch (error) {
      console.error('Failed to update appeal:', error);
      toast.error('ไม่สามารถอัพเดทสถานะได้');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Toaster />
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">จัดการคำร้องเรียน</h1>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="h-[calc(100vh-12rem)] overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <ImSpinner8 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : appeals.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">ไม่มีคำร้องเรียน</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">ผู้ร้องเรียน</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">วิชา</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">ประเภท</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">เหตุผล</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">สถานะ</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">การตอบกลับ</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {appeals.map((appeal) => (
                  <tr key={appeal.id}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{appeal.user.name}</div>
                        <div className="text-sm text-gray-500">{appeal.user.role}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{appeal.schedule.subjectGroup.subject.code}</div>
                        <div className="text-sm text-gray-500">{appeal.schedule.subjectGroup.subject.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {appeal.type === 'CHANGE_DATE' ? 'ขอเปลี่ยนวันสอบ' : 'ขอหาผู้คุมสอบแทน'}
                    </td>
                    <td className="px-6 py-4">{appeal.reason}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        appeal.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        appeal.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {appeal.status === 'PENDING' ? 'รอดำเนินการ' :
                         appeal.status === 'APPROVED' ? 'อนุมัติ' : 'ไม่อนุมัติ'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {appeal.adminResponse || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {appeal.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedAppeal(appeal);
                              setNewStatus('APPROVED');
                              setShowResponseModal(true);
                            }}
                            className="text-green-600 hover:bg-green-50 p-2 rounded-full"
                          >
                            <FiCheck className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAppeal(appeal);
                              setNewStatus('REJECTED');
                              setShowResponseModal(true);
                            }}
                            className="text-red-600 hover:bg-red-50 p-2 rounded-full"
                          >
                            <FiX className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showResponseModal && selectedAppeal && (
        <PopupModal
          title={newStatus === 'APPROVED' ? 'อนุมัติคำร้องเรียน' : 'ไม่อนุมัติคำร้องเรียน'}
          onClose={() => setShowResponseModal(false)}
          onConfirm={handleUpdateAppealStatus}
          confirmText={newStatus === 'APPROVED' ? 'อนุมัติ' : 'ไม่อนุมัติ'}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                การตอบกลับถึงผู้ร้องเรียน
              </label>
              <textarea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={4}
                placeholder={newStatus === 'APPROVED' ? 
                  "กรอกรายละเอียดเพิ่มเติม (ถ้ามี)..." : 
                  "กรุณาระบุเหตุผลที่ไม่อนุมัติ..."}
                required={newStatus === 'REJECTED'}
              />
            </div>
          </div>
        </PopupModal>
      )}
    </div>
  );
}