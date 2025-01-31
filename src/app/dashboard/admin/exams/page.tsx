'use client';

import { useEffect, useState } from "react";
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import PopupModal from '@/app/components/ui/popup-modal';
import { Invigilator } from "@prisma/client";
import Highlight from '@/app/components/ui/highlight';

interface SubjectGroup {
  id: string;
  groupNumber: string;
  subject: {
    code: string;
    name: string;
  };
}
interface Room {
  id: string;
  building: string;
  roomNumber: string;
}
interface Schedule {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  notes?: string;
  room: {
    id: string;
    building: string;
    roomNumber: string;
    capacity?: number;
  };
  subjectGroup: {
    id: string;
    groupNumber: string;
    year?: number;
    studentCount?: number;
    professor: {
      name: string;
    };
    subject: {
      code: string;
      name: string;
      department: {
        name: string;
      };
    };
  };
  invigilator: {
    id: string;
    name: string;
    type?: string;
  };
}

interface Department {
  id: string;
  name: string;
}

interface Professor {
  id: string;
  name: string;
  department: {
    name: string;
  };
}

export default function ExamsPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null);
  const [subjectGroups, setSubjectGroups] = useState([]);
  const [invigilators, setInvigilators] = useState([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [formData, setFormData] = useState({
    subjectGroupId: '',
    date: '',
    startTime: '',
    endTime: '',
    roomId: '',
    invigilatorId: ''
  });

  const [filters, setFilters] = useState({
    date: '',
    timeSlot: '', // 'ช่วงเช้า' or 'ช่วงบ่าย'
    department: '',
    professor: '',
    building: '',
    searchQuery: ''
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/schedules');
      const data = await response.json();
      setSchedules(data);
    } catch (error) {
      console.error('Failed to fetch exam schedules:', error);
      toast.error('Failed to fetch exam schedules');
    }
  };

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const [subjectGroupsRes, invigilatorsRes] = await Promise.all([
          fetch('/api/subject-groups'),
          fetch('/api/invigilators')
        ]);
        const subjectGroups = await subjectGroupsRes.json();
        const invigilators = await invigilatorsRes.json();
        setSubjectGroups(subjectGroups);
        setInvigilators(invigilators);
      } catch (error) {
        console.error('Failed to fetch form data:', error);
        toast.error('Failed to fetch form data');
      }
    };
    fetchFormData();
  }, []);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch rooms');
      }
      
      setRooms(result.data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      toast.error('Failed to fetch rooms');
    }
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch('/api/departments');
        const data = await response.json();
        setDepartments(data);
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        toast.error('Failed to fetch departments');
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchProfessors = async () => {
      try {
        const response = await fetch('/api/professors');
        const data = await response.json();
        setProfessors(data);
      } catch (error) {
        console.error('Failed to fetch professors:', error);
        toast.error('Failed to fetch professors');
      }
    };
    fetchProfessors();
  }, []);

  const handleAddSchedule = async () => {
    try {
      if (!formData.subjectGroupId || !formData.date || !formData.startTime || 
          !formData.endTime || !formData.roomId || !formData.invigilatorId) {
        toast.error('Please fill all required fields');
        return;
      }
  
      // Format dates to match Prisma schema
      const dateOnly = new Date(formData.date).toISOString().split('T')[0];
      const startDateTime = new Date(`${dateOnly}T${formData.startTime}:00`);
      const endDateTime = new Date(`${dateOnly}T${formData.endTime}:00`);
  
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectGroupId: formData.subjectGroupId,
          date: dateOnly,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          roomId: formData.roomId,
          invigilatorId: formData.invigilatorId
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create schedule');
      }
  
      await response.json();
      toast.success('Exam schedule added successfully');
      setShowAddModal(false);
      setFormData({
        subjectGroupId: '',
        date: '',
        startTime: '',
        endTime: '',
        roomId: '',
        invigilatorId: ''
      });
      fetchSchedules();
    } catch (error) {
      console.error('Error adding schedule:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add schedule');
    }
  };

  const handleEditSchedule = async () => {
    if (!editSchedule) return;

    try {
      const response = await fetch(`/api/schedules/${editSchedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectGroupId: editSchedule.subjectGroup.id,
          date: editSchedule.date,
          startTime: editSchedule.startTime,
          endTime: editSchedule.endTime,
          roomId: editSchedule.room.id,
          invigilatorId: editSchedule.invigilator.id
        }),
      });

      if (response.ok) {
        toast.success('Exam schedule updated successfully');
        setShowEditModal(false);
        setEditSchedule(null);
        fetchSchedules();
      } else {
        toast.error('Failed to update exam schedule');
      }
    } catch (error) {
      console.error('Error updating exam schedule:', error);
      toast.error('Failed to update exam schedule');
    }
  };

  const handleDeleteSchedule = async () => {
    if (!selectedSchedule) return;

    try {
      const response = await fetch(`/api/schedules/${selectedSchedule.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Exam schedule deleted successfully');
        setShowDeleteModal(false);
        setSelectedSchedule(null);
        fetchSchedules();
      } else {
        toast.error('Failed to delete exam schedule');
      }
    } catch (error) {
      console.error('Error deleting exam schedule:', error);
      toast.error('Failed to delete exam schedule');
    }
  };

  // Update filter logic
  const filteredSchedules = schedules.filter(schedule => {
    // Date filter
    const matchesDate = !filters.date || 
      new Date(schedule.date).toISOString().split('T')[0] === filters.date;
  
    // Time slot filter
    const matchesTimeSlot = !filters.timeSlot || (() => {
      const startTime = new Date(schedule.startTime).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
      
      if (filters.timeSlot === 'MORNING') {
        return startTime === '08:30';
      }
      if (filters.timeSlot === 'AFTERNOON') {
        return startTime === '13:30';
      }
      return true;
    })();
  
    // Add department filter
    const matchesDepartment = !filters.department || 
      schedule.subjectGroup.subject.department.name === filters.department;

    // Add professor filter
    const matchesProfessor = !filters.professor || 
      schedule.subjectGroup.professor.name === filters.professor;

    // Search filter
    const searchQuery = filters.searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      schedule.room.building.toLowerCase().includes(searchQuery) ||
      schedule.room.roomNumber.toLowerCase().includes(searchQuery) ||
      `${schedule.room.building} ${schedule.room.roomNumber}`.toLowerCase().includes(searchQuery) ||
      schedule.subjectGroup.subject.code.toLowerCase().includes(searchQuery) ||
      schedule.subjectGroup.subject.name.toLowerCase().includes(searchQuery);
  
    return matchesDate && matchesTimeSlot && matchesDepartment && matchesSearch && matchesProfessor;
  });

  return (
    <div className="p-6 space-y-6">
      <Toaster/>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Exam Schedules</h1>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          onClick={() => setShowAddModal(true)}
        >
          Add Exam Schedule
        </button>
      </div>

      <div className="bg-white/30 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="grid grid-cols-6 gap-4"> {/* Changed from md:grid-cols-4 to grid-cols-6 */}
          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"> {/* Reduced mb-2 to mb-1 */}
              Exam Date
            </label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
            />
          </div>

          {/* Time Slot Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Slot
            </label>
            <select
              value={filters.timeSlot}
              onChange={(e) => setFilters({ ...filters, timeSlot: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white text-sm"
            >
              <option value="">All Times</option>
              <option value="MORNING">Morning</option>
              <option value="AFTERNOON">Afternoon</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white text-sm"
            >
              <option value="">All Depts</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Professor Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Professor
            </label>
            <select
              value={filters.professor}
              onChange={(e) => setFilters({ ...filters, professor: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white text-sm"
            >
              <option value="">All Profs</option>
              {professors.map((prof) => (
                <option key={prof.id} value={prof.name}>
                  {prof.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                placeholder="Search..."
                className="w-full px-8 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
              />
              <svg
                className="absolute left-2 top-2 h-4 w-4 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-end">
            <button
              onClick={() => setFilters({
                date: '',
                timeSlot: '',
                department: '',
                professor: '',
                building: '',
                searchQuery: ''
              })}
              className="w-full px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all flex items-center justify-center gap-1 text-sm"
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white/30 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
          <thead className="bg-white/95 backdrop-blur-sm">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">วันที่</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">เวลา</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">วิชา</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">กลุ่มเรียน</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ชั้นปี</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">จำนวน นศ.</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ผู้สอน</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">อาคาร</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ห้อง</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">จำนวน</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ภาควิชา</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ตำแหน่งผู้คุมสอบ</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ชื่อเจ้าหน้าที่</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">หมายเหตุ</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSchedules.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {new Date(schedule.date).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-6 py-4">
                    {new Date(schedule.startTime).toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })} - {' '}
                    {new Date(schedule.endTime).toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <Highlight 
                      text={`${schedule.subjectGroup.subject.code} - ${schedule.subjectGroup.subject.name}`}
                      search={filters.searchQuery}
                    />
                  </td>
                  <td className="px-6 py-4">{schedule.subjectGroup.groupNumber}</td>
                  <td className="px-6 py-4">{schedule.subjectGroup.year || '-'}</td>
                  <td className="px-6 py-4">{schedule.subjectGroup.studentCount || '-'}</td>
                  <td className="px-6 py-4">{schedule.subjectGroup.professor?.name || '-'}</td>
                  <td className="px-6 py-4">{schedule.room.building}</td>
                  <td className="px-6 py-4">{schedule.room.roomNumber}</td>
                  <td className="px-6 py-4">{schedule.room.capacity || '-'}</td>
                  <td className="px-6 py-4">{schedule.subjectGroup.subject.department.name || '-'}</td>
                  <td className="px-6 py-4">{schedule.invigilator.type || '-'}</td>
                  <td className="px-6 py-4">{schedule.invigilator.name}</td>
                  <td className="px-6 py-4">{schedule.notes || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditSchedule(schedule);
                          setShowEditModal(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSchedule(schedule);
                          setShowDeleteModal(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Schedule Modal */}
        {showAddModal && (
          <PopupModal
            title="Add New Exam Schedule"
            onClose={() => setShowAddModal(false)}
            onConfirm={handleAddSchedule}
            confirmText="Add Schedule"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700">Subject Group</label>
                <select
                  value={formData.subjectGroupId}
                  onChange={(e) => setFormData({ ...formData, subjectGroupId: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Subject Group</option>
                  {subjectGroups.map((group: SubjectGroup) => (
                    <option key={group.id} value={group.id}>
                      {group.subject.code} - {group.subject.name} (Group {group.groupNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700">Start Time</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700">End Time</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700">Room</label>
                  <select
                    value={formData.roomId}
                    onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    required
                  >
                    <option value="">Select Room</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.building} - {room.roomNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700">Invigilator</label>
                  <select
                    value={formData.invigilatorId}
                    onChange={(e) => setFormData({ ...formData, invigilatorId: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Invigilator</option>
                    {invigilators.map((invigilator: Invigilator) => (
                      <option key={invigilator.id} value={invigilator.id}>
                        {invigilator.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </PopupModal>
        )}

        {/* Edit Schedule Modal */}
        {showEditModal && editSchedule && (
          <PopupModal
            title="Edit Exam Schedule"
            onClose={() => setShowEditModal(false)}
            onConfirm={handleEditSchedule}
            confirmText="Update Schedule"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700">Subject Group</label>
                  <select
                    value={editSchedule.subjectGroup.id}
                    onChange={(e) => setEditSchedule({
                      ...editSchedule,
                      subjectGroup: { ...editSchedule.subjectGroup, id: e.target.value }
                    })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    required
                  >
                    <option value="">Select Subject Group</option>
                    {subjectGroups.map((group: SubjectGroup) => (
                      <option key={group.id} value={group.id}>
                        {group.subject.code} - {group.subject.name} (Group {group.groupNumber})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700">Invigilator</label>
                  <select
                    value={editSchedule.invigilator.id}
                    onChange={(e) => setEditSchedule({
                      ...editSchedule,
                      invigilator: { ...editSchedule.invigilator, id: e.target.value }
                    })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    required
                  >
                    <option value="">Select Invigilator</option>
                    {invigilators.map((invigilator: Invigilator) => (
                      <option key={invigilator.id} value={invigilator.id}>
                        {invigilator.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700">Date</label>
                  <input
                    type="date"
                    value={new Date(editSchedule.date).toISOString().split('T')[0]}
                    onChange={(e) => setEditSchedule({
                      ...editSchedule,
                      date: new Date(e.target.value)
                    })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700">Start Time</label>
                  <input
                    type="time"
                    value={new Date(editSchedule.startTime).toLocaleTimeString('en-US', { hour12: false })}
                    onChange={(e) => setEditSchedule({
                      ...editSchedule,
                      startTime: new Date(`${editSchedule.date.toDateString()} ${e.target.value}`)
                    })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700">End Time</label>
                  <input
                    type="time"
                    value={new Date(editSchedule.endTime).toLocaleTimeString('en-US', { hour12: false })}
                    onChange={(e) => setEditSchedule({
                      ...editSchedule,
                      endTime: new Date(`${editSchedule.date.toDateString()} ${e.target.value}`)
                    })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700">Building</label>
                  <input
                    type="text"
                    value={editSchedule.room.building}
                    onChange={(e) => setEditSchedule({
                      ...editSchedule,
                      room: { ...editSchedule.room, building: e.target.value }
                    })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700">Room Number</label>
                  <input
                    type="text"
                    value={editSchedule.room.roomNumber}
                    onChange={(e) => setEditSchedule({
                      ...editSchedule,
                      room: { ...editSchedule.room, roomNumber: e.target.value }
                    })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    required
                  />
                </div>
              </div>
            </div>
          </PopupModal>
        )}

        {/* Delete Schedule Modal */}
        {showDeleteModal && selectedSchedule && (
          <PopupModal
            title="Delete Exam Schedule"
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDeleteSchedule}
            confirmText="Yes, Delete"
          >
            <p className="text-gray-700">
              Are you sure you want to delete this exam schedule for{' '}
              <strong>{selectedSchedule.subjectGroup.subject.name}</strong> on{' '}
              <strong>{new Date(selectedSchedule.date).toLocaleDateString()}</strong>?
            </p>
          </PopupModal>
        )}
      </div>
    </div>
  );
}