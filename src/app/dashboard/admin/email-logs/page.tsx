'use client';

import { useState, useEffect } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { FiMail, FiSearch, FiCalendar, FiPieChart, FiUser, FiRefreshCw, FiCheck, FiX } from 'react-icons/fi';
import { ImSpinner8 } from 'react-icons/im';

interface EmailLog {
  id: string;
  type: string;
  recipientEmail: string;
  recipientName: string;
  status: 'success' | 'failed';
  createdAt: string;
  errorMessage?: string;
  sentBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    search: '',
    status: 'all',
    type: 'all',
    startDate: '',
    endDate: '',
  });

  const fetchEmailLogs = async () => {
    try {
      setLoading(true);
      // URL params for filters
      const params = new URLSearchParams();
      if (filter.search) params.append('search', filter.search);
      if (filter.status !== 'all') params.append('status', filter.status);
      if (filter.type !== 'all') params.append('type', filter.type);
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);

      const response = await fetch(`/api/email-logs?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch email logs');
      }
      
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Error fetching email logs:', error);
      toast.error('ไม่สามารถโหลดข้อมูลการส่งอีเมลได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailLogs();
  }, []);

  const handleApplyFilter = () => {
    fetchEmailLogs();
  };

  const handleClearFilter = () => {
    setFilter({
      search: '',
      status: 'all',
      type: 'all',
      startDate: '',
      endDate: '',
    });
    
    // Immediately fetch with cleared filters
    setTimeout(() => {
      fetchEmailLogs();
    }, 0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getEmailTypeLabel = (type: string) => {
    switch (type) {
      case 'schedule':
        return 'ตารางสอบ';
      case 'quota':
        return 'โควต้า';
      default:
        return type;
    }
  };

  const getEmailStatusIcon = (status: string) => {
    if (status === 'success') {
      return <FiCheck className="w-4 h-4 text-green-500" />;
    } else {
      return <FiX className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Toaster />
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">ประวัติการส่งอีเมล</h1>
        <button
          onClick={fetchEmailLogs}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <FiRefreshCw className="w-4 h-4" />
          <span>รีเฟรช</span>
        </button>
      </div>
      
      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="text-lg font-semibold mb-4">ตัวกรองข้อมูล</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ค้นหา</label>
            <div className="relative">
              <input
                type="text"
                className="w-full p-2 pl-10 border rounded-md"
                placeholder="ค้นหาตามชื่อหรืออีเมล"
                value={filter.search}
                onChange={e => setFilter({...filter, search: e.target.value})}
              />
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
            <select
              className="w-full p-2 border rounded-md"
              value={filter.status}
              onChange={e => setFilter({...filter, status: e.target.value})}
            >
              <option value="all">ทั้งหมด</option>
              <option value="success">สำเร็จ</option>
              <option value="failed">ล้มเหลว</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
            <select
              className="w-full p-2 border rounded-md"
              value={filter.type}
              onChange={e => setFilter({...filter, type: e.target.value})}
            >
              <option value="all">ทั้งหมด</option>
              <option value="schedule">ตารางสอบ</option>
              <option value="quota">โควต้า</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่มต้น</label>
            <input
              type="date"
              className="w-full p-2 border rounded-md"
              value={filter.startDate}
              onChange={e => setFilter({...filter, startDate: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สิ้นสุด</label>
            <input
              type="date"
              className="w-full p-2 border rounded-md"
              value={filter.endDate}
              onChange={e => setFilter({...filter, endDate: e.target.value})}
            />
          </div>
          
          <div className="flex items-end gap-2">
            <button
              onClick={handleApplyFilter}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex-1"
            >
              ค้นหา
            </button>
            <button
              onClick={handleClearFilter}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              ล้าง
            </button>
          </div>
        </div>
      </div>
      
      {/* Email Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  วันที่/เวลา
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ประเภท
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ผู้รับ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  สถานะ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ผู้ส่ง
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center">
                      <ImSpinner8 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                      <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center">
                      <FiMail className="w-12 h-12 text-gray-300 mb-2" />
                      <p className="text-gray-500">ไม่พบข้อมูลการส่งอีเมล</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(log.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {log.type === 'schedule' ? (
                          <FiCalendar className="mr-2 text-blue-500" />
                        ) : (
                          <FiPieChart className="mr-2 text-green-500" />
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {getEmailTypeLabel(log.type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{log.recipientName}</div>
                      <div className="text-sm text-gray-500">{log.recipientEmail}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className={`flex items-center ${log.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {getEmailStatusIcon(log.status)}
                        <span className="ml-2 text-sm font-medium">
                          {log.status === 'success' ? 'สำเร็จ' : 'ล้มเหลว'}
                        </span>
                      </div>
                      {log.status === 'failed' && log.errorMessage && (
                        <div className="text-xs text-red-500 mt-1">{log.errorMessage}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {log.sentBy ? (
                        <div className="flex items-center">
                          <FiUser className="mr-2 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{log.sentBy.name}</div>
                            <div className="text-xs text-gray-500">{log.sentBy.email}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">ระบบ</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {!loading && logs.length > 0 && (
          <div className="px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
            <div className="text-sm text-gray-700">
              ผลลัพธ์ทั้งหมด <span className="font-medium">{logs.length}</span> รายการ
            </div>
          </div>
        )}
      </div>
    </div>
  );
}