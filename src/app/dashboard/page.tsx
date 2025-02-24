"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building, GraduationCap, Calendar, MessageCircle, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

// เพิ่ม interface สำหรับ Schedule
interface Schedule {
  id: string;
  examType: 'MIDTERM' | 'FINAL';
  semester: number;
  academicYear: number;
  date: Date;
  scheduleDateOption: 'ช่วงเช้า' | 'ช่วงบ่าย';
  room: {
    building: string;
    roomNumber: string;
  };
  subjectGroup: {
    subject: {
      code: string;
      name: string;
    };
    professor: {
      id: string;
      name: string;
    };
  };
  priority: boolean;
  isGenEd: boolean;
  quotaFilled: boolean;
  departmentQuota: number;
  invigilatorId?: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.replace("/login");
    },
  });
  const router = useRouter();

  const [upcomingExams, setUpcomingExams] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // เพิ่ม state สำหรับ available schedules
  const [availableSchedules, setAvailableSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role === "admin") {
        router.replace("/dashboard/admin");
      }
    }
  }, [session, status, router]);

  // Add fetchUpcomingExams function
  const fetchUpcomingExams = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/schedules/my-schedule');
      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }
      const data = await response.json();
      setUpcomingExams(data);
    } catch (error) {
      console.error('Error fetching upcoming exams:', error);
      toast.error('ไม่สามารถโหลดตารางสอบได้');
    } finally {
      setIsLoading(false);
    }
  };

  // Add useEffect to fetch data on component mount
  useEffect(() => {
    fetchAvailableSchedules();
    fetchUpcomingExams();
  }, []);

  // เพิ่ม useEffect สำหรับดึงข้อมูลตารางสอบที่สามารถเลือกได้
  const fetchAvailableSchedules = async () => {
    try {
      const response = await fetch('/api/schedules/available');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch available schedules');
      }
  
      console.log('Available schedules:', data); // เพิ่ม log เพื่อ debug
      const sortedSchedules = data.sort((a: Schedule, b: Schedule) => {
        const isAProfessor = session?.user?.professorId === a.subjectGroup.professor?.id;
        const isBProfessor = session?.user?.professorId === b.subjectGroup.professor?.id;
        
        if (isAProfessor && !isBProfessor) return -1;
        if (!isAProfessor && isBProfessor) return 1;
        return 0;
      });
      setAvailableSchedules(sortedSchedules);
    } catch (error) {
      console.error('Error fetching available schedules:', error);
      toast.error('ไม่สามารถโหลดรายการวิชาที่เปิดให้เลือกได้');
    }
  };

  // เพิ่ม function สำหรับเลือกตารางสอบ
  const handleSelectSchedule = async (scheduleId: string) => {
    try {
      const response = await fetch('/api/schedules/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId })
      });

      const data = await response.json();
      
      if (!response.ok) {
        toast.error(data.error || 'ไม่สามารถเลือกตารางสอบได้');
        return;
      }

      toast.success('เลือกตารางสอบสำเร็จ');
      
      // รีโหลดทั้งตารางที่เลือกได้และตารางที่กำลังจะมาถึง
      fetchAvailableSchedules();
      fetchUpcomingExams();
    } catch (error) {
      console.error('Error selecting schedule:', error);
      toast.error('เกิดข้อผิดพลาดในการเลือกตารางสอบ');
    }
  };

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="space-y-6 text-center">
          <div className="relative animate-pulse">
            <Building className="h-16 w-16 text-[#FF4E00]" />
            <GraduationCap className="h-8 w-8 text-[#FF4E00] absolute -top-2 -right-2" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-800">
              กำลังโหลด...
            </h2>
            <p className="text-sm text-gray-500">
              คณะวิศวกรรมศาสตร์ สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง
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

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100"
      >
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">
              ยินดีต้อนรับ, {session?.user?.name}
            </h1>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full whitespace-nowrap">
                โควต้าคงเหลือ: {session?.user?.quota ?? 0}/{session?.user?.maxQuota ?? 0}
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full whitespace-nowrap">
                ได้รับมอบหมายแล้ว: {session?.user?.assignedQuota ?? 0}
              </span>
            </div>
          </div>
          <p className="text-gray-500">
            ระบบจัดการการคุมสอบ คณะวิศวกรรมศาสตร์
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          <span className="text-sm text-gray-600">
            {new Date().toLocaleDateString('th-TH', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      </motion.div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white"
        >
          <div className="flex items-center gap-4">
            <Calendar className="w-8 h-8" />
            <div>
              <h3 className="text-lg font-semibold">ตารางคุมสอบ</h3>
              <p className="text-sm text-blue-100">ดูตารางการคุมสอบของคุณ</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl shadow-lg text-white"
        >
          <div className="flex items-center gap-4">
            <MessageCircle className="w-8 h-8" />
            <div>
              <h3 className="text-lg font-semibold">แจ้งปัญหา</h3>
              <p className="text-sm text-orange-100">รายงานปัญหาการคุมสอบ</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white"
        >
          <div className="flex items-center gap-4">
            <Users className="w-8 h-8" />
            <div>
              <h3 className="text-lg font-semibold">โปรไฟล์</h3>
              <p className="text-sm text-purple-100">จัดการข้อมูลส่วนตัว</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Available Schedules Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">วิชาที่เปิดให้เลือกคุมสอบ</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {availableSchedules.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              ไม่พบวิชาที่เปิดให้เลือกคุมสอบในขณะนี้
            </div>
          ) : (
            availableSchedules.map((schedule) => {
              // เพิ่ม debug logs
              console.log('Schedule debug:', {
                scheduleId: schedule.id,
                subjectCode: schedule.subjectGroup.subject.code,
                professorId: schedule.subjectGroup.professor?.id,
                currentUserProfessorId: session?.user?.professorId,
                isProfessorMatch: session?.user?.professorId === schedule.subjectGroup.professor?.id
              });

              const isProfessor = session?.user?.professorId === schedule.subjectGroup.professor?.id;
              
              return (
                <div 
                  key={schedule.id} 
                  className={`p-4 transition-colors ${
                    isProfessor 
                      ? 'border-l-4 border-blue-500 bg-blue-50 hover:bg-blue-100' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          {schedule.subjectGroup.subject.code} - {schedule.subjectGroup.subject.name}
                        </h3>
                        {/* แสดง badge ถ้าเป็นผู้สอน */}
                        {isProfessor && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                            คุณเป็นผู้สอน 👨‍🏫
                          </span>
                        )}
                      </div>
                      
                      {/* เพิ่มการแสดงชื่อผู้สอน */}
                      <p className="text-sm text-gray-600 mt-1">
                        ผู้สอน: {schedule.subjectGroup.professor?.name || 'ไม่ระบุ'} 
                        {isProfessor && ' (คุณ)'}
                      </p>
                      
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <span className={`px-2 py-1 rounded-full ${
                          schedule.examType === 'MIDTERM' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {schedule.examType === 'MIDTERM' ? '📝 สอบกลางภาค' : '📚 สอบปลายภาค'}
                        </span>
                        <span className={`px-2 py-1 rounded-full ${
                          schedule.scheduleDateOption === 'ช่วงเช้า'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {schedule.scheduleDateOption === 'ช่วงเช้า' ? '🌅 ช่วงเช้า' : '🌆 ช่วงบ่าย'}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                          {schedule.semester}/{schedule.academicYear}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-gray-500">
                        ห้อง: {schedule.room.building} {schedule.room.roomNumber}
                      </p>
                      
                      <div className="mt-2 flex items-center gap-2">
                        {schedule.priority && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                            🎯 วิชาภาควิชา
                          </span>
                        )}
                        {schedule.isGenEd && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                            🎓 วิชา GenEd
                          </span>
                        )}
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          👥 เหลือโควต้า {schedule.departmentQuota}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm whitespace-nowrap">
                        📅 {new Date(schedule.date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <button
                        onClick={() => handleSelectSchedule(schedule.id)}
                        className={`px-4 py-2 text-white text-sm rounded-lg transition-colors ${
                          isProfessor 
                            ? 'bg-blue-600 hover:bg-blue-700' 
                            : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                      >
                        {isProfessor ? '✨ เลือกคุมสอบ (ผู้สอน)' : '🎯 เลือกคุมสอบ'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* Upcoming Exams Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">ตารางสอบที่กำลังจะมาถึง</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full mr-2" />
              กำลังโหลดข้อมูล...
            </div>
          ) : upcomingExams.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              ไม่พบตารางสอบที่กำลังจะมาถึง
            </div>
          ) : (
            upcomingExams.map((exam) => (
              <div key={exam.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">
                      {exam.examType === 'MIDTERM' ? 'สอบกลางภาค' : 'สอบปลายภาค'} {exam.semester}/{exam.academicYear}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {exam.subjectGroup.subject.code} - {exam.subjectGroup.subject.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      ห้อง: {exam.room.building} {exam.room.roomNumber} ({exam.scheduleDateOption === 'ช่วงเช้า' ? 'ช่วงเช้า' : 'ช่วงบ่าย'})
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {exam.priority && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                          วิชาภาควิชา
                        </span>
                      )}
                      {exam.isGenEd && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                          วิชา GenEd
                        </span>
                      )}
                      {exam.quotaFilled ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                          โควต้าเต็ม
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          เหลือโควต้า {exam.departmentQuota}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm whitespace-nowrap">
                      {new Date(exam.date).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    {!exam.quotaFilled && !exam.invigilatorId && (
                      <button
                        onClick={() => handleSelectSchedule(exam.id)}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        เลือกคุมสอบ
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}