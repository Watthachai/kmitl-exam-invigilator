'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/app/components/ui/calendar';
import { Toaster, toast } from 'react-hot-toast';
import { FiCalendar, FiClock, FiMapPin, FiBook } from 'react-icons/fi';

interface Schedule {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  room: {
    building: string;
    roomNumber: string;
  };
  subjectGroup: {
    subject: {
      code: string;
      name: string;
    };
  };
}

// Add this interface for API response
interface ScheduleResponse {
  id: string;
  date: string;
  scheduleDateOption: 'MORNING' | 'AFTERNOON';
  room: {
    building: string;
    roomNumber: string;
  };
  subjectGroup: {
    subject: {
      code: string;
      name: string;
    };
  };
}

interface AppealForm {
  scheduleId: string;
  reason: string;
  preferredDates: Date[];
  type: 'CHANGE_DATE' | 'FIND_REPLACEMENT';
  additionalNotes?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';  // เพิ่ม status
}

interface Appeal {
  id: string;
  schedule: Schedule;
  reason: string;
  preferredDates: Date[];
  type: 'CHANGE_DATE' | 'FIND_REPLACEMENT';
  additionalNotes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export default function AppealPage() {
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [preferredDates, setPreferredDates] = useState<Date[]>([]);
  const [formData, setFormData] = useState<AppealForm>({
    scheduleId: '',
    reason: '',
    preferredDates: [],
    type: 'CHANGE_DATE',
    additionalNotes: ''
  });
  const [appeals, setAppeals] = useState<Appeal[]>([]);

  useEffect(() => {
    fetchUserSchedules();
    fetchAppeals();
  }, []);

  // Update the fetchUserSchedules function
  const fetchUserSchedules = async () => {
    try {
      // Add authentication check
      const response = await fetch('/api/schedules/my-schedule', {
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
        throw new Error('Failed to fetch schedules');
      }
  
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format');
      }
  
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format');
      }
  
      const transformedSchedules = data.map((item: ScheduleResponse) => ({
        id: item.id,
        date: new Date(item.date),
        startTime: new Date(item.scheduleDateOption === 'MORNING' ? 
          new Date(item.date).setHours(9, 30, 0) :
          new Date(item.date).setHours(13, 30, 0)),
        endTime: new Date(item.scheduleDateOption === 'MORNING' ? 
          new Date(item.date).setHours(12, 30, 0) :
          new Date(item.date).setHours(16, 30, 0)),
        room: {
          building: item.room.building,
          roomNumber: item.room.roomNumber
        },
        subjectGroup: {
          subject: {
            code: item.subjectGroup.subject.code,
            name: item.subjectGroup.subject.name
          }
        }
      }));
  
      setSchedules(transformedSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('ไม่สามารถโหลดข้อมูลตารางสอบได้');
    }
  };

  const fetchAppeals = async () => {
    try {
      const response = await fetch('/api/appeals/my-appeals');
      if (!response.ok) throw new Error('Failed to fetch appeals');
      const data = await response.json();
      setAppeals(data);
    } catch (error) {
      console.error(error);
      toast.error('ไม่สามารถโหลดข้อมูลการร้องเรียนได้');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          scheduleId: selectedSchedule?.id,
          preferredDates: preferredDates
        })
      });

      if (response.ok) {
        toast.success('ส่งคำร้องเรียนสำเร็จ');
        setSelectedSchedule(null);
        setPreferredDates([]);
        setFormData({
          scheduleId: '',
          reason: '',
          preferredDates: [],
          type: 'CHANGE_DATE',
          additionalNotes: ''
        });
      } else {
        throw new Error('Failed to submit appeal');
      }
    } catch (error) {
      console.error(error)
      toast.error('ไม่สามารถส่งคำร้องเรียนได้');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <Toaster />
      
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">ร้องเรียนตารางสอบ</h1>
        <p className="text-gray-600">
          กรุณาเลือกตารางสอบที่ต้องการร้องเรียนและระบุรายละเอียดเพิ่มเติม
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left Column - Schedule Selection */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">ตารางสอบของคุณ</h2>
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedSchedule?.id === schedule.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-100 hover:border-blue-200'
                  }`}
                  onClick={() => setSelectedSchedule(schedule)}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FiBook className="text-blue-500" />
                      <span className="font-medium">
                        {schedule.subjectGroup.subject.code} - {schedule.subjectGroup.subject.name}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="text-gray-400" />
                        <span>
                          {new Date(schedule.date).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'long'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiClock className="text-gray-400" />
                        <span>
                          {new Date(schedule.startTime).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {' - '}
                          {new Date(schedule.endTime).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiMapPin className="text-gray-400" />
                      <span>
                        {schedule.room.building} - {schedule.room.roomNumber}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Appeal Form */}
        <div className="space-y-6">
          {selectedSchedule ? (
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">รายละเอียดการร้องเรียน</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ประเภทการร้องเรียน
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as AppealForm['type'] })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="CHANGE_DATE">ขอเปลี่ยนวันสอบ</option>
                    <option value="FIND_REPLACEMENT">ขอหาผู้คุมสอบแทน</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เหตุผลในการร้องเรียน
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    required
                    placeholder="กรุณาระบุเหตุผลที่ไม่สามารถคุมสอบได้..."
                  />
                </div>

                {formData.type === 'CHANGE_DATE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      วันที่ต้องการสลับ
                    </label>
                    <Calendar
                      mode="multiple"
                      selected={preferredDates}
                      onSelect={(dates) => dates && setPreferredDates(dates)}
                      className="rounded-lg border border-gray-200"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    หมายเหตุเพิ่มเติม
                  </label>
                  <textarea
                    value={formData.additionalNotes}
                    onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)..."
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    ส่งคำร้องเรียน
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="text-center text-gray-500">
                กรุณาเลือกตารางสอบที่ต้องการร้องเรียน
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Appeals List */}
      <div className="space-y-4">
        {appeals.map((appeal) => (
          <div 
            key={appeal.id}
            className={`p-4 rounded-lg border ${
              appeal.status === 'PENDING' ? 'border-yellow-500 bg-yellow-50' :
              appeal.status === 'APPROVED' ? 'border-green-500 bg-green-50' :
              'border-red-500 bg-red-50'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{appeal.schedule.subjectGroup.subject.name}</h3>
                <p className="text-sm text-gray-600">{appeal.reason}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                appeal.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                appeal.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {appeal.status === 'PENDING' ? 'รอดำเนินการ' :
                 appeal.status === 'APPROVED' ? 'อนุมัติแล้ว' :
                 'ไม่อนุมัติ'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}