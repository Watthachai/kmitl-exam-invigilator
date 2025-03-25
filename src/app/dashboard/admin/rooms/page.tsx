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
  activeTab: 'ช่วงเช้า' | 'ช่วงบ่าย';
  isVisible: boolean;
}

// แก้ไข TabContent component เพื่อแสดง debug info
const TabContent: React.FC<TabContentProps> = ({ schedules, activeTab, isVisible }) => {
  console.log('TabContent props:', {
    schedulesCount: schedules.length,
    activeTab,
    isVisible
  });
  
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="p-2 sm:p-4 space-y-4"
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
              <h5 className="font-medium text-gray-600 sticky top-0 bg-gray-50/80 backdrop-blur-sm py-2 px-3 rounded-lg z-10">
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
                        ${activeTab === 'ช่วงเช้า' ? 'bg-yellow-50/70' : 'bg-blue-50/70'}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          <span className={`px-3 py-1.5 rounded-full bg-white border text-sm whitespace-nowrap ${
                            activeTab === 'ช่วงเช้า' ? 'text-yellow-600 border-yellow-200' : 'text-blue-600 border-blue-200'
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
                            <div className="text-sm text-gray-600 max-w-md truncate">
                              {schedule.subjectGroup?.subject?.name || 'N/A'}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
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
  const [roomTabs, setRoomTabs] = useState<Record<string, 'ช่วงเช้า' | 'ช่วงบ่าย'>>({});
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
    console.log('Filtering schedules:', schedules.map(s => ({
      id: s.id,
      startTime: new Date(s.startTime).toLocaleTimeString(),
      hour: new Date(s.startTime).getHours()
    })));
    
    return schedules.filter(schedule => {
      const startHour = new Date(schedule.startTime).getHours();
      // ปรับเงื่อนไขการแยกช่วงเวลา
      if (isMorning) {
        return startHour < 12;
      } else {
        return startHour >= 12;
      }
    });
  };

  const handleTabChange = (roomId: string, tab: 'ช่วงเช้า' | 'ช่วงบ่าย') => {
    setRoomTabs(prev => ({
      ...prev,
      [roomId]: tab
    }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 sm:p-6 flex-1 flex flex-col max-w-[1920px] mx-auto w-full">
        <Toaster/>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">ห้องสอบ</h1>
          <button 
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-500 text-white text-sm sm:text-base rounded-md hover:bg-blue-600 transition-colors"
            onClick={() => setShowAddModal(true)}
          >
            เพิ่มห้องสอบ
          </button>
        </div>

        {/* Table Container */}
        <div className="bg-white/30 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100 flex-1 flex flex-col">
          <div className="flex-1 flex flex-col min-h-0"> {/* Add min-h-0 to allow flex child to scroll */}
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
              <div className="flex-1 flex flex-col min-h-0"> {/* Nested flex container */}
                <div className="overflow-auto flex-1"> {/* This will scroll */}
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
                                  <td colSpan={5} className="p-2 sm:p-4">
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
                                      className="space-y-4"
                                    >
                                      <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                        {/* Header */}
                                        <div className="p-3 sm:p-4 border-b border-gray-100">
                                          <h4 className="font-semibold text-base sm:text-lg text-gray-700">ตารางสอบ</h4>
                                        </div>
                                        
                                        {/* Tabs - Make sticky and responsive */}
                                        <div className="flex space-x-1 p-2 sm:p-4 bg-gray-50 sticky top-0 z-20">
                                          <button
                                            onClick={() => handleTabChange(room.id, 'ช่วงเช้า')}
                                            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-all flex items-center gap-2
                                              ${(!roomTabs[room.id] || roomTabs[room.id] === 'ช่วงเช้า')
                                                ? 'bg-yellow-100 text-yellow-800 shadow-sm' 
                                                : 'text-gray-600 hover:bg-gray-100'}`}
                                          >
                                            <span>🌅</span>
                                            <span className="hidden sm:inline">ช่วงเช้า</span>
                                            <span className="sm:hidden">เช้า</span>
                                          </button>
                                          <button
                                            onClick={() => handleTabChange(room.id, 'ช่วงบ่าย')}
                                            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-all flex items-center gap-2
                                              ${roomTabs[room.id] === 'ช่วงบ่าย'
                                                ? 'bg-blue-100 text-blue-800 shadow-sm' 
                                                : 'text-gray-600 hover:bg-gray-100'}`}
                                          >
                                            <span>🌇</span>
                                            <span className="hidden sm:inline">ช่วงบ่าย</span>
                                            <span className="sm:hidden">บ่าย</span>
                                          </button>
                                        </div>

                                        {/* Content Container - Adjust max-height based on screen size */}
                                        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                                          <AnimatePresence mode="wait">
                                            <motion.div
                                              key={`${room.id}-${roomTabs[room.id] || 'ช่วงเช้า'}`}
                                              initial={{ opacity: 0 }}
                                              animate={{ opacity: 1 }}
                                              exit={{ opacity: 0 }}
                                              transition={{ duration: 0.2 }}
                                            >
                                              <TabContent 
                                                schedules={filterSchedulesByTimeSlot(
                                                  room.schedules, 
                                                  roomTabs[room.id] === 'ช่วงเช้า' || !roomTabs[room.id]
                                                )}
                                                activeTab={roomTabs[room.id] || 'ช่วงเช้า'}
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
              </div>
            )}
          </div>
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