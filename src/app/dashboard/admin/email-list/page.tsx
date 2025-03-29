'use client';

import { useState, useEffect } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { FiSearch, FiCalendar, FiPieChart } from 'react-icons/fi';

export default function EmailListPage() {
  const [invigilators, setInvigilators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    department: '',
    search: '',
    emailType: 'kmitl'
  });

  useEffect(() => {
    fetchInvigilators();
  }, []);

  const fetchInvigilators = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/invigilators');
      if (!response.ok) {
        throw new Error('Failed to fetch invigilators');
      }
      const data = await response.json();
      setInvigilators(data);
    } catch (error) {
      console.error('Error fetching invigilators:', error);
      toast.error('ไม่สามารถโหลดข้อมูลผู้คุมสอบได้');
    } finally {
      setLoading(false);
    }
  };

  const sendEmailToInvigilator = async (invigilator, emailType) => {
    try {
      // ตรวจสอบว่ามีอีเมลหรือไม่
      if (!invigilator.user?.email) {
        toast.error('ไม่พบอีเมลของผู้คุมสอบท่านนี้');
        return;
      }
      
      // แสดงข้อมูลดีบัก
      console.log('Debug sending email to:', {
        invigilator: invigilator,
        userId: invigilator.user?.id,  // ควรใช้ user.id ไม่ใช่ invigilator.userId
        email: invigilator.user?.email
      });
      
      const toastId = toast.loading('กำลังส่งอีเมล...');
      
      // ให้ใช้เฉพาะอีเมลในการส่งแทนการใช้ userId
      const response = await fetch('/api/notifications/individual-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: emailType,
          email: invigilator.user.email  // ส่งเฉพาะอีเมล
        })
      });
      
      const data = await response.json();
      
      toast.dismiss(toastId);
      
      if (response.ok) {
        toast.success(data.message || 'ส่งอีเมลเรียบร้อยแล้ว');
      } else {
        toast.error(data.error || 'เกิดข้อผิดพลาดในการส่งอีเมล');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('เกิดข้อผิดพลาดในการส่งอีเมล');
      console.error('Error sending email:', error);
    }
  };

  const hasSchedules = (invigilator) => {
    return invigilator.schedules && invigilator.schedules.length > 0;
  };

  // กรองข้อมูลผู้คุมสอบ
  const filteredInvigilators = invigilators.filter(invigilator => {
    // กรองเฉพาะผู้ที่มีอีเมล
    if (!invigilator.user?.email) return false;
    
    // กรองตามประเภทอีเมล
    if (filter.emailType === 'kmitl' && !invigilator.user.email.endsWith('@kmitl.ac.th')) return false;
    
    // กรองตามภาควิชา
    if (filter.department && invigilator.departmentId !== filter.department) return false;
    
    // กรองตามข้อความค้นหา
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const nameMatch = invigilator.name?.toLowerCase().includes(searchLower);
      const emailMatch = invigilator.user?.email.toLowerCase().includes(searchLower);
      if (!nameMatch && !emailMatch) return false;
    }
    
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <Toaster />
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">รายชื่อผู้คุมสอบที่มีอีเมล</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">ค้นหา</label>
            <div className="relative">
              <input
                type="text"
                className="w-full p-2 pl-10 border rounded-md"
                placeholder="ค้นหาชื่อหรืออีเมล"
                value={filter.search}
                onChange={e => setFilter({...filter, search: e.target.value})}
              />
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>
          
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทอีเมล</label>
            <select
              className="w-full p-2 border rounded-md"
              value={filter.emailType}
              onChange={e => setFilter({...filter, emailType: e.target.value})}
            >
              <option value="kmitl">เฉพาะอีเมล @kmitl.ac.th</option>
              <option value="all">ทุกประเภทอีเมล</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ชื่อ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  อีเมล
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ภาควิชา
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ตารางสอบ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  โควต้า
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  การดำเนินการ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredInvigilators.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">
                    ไม่พบข้อมูลผู้คุมสอบที่มีอีเมลตามเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredInvigilators.map(invigilator => (
                  <tr key={invigilator.id}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invigilator.name}
                      {invigilator.user?.id && 
                        <p className="text-xs text-gray-500">Email: {invigilator.user.email}</p>
                      }
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invigilator.user?.email ? (
                        invigilator.user.email.endsWith('@kmitl.ac.th') ? (
                          <span className="text-green-600">{invigilator.user.email}</span>
                        ) : (
                          <span>{invigilator.user.email}</span>
                        )
                      ) : (
                        <span className="text-red-500">ไม่มีอีเมล</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invigilator.department?.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invigilator.schedules?.length || 0} ตาราง
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invigilator.assignedQuota} / {invigilator.quota}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex gap-2">
                        {invigilator.user?.email ? (
                          <>
                            <button
                              onClick={() => sendEmailToInvigilator(invigilator, 'schedule')}
                              className={`px-3 py-1 ${hasSchedules(invigilator) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'} rounded-md hover:bg-blue-200 flex items-center gap-1`}
                              disabled={!hasSchedules(invigilator)}
                              title={!hasSchedules(invigilator) ? "ไม่มีตารางสอบ" : "ส่งอีเมลแจ้งเตือนตารางสอบ"}
                            >
                              <FiCalendar className="w-3 h-3" />
                              <span>ตารางสอบ</span>
                            </button>
                            <button
                              onClick={() => sendEmailToInvigilator(invigilator, 'quota')}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 flex items-center gap-1"
                            >
                              <FiPieChart className="w-3 h-3" />
                              <span>โควต้า</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">ไม่สามารถส่งอีเมลได้</span>
                        )}
                        
                        {/* ปุ่ม Debug */}
                        <button
                          onClick={() => {
                            console.log('Debug invigilator data:', invigilator);
                            toast.success(`ข้อมูลถูกแสดงใน Console`);
                          }}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-1"
                        >
                          <span>Debug</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          พบทั้งหมด {filteredInvigilators.length} รายการ
        </div>
      </div>
    </div>
  );
}