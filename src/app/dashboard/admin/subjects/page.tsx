"use client";

import { useEffect, useState } from "react";
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import PopupModal from '@/app/components/ui/popup-modal';
import { ImSpinner8 } from 'react-icons/im';
import { FiDatabase } from 'react-icons/fi';

interface Subject {
  id: string;
  code: string;
  name: string;
  department: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface Department {
  id: string;
  name: string;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    departmentId: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSubjects();
    fetchDepartments();
  }, []);

  const fetchSubjects = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/subjects');
      const data = await response.json();
      setSubjects(data);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      toast.error('ไม่สามารถโหลดข้อมูลวิชาได้');
    } finally {
      setIsLoading(false);
    }
  };

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

  const filteredSubjects = subjects.filter((subject) =>
    subject.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.department.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSubject = async () => {
    try {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        toast.success('Subject added successfully');
        setShowAddModal(false);
        setFormData({ code: '', name: '', departmentId: '' });
        fetchSubjects();
      } else {
        toast.error('Failed to add subject');
      }
    } catch (error) {
      console.error('Failed to add subject:', error);
      toast.error('Failed to add subject');
    }
  };

  const handleEditSubject = async () => {
    if (!selectedSubject) return;
    try {
      const response = await fetch(`/api/subjects/${selectedSubject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: selectedSubject.code,
          name: selectedSubject.name,
          departmentId: selectedSubject.department.id
        }),
      });

      if (response.ok) {
        toast.success('Subject updated successfully');
        setShowEditModal(false);
        setSelectedSubject(null);
        fetchSubjects();
      } else {
        toast.error('Failed to update subject');
      }
    } catch (error) {
      console.error('Failed to update subject:', error);
      toast.error('Failed to update subject');
    }
  };

  const handleDeleteSubject = async () => {
    if (!selectedSubject) return;
    try {
      const response = await fetch(`/api/subjects/${selectedSubject.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Subject deleted successfully');
        setShowDeleteModal(false);
        setSelectedSubject(null);
        fetchSubjects();
      } else {
        toast.error('Failed to delete subject');
      }
    } catch (error) {
      console.error('Failed to delete subject:', error);
      toast.error('Failed to delete subject');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Toaster/>
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">รายวิชา</h1>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          onClick={() => setShowAddModal(true)}
        >
          เพิ่มรายวิชา
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="ค้นหารายวิชา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
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
          ) : filteredSubjects.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <FiDatabase className="w-16 h-16 text-gray-300" />
                <p className="text-gray-500 text-lg">ไม่พบข้อมูลรายวิชา</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  เพิ่มรายวิชา
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-white/95 backdrop-blur-sm sticky top-0">
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">รหัสวิชา</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ชื่อวิชา</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ภาควิชา</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">วันที่สร้าง</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSubjects.map((subject) => (
                    <tr key={subject.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">{subject.code}</td>
                      <td className="px-6 py-4">{subject.name}</td>
                      <td className="px-6 py-4">{subject.department.name}</td>
                      <td className="px-6 py-4">{new Date(subject.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedSubject(subject);
                              setShowEditModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSubject(subject);
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
          )}
        </div>
      </div>

      {/* Modals - Moved outside table container */}
      {(showAddModal || showEditModal || showDeleteModal) && (
        <div className="fixed inset-0 z-[100]">
          {showAddModal && (
            <PopupModal
              title="เพิ่มรายวิชาใหม่"
              onClose={() => setShowAddModal(false)}
              onConfirm={handleAddSubject}
              confirmText="เพิ่มรายวิชา"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700">รหัสวิชา</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    placeholder="กรอกรหัสวิชา"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700">ชื่อวิชา</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    placeholder="กรอกชื่อวิชา"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700">ภาควิชา</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    required
                  >
                    <option value="">เลือกภาควิชา</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </PopupModal>
          )}

          {showEditModal && selectedSubject && (
            <PopupModal
              title="แก้ไขรายวิชา"
              onClose={() => setShowEditModal(false)}
              onConfirm={handleEditSubject}
              confirmText="บันทึกการแก้ไข"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700">รหัสวิชา</label>
                  <input
                    type="text"
                    value={selectedSubject.code}
                    onChange={(e) => setSelectedSubject({ 
                      ...selectedSubject, 
                      code: e.target.value 
                    })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    placeholder="กรอกรหัสวิชา"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700">ชื่อวิชา</label>
                  <input
                    type="text"
                    value={selectedSubject.name}
                    onChange={(e) => setSelectedSubject({ 
                      ...selectedSubject, 
                      name: e.target.value 
                    })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    placeholder="กรอกชื่อวิชา"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700">ภาควิชา</label>
                  <select
                    value={selectedSubject.department.id}
                    onChange={(e) => setSelectedSubject({
                      ...selectedSubject,
                      department: { ...selectedSubject.department, id: e.target.value }
                    })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    required
                  >
                    <option value="">เลือกภาควิชา</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </PopupModal>
          )}

          {showDeleteModal && selectedSubject && (
            <PopupModal
              title="ลบรายวิชา"
              onClose={() => setShowDeleteModal(false)}
              onConfirm={handleDeleteSubject}
              confirmText="ยืนยันการลบ"
            >
              <p className="text-gray-700">
                คุณต้องการลบรายวิชา <strong>{selectedSubject.code}</strong> - <strong>{selectedSubject.name}</strong> ใช่หรือไม่?
              </p>
            </PopupModal>
          )}
        </div>
      )}
    </div>
  );
}