'use client';

import { useEffect, useState } from "react";
import { FiEdit2, FiTrash2, FiDatabase } from 'react-icons/fi';
import { ImSpinner8 } from 'react-icons/im';
import toast, { Toaster } from 'react-hot-toast';
import PopupModal from '@/app/components/ui/popup-modal';

interface Subject {
  id: string;
  code: string;
  name: string;
}

interface Professor {
  id: string;
  name: string;
}

interface SubjectGroup {
  id: string;
  groupNumber: string;
  year: number;
  studentCount: number;
  subject: Subject;
  professor: Professor;
  createdAt: Date;
  updatedAt: Date;
}

export default function SubjectGroupsPage() {
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SubjectGroup | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [formData, setFormData] = useState({
    groupNumber: '',
    year: new Date().getFullYear(),
    studentCount: 0,
    subjectId: '',
    professorId: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSubjectGroups();
    fetchFormData();
  }, []);

  const fetchSubjectGroups = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/subject-groups');
      const data = await response.json();
      setSubjectGroups(data);
    } catch (error) {
        console.error('Failed to fetch subject groups:', error);
      toast.error('ไม่สามารถโหลดข้อมูลกลุ่มเรียนได้');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [subjectsRes, professorsRes] = await Promise.all([
        fetch('/api/subjects'),
        fetch('/api/professors')
      ]);
      setSubjects(await subjectsRes.json());
      setProfessors(await professorsRes.json());
    } catch (error) {
        console.error('Failed to fetch form data:', error);
      toast.error('Failed to fetch form data');
    }
  };

  const handleAddSubjectGroup = async () => {
    try {
      const response = await fetch('/api/subject-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        toast.success('เพิ่มกลุ่มเรียนสำเร็จ');
        setShowAddModal(false);
        setFormData({
          groupNumber: '',
          year: new Date().getFullYear(),
          studentCount: 0,
          subjectId: '',
          professorId: ''
        });
        fetchSubjectGroups();
      } else {
        toast.error('Failed to add subject group');
      }
    } catch (error) {
      console.error('Error adding subject group:', error);
      toast.error('ไม่สามารถเพิ่มกลุ่มเรียนได้');
    }
  };
  
  const handleEditSubjectGroup = async () => {
    if (!selectedGroup) return;
    
    try {
      const response = await fetch(`/api/subject-groups/${selectedGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupNumber: selectedGroup.groupNumber,
          year: selectedGroup.year,
          studentCount: selectedGroup.studentCount,
          subjectId: selectedGroup.subject.id,
          professorId: selectedGroup.professor.id
        }),
      });
  
      if (response.ok) {
        toast.success('Subject group updated successfully');
        setShowEditModal(false);
        setSelectedGroup(null);
        fetchSubjectGroups();
      } else {
        toast.error('Failed to update subject group');
      }
    } catch (error) {
      console.error('Error updating subject group:', error);
      toast.error('Failed to update subject group');
    }
  };
  
  const handleDeleteSubjectGroup = async () => {
    if (!selectedGroup) return;
  
    try {
      const response = await fetch(`/api/subject-groups/${selectedGroup.id}`, {
        method: 'DELETE',
      });
  
      if (response.ok) {
        toast.success('Subject group deleted successfully');
        setShowDeleteModal(false);
        setSelectedGroup(null);
        fetchSubjectGroups();
      } else {
        toast.error('Failed to delete subject group');
      }
    } catch (error) {
      console.error('Error deleting subject group:', error);
      toast.error('Failed to delete subject group');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Toaster/>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">กลุ่มเรียน</h1>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          onClick={() => setShowAddModal(true)}
        >
          เพิ่มกลุ่มเรียน
        </button>
      </div>

      <div className="bg-white/30 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100">
        <div className="h-[calc(100vh-16rem)] overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <ImSpinner8 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            </div>
          ) : subjectGroups.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <FiDatabase className="w-16 h-16 text-gray-300" />
                <p className="text-gray-500 text-lg">ไม่พบข้อมูลกลุ่มเรียน</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  เพิ่มกลุ่มเรียน
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
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">กลุ่ม</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ชั้นปี</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">จำนวนนักศึกษา</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">อาจารย์ผู้สอน</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subjectGroups.map((group) => (
                    <tr key={group.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">{group.subject.code}</td>
                      <td className="px-6 py-4">{group.subject.name}</td>
                      <td className="px-6 py-4">{group.groupNumber}</td>
                      <td className="px-6 py-4">{group.year}</td>
                      <td className="px-6 py-4">{group.studentCount}</td>
                      <td className="px-6 py-4">{group.professor.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedGroup(group);
                              setShowEditModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedGroup(group);
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

        {(showAddModal || showEditModal || showDeleteModal) && (
          <div className="fixed inset-0 z-[100]">
            {showAddModal && (
              <PopupModal
                title="เพิ่มกลุ่มเรียนใหม่"
                onClose={() => setShowAddModal(false)}
                onConfirm={handleAddSubjectGroup}
                confirmText="เพิ่มกลุ่มเรียน"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700">วิชา</label>
                      <select
                        value={formData.subjectId}
                        onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                        className="w-full border border-gray-300 p-2 rounded-md"
                        required
                      >
                        <option value="">เลือกวิชา</option>
                        {subjects.map((subject: Subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.code} - {subject.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700">อาจารย์ผู้สอน</label>
                      <select
                        value={formData.professorId}
                        onChange={(e) => setFormData({ ...formData, professorId: e.target.value })}
                        className="w-full border border-gray-300 p-2 rounded-md"
                        required
                      >
                        <option value="">เลือกอาจารย์</option>
                        {professors.map((professor: Professor) => (
                          <option key={professor.id} value={professor.id}>
                            {professor.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-700">หมายเลขกลุ่ม</label>
                      <input
                        type="text"
                        value={formData.groupNumber}
                        onChange={(e) => setFormData({ ...formData, groupNumber: e.target.value })}
                        className="w-full border border-gray-300 p-2 rounded-md"
                        placeholder="e.g. 901"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700">ชั้นปี</label>
                      <input
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                        className="w-full border border-gray-300 p-2 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700">จำนวนนักศึกษา</label>
                      <input
                        type="number"
                        value={formData.studentCount}
                        onChange={(e) => setFormData({ ...formData, studentCount: parseInt(e.target.value) })}
                        className="w-full border border-gray-300 p-2 rounded-md"
                        required
                      />
                    </div>
                  </div>
                </div>
              </PopupModal>
            )}

            {showEditModal && selectedGroup && (
              <PopupModal
                title="แก้ไขกลุ่มเรียน"
                onClose={() => setShowEditModal(false)}
                onConfirm={handleEditSubjectGroup}
                confirmText="บันทึกการแก้ไข"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700">วิชา</label>
                      <select
                        value={selectedGroup.subject.id}
                        onChange={(e) => setSelectedGroup({ 
                          ...selectedGroup, 
                          subject: { ...selectedGroup.subject, id: e.target.value } 
                        })}
                        className="w-full border border-gray-300 p-2 rounded-md"
                        required
                      >
                        <option value="">เลือกวิชา</option>
                        {subjects.map((subject: Subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.code} - {subject.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700">อาจารย์ผู้สอน</label>
                      <select
                        value={selectedGroup.professor.id}
                        onChange={(e) => setSelectedGroup({
                          ...selectedGroup,
                          professor: { ...selectedGroup.professor, id: e.target.value }
                        })}
                        className="w-full border border-gray-300 p-2 rounded-md"
                        required
                      >
                        <option value="">เลือกอาจารย์</option>
                        {professors.map((professor: Professor) => (
                          <option key={professor.id} value={professor.id}>
                            {professor.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-700">หมายเลขกลุ่ม</label>
                      <input
                        type="text"
                        value={selectedGroup.groupNumber}
                        onChange={(e) => setSelectedGroup({
                          ...selectedGroup,
                          groupNumber: e.target.value
                        })}
                        className="w-full border border-gray-300 p-2 rounded-md"
                        placeholder="e.g. 901"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700">ชั้นปี</label>
                      <input
                        type="number"
                        value={selectedGroup.year}
                        onChange={(e) => setSelectedGroup({
                          ...selectedGroup,
                          year: parseInt(e.target.value)
                        })}
                        className="w-full border border-gray-300 p-2 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700">จำนวนนักศึกษา</label>
                      <input
                        type="number"
                        value={selectedGroup.studentCount}
                        onChange={(e) => setSelectedGroup({
                          ...selectedGroup,
                          studentCount: parseInt(e.target.value)
                        })}
                        className="w-full border border-gray-300 p-2 rounded-md"
                        required
                      />
                    </div>
                  </div>
                </div>
              </PopupModal>
            )}

            {showDeleteModal && selectedGroup && (
              <PopupModal
                title="ลบกลุ่มเรียน"
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteSubjectGroup}
                confirmText="ยืนยันการลบ"
              >
                <p className="text-gray-700">
                  คุณต้องการลบกลุ่มเรียน {selectedGroup.subject.code} - {selectedGroup.subject.name} กลุ่ม {selectedGroup.groupNumber} ใช่หรือไม่?
                </p>
              </PopupModal>
            )}
          </div>
        )}
      </div>
    </div>
  );
}