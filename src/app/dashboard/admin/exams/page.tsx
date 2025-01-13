'use client';

import { useEffect, useState } from "react";
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import PopupModal from '@/app/components/ui/popup-modal';
import { Invigilator } from "@prisma/client";

interface SubjectGroup {
  id: string;
  groupNumber: string;
  subject: {
    code: string;
    name: string;
  };
}
interface Schedule {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  building: string;
  roomNumber: string;
  subjectGroup: {
    id: string;
    groupNumber: string;
    subject: {
      code: string;
      name: string;
    };
  };
  invigilator: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
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
  const [formData, setFormData] = useState({
    subjectGroupId: '',
    date: '',
    startTime: '',
    endTime: '',
    building: '',
    roomNumber: '',
    invigilatorId: ''
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

  const handleAddSchedule = async () => {
    try {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectGroupId: formData.subjectGroupId,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          building: formData.building,
          roomNumber: formData.roomNumber,
          invigilatorId: formData.invigilatorId
        }),
      });

      if (response.ok) {
        toast.success('Exam schedule added successfully');
        setShowAddModal(false);
        setFormData({
          subjectGroupId: '',
          date: '',
          startTime: '',
          endTime: '',
          building: '',
          roomNumber: '',
          invigilatorId: ''
        });
        fetchSchedules();
      } else {
        toast.error('Failed to add exam schedule');
      }
    } catch (error) {
      console.error('Error adding exam schedule:', error);
      toast.error('Failed to add exam schedule');
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
          building: editSchedule.building,
          roomNumber: editSchedule.roomNumber,
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

      <div className="bg-white/30 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-white/95 backdrop-blur-sm">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Subject</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Group</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Time</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Location</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Invigilator</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {schedule.subjectGroup.subject.code} - {schedule.subjectGroup.subject.name}
                  </td>
                  <td className="px-6 py-4">{schedule.subjectGroup.groupNumber}</td>
                  <td className="px-6 py-4">
                    {new Date(schedule.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {new Date(schedule.startTime).toLocaleTimeString()} - 
                    {new Date(schedule.endTime).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4">
                    {schedule.building} Room {schedule.roomNumber}
                  </td>
                  <td className="px-6 py-4">{schedule.invigilator.name}</td>
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
                  <label className="block text-gray-700">Building</label>
                  <input
                    type="text"
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter building"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700">Room Number</label>
                  <input
                    type="text"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter room number"
                    required
                  />
                </div>
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
                    value={editSchedule.building}
                    onChange={(e) => setEditSchedule({
                      ...editSchedule,
                      building: e.target.value
                    })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700">Room Number</label>
                  <input
                    type="text"
                    value={editSchedule.roomNumber}
                    onChange={(e) => setEditSchedule({
                      ...editSchedule,
                      roomNumber: e.target.value
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