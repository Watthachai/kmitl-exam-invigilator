"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Building, GraduationCap, Calendar, MessageCircle, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.replace("/login");
    },
  });
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role === "admin") {
        router.replace("/dashboard/admin");
      }
    }
  }, [session, status, router]);

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
          <h1 className="text-2xl font-bold text-gray-800">
            ยินดีต้อนรับ, {session?.user?.name}
          </h1>
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
          {/* Sample exam schedule items */}
          <div className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">การสอบปลายภาค 1/2566</h3>
                <p className="text-sm text-gray-500">วิชา: Computer Engineering</p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                30 ต.ค. 2566
              </span>
            </div>
          </div>
          {/* Add more exam items here */}
        </div>
      </motion.div>
    </div>
  );
}