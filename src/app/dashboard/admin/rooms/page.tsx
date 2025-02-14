"use client";

import React, { useEffect, useState } from "react";
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import PopupModal from '@/app/components/ui/popup-modal';
import { motion, AnimatePresence } from 'framer-motion';
import { ImSpinner8 } from 'react-icons/im';
import { FiDatabase } from 'react-icons/fi';

interface Schedule {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  subjectGroup: {
    id: string;
    groupNumber: string;
    subject: {
      code: string;
      name: string;
    }
  };
  invigilator: {
    id: string;
    name: string;
  };
}

interface Room {
  id: string;
  building: string;
  roomNumber: string;
  schedules: Schedule[];
  createdAt: Date;
  updatedAt: Date;
}


interface TabContentProps {
  schedules: Schedule[];
  activeTab: 'morning' | 'afternoon';
  isVisible: boolean;
}

// Add this component for Tab Content
const TabContent: React.FC<TabContentProps> = ({ schedules, activeTab, isVisible }) => {
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: activeTab === 'morning' ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: activeTab === 'morning' ? 20 : -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {Object.entries(
            schedules.reduce<Record<string, Schedule[]>>((acc, schedule) => {
              const date = new Date(schedule.date).toLocaleDateString();
              if (!acc[date]) acc[date] = [];
              acc[date].push(schedule);
              return acc;
            }, {})
          ).map(([date, daySchedules]: [string, Schedule[]]) => (
            <div key={date} className="space-y-3">
              <h5 className="font-medium text-gray-600">
                {new Date(date).toLocaleDateString('th-TH', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h5>
              <div className="grid gap-3">
                {daySchedules
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map(schedule => (
                    <motion.div
                      key={schedule.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`rounded-lg border p-4 transition-all hover:shadow-md
                        ${activeTab === 'morning' ? 'bg-yellow-50' : 'bg-blue-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className={`px-3 py-1 rounded-full bg-white border ${
                            activeTab === 'morning' ? 'text-yellow-600' : 'text-blue-600'
                          }`}>
                            {new Date(schedule.startTime).toLocaleTimeString('th-TH', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })} - 
                            {new Date(schedule.endTime).toLocaleTimeString('th-TH', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <div>
                            <div className="font-medium text-gray-900">
                              {schedule.subjectGroup?.subject?.code || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600">
                              {schedule.subjectGroup?.subject?.name || 'N/A'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            กลุ่ม {schedule.subjectGroup?.groupNumber || 'N/A'}
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {schedule.invigilator?.name || 'ไม่ระบุผู้คุมสอบ'}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    building: '',
    roomNumber: ''
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [roomTabs, setRoomTabs] = useState<Record<string, 'morning' | 'afternoon'>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/rooms');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'ไม่สามารถโหลดข้อมูลห้องได้');
      }
      
      setRooms(result.data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      toast.error('ไม่สามารถโหลดข้อมูลห้องได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRoom = async () => {
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'ไม่สามารถเพิ่มห้องได้');
        return;
      }

      toast.success('เพิ่มห้องสำเร็จ');
      setShowAddModal(false);
      setFormData({ building: '', roomNumber: '' });
      fetchRooms();
    } catch (error) {
      console.error('Failed to add room:', error);
      toast.error('ไม่สามารถเพิ่มห้องได้');
    }
  };

  const handleEditRoom = async () => {
    if (!selectedRoom) return;
    try {
      const response = await fetch(`/api/rooms/${selectedRoom.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          building: selectedRoom.building,
          roomNumber: selectedRoom.roomNumber
        }),
      });

      if (response.ok) {
        toast.success('Room updated successfully');
        setShowEditModal(false);
        setSelectedRoom(null);
        fetchRooms();
      } else {
        toast.error('Failed to update room');
      }
    } catch (error) {
      console.error('Failed to update room:', error);
      toast.error('Failed to update room');
    }
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoom) return;
    try {
      const response = await fetch(`/api/rooms/${selectedRoom.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete room');
        return;
      }

      toast.success('Room deleted successfully');
      setShowDeleteModal(false);
      setSelectedRoom(null);
      fetchRooms();
    } catch (error) {
      console.error('Failed to delete room:', error);
      toast.error('Failed to delete room');
    }
  };

  // Update toggleRow function
  const toggleRow = (roomId: string) => {
    setExpandedRows(prev => {
      const newExpanded = new Set<string>();
      if (!prev.has(roomId)) {
        newExpanded.add(roomId);
      }
      return newExpanded;
    });
  };

  const filterSchedulesByTimeSlot = (schedules: Schedule[], isMorning: boolean) => {
    return schedules.filter(schedule => {
      const hour = new Date(schedule.startTime).getHours();
      return isMorning ? hour < 12 : hour >= 12;
    });
  };

  const handleTabChange = (roomId: string, tab: 'morning' | 'afternoon') => {
    setRoomTabs(prev => ({
      ...prev,
      [roomId]: tab
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <Toaster/>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">ห้องสอบ</h1>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          onClick={() => setShowAddModal(true)}
        >
          เพิ่มห้องสอบ
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white/30 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100">
        <div className="h-[calc(100vh-16rem)] overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <ImSpinner8 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            </div>
          ) : rooms.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <FiDatabase className="w-16 h-16 text-gray-300" />
                <p className="text-gray-500 text-lg">ไม่พบข้อมูลห้องสอบ</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  เพิ่มห้องสอบ
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-white/95 backdrop-blur-sm sticky top-0">
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">อาคาร</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">เลขห้อง</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">วันที่สร้าง</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">วันที่แก้ไข</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <AnimatePresence mode="wait">
                    {rooms.map((room) => (
                      <React.Fragment key={room.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => toggleRow(room.id)}
                              className="flex items-center gap-2 group"
                            >
                              <motion.span
                                initial={false}
                                animate={{ rotate: expandedRows.has(room.id) ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="text-gray-400 group-hover:text-gray-600"
                              >
                                ▼
                              </motion.span>
                              {room.building}
                            </button>
                          </td>
                          <td className="px-6 py-4">{room.roomNumber}</td>
                          <td className="px-6 py-4">{new Date(room.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4">{new Date(room.updatedAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedRoom(room);
                                  setShowEditModal(true);
                                }}
                                className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRoom(room);
                                  setShowDeleteModal(true);
                                }}
                                className="flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        <AnimatePresence>
                          {expandedRows.has(room.id) && room.schedules.length > 0 && (
                            <motion.tr
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ 
                                opacity: 1, 
                                height: 'auto',
                                transition: { duration: 0.3 }
                              }}
                              exit={{ 
                                opacity: 0, 
                                height: 0,
                                transition: { duration: 0.2 }
                              }}
                              className="bg-gray-50"
                            >
                              <td colSpan={5} className="px-6 py-4">
                                <motion.div 
                                  initial={{ opacity: 0, y: -20 }}
                                  animate={{ 
                                    opacity: 1, 
                                    y: 0,
                                    transition: { delay: 0.1 }
                                  }}
                                  exit={{ 
                                    opacity: 0, 
                                    y: 20,
                                    transition: { duration: 0.2 }
                                  }}
                                  className="pl-8 space-y-6"
                                >
                                  <div className="flex flex-col">
                                    <h4 className="font-semibold text-lg text-gray-700 mb-4">Scheduled Exams</h4>
                                    
                                    {/* Tabs */}
                                    <div className="flex space-x-1 mb-4">
                                      <button
                                        onClick={() => handleTabChange(room.id, 'morning')}
                                        className={`px-4 py-2 rounded-lg font-medium transition-all
                                          ${(!roomTabs[room.id] || roomTabs[room.id] === 'morning')
                                            ? 'bg-yellow-100 text-yellow-800 shadow-sm' 
                                            : 'text-gray-600 hover:bg-gray-100'}`}
                                      >
                                        ช่วงเช้า 🌅
                                      </button>
                                      <button
                                        onClick={() => handleTabChange(room.id, 'afternoon')}
                                        className={`px-4 py-2 rounded-lg font-medium transition-all
                                          ${roomTabs[room.id] === 'afternoon'
                                            ? 'bg-blue-100 text-blue-800 shadow-sm' 
                                            : 'text-gray-600 hover:bg-gray-100'}`}
                                      >
                                        ช่วงบ่าย 🌇
                                      </button>
                                    </div>

                                    <div className="relative min-h-[200px]">
                                      <AnimatePresence mode="wait">
                                        <motion.div
                                          key={`${room.id}-${roomTabs[room.id] || 'morning'}`}
                                          initial={{ opacity: 0, x: roomTabs[room.id] === 'afternoon' ? 20 : -20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          exit={{ opacity: 0, x: roomTabs[room.id] === 'afternoon' ? -20 : 20 }}
                                          transition={{ duration: 0.2 }}
                                          className="absolute inset-0"
                                        >
                                          <TabContent 
                                            schedules={filterSchedulesByTimeSlot(
                                              room.schedules, 
                                              !roomTabs[room.id] || roomTabs[room.id] === 'morning'
                                            )}
                                            activeTab={roomTabs[room.id] || 'morning'}
                                            isVisible={true}
                                          />
                                        </motion.div>
                                      </AnimatePresence>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals - Moved outside table container */}
      {(showAddModal || showEditModal || showDeleteModal) && (
        <div className="fixed inset-0 z-[100]">
          {showAddModal && (
            <PopupModal
              title="เพิ่มห้องสอบใหม่"
              onClose={() => setShowAddModal(false)}
              onConfirm={handleAddRoom}
              confirmText="เพิ่มห้องสอบ"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700">อาคาร</label>
                  <input
                    type="text"
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    placeholder="ระบุชื่ออาคาร"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700">เลขห้อง</label>
                  <input
                    type="text"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    placeholder="ระบุเลขห้อง"
                    required
                  />
                </div>
              </div>
            </PopupModal>
          )}

          {showEditModal && selectedRoom && (
            <PopupModal
              title="แก้ไขห้องสอบ"
              onClose={() => setShowEditModal(false)}
              onConfirm={handleEditRoom}
              confirmText="บันทึกการแก้ไข"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700">อาคาร</label>
                  <input
                    type="text"
                    value={selectedRoom.building}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, building: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    placeholder="ระบุชื่ออาคาร"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700">เลขห้อง</label>
                  <input
                    type="text"
                    value={selectedRoom.roomNumber}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, roomNumber: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    placeholder="ระบุเลขห้อง"
                    required
                  />
                </div>
              </div>
            </PopupModal>
          )}

          {showDeleteModal && selectedRoom && (
            <PopupModal
              title="ลบห้องสอบ"
              onClose={() => setShowDeleteModal(false)}
              onConfirm={handleDeleteRoom}
              confirmText="ยืนยันการลบ"
            >
              <p className="text-gray-700">
                คุณต้องการลบห้อง <strong>{selectedRoom.roomNumber}</strong> อาคาร <strong>{selectedRoom.building}</strong> ใช่หรือไม่?
              </p>
            </PopupModal>
          )}
        </div>
      )}
    </div>
  );
}