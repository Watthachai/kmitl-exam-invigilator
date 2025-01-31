"use client";

import { useEffect, useState } from "react";
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import PopupModal from '@/app/components/ui/popup-modal';

interface Invigilator {
  id: string;
  name: string;
  type: string;
  departmentId?: string;
  department?: Department;
  professorId?: string;
  professor?: Professor;
  schedules: Schedule[];
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  user?: User;
  quota: number;
  assignedQuota: number;
}

interface Department {
  id: string;
  name: string;
}

interface Professor {
  id: string;
  name: string;
}

interface User {
  id: string;
  name?: string;
  email?: string;
}

interface Schedule {
  id: string;
  date: Date;
  scheduleDateOption: string;
  startTime: Date;
  endTime: Date;
  roomId: string;
  subjectGroupId: string;
}

export default function InvigilatorsPage() {
  const [invigilators, setInvigilators] = useState<Invigilator[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInvigilator, setSelectedInvigilator] = useState<Invigilator | null>(null);
  const [editInvigilator, setEditInvigilator] = useState<Invigilator | null>(null);
  const [newInvigilator, setNewInvigilator] = useState({
    name: '',
    type: 'บุคลากร',
    departmentId: '',
    professorId: ''
  });

  useEffect(() => {
    fetchInvigilators();
    fetchDepartments();
    fetchProfessors();
  }, []);

  const fetchInvigilators = async () => {
    try {
      const response = await fetch('/api/invigilators?include=department,professor,user,schedules');
      const data = await response.json();
      setInvigilators(data);
    } catch (error) {
      console.error('Failed to fetch invigilators:', error);
      toast.error('Failed to fetch invigilators');
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

  const handleAddInvigilator = async () => {
    try {
      // Validate required fields
      if (!newInvigilator.name) {
        toast.error('Name is required');
        return;
      }

      // For อาจารย์, require professorId
      if (newInvigilator.type === 'อาจารย์' && !newInvigilator.professorId) {
        toast.error('Please select a professor');
        return;
      }

      // For บุคลากร, require departmentId
      if (newInvigilator.type === 'บุคลากร' && !newInvigilator.departmentId) {
        toast.error('Please select a department');
        return;
      }

      const response = await fetch('/api/invigilators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newInvigilator,
          // Clear the other ID field based on type
          departmentId: newInvigilator.type === 'อาจารย์' ? null : newInvigilator.departmentId,
          professorId: newInvigilator.type === 'บุคลากร' ? null : newInvigilator.professorId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast.success('Invigilator added successfully');
      setShowAddModal(false);
      setNewInvigilator({ name: '', type: 'บุคลากร', departmentId: '', professorId: '' });
      fetchInvigilators();
    } catch (error) {
      console.error('Failed to add invigilator:', error);
      toast.error(error.message || 'Failed to add invigilator');
    }
  };

  const handleEditInvigilator = async () => {
    if (!editInvigilator) return;
    
    try {
      // Similar validation as handleAddInvigilator
      if (!editInvigilator.name) {
        toast.error('Name is required');
        return;
      }

      if (editInvigilator.type === 'อาจารย์' && !editInvigilator.professorId) {
        toast.error('Please select a professor');
        return;
      }

      if (editInvigilator.type === 'บุคลากร' && !editInvigilator.departmentId) {
        toast.error('Please select a department');
        return;
      }

      const response = await fetch(`/api/invigilators/${editInvigilator.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editInvigilator,
          departmentId: editInvigilator.type === 'อาจารย์' ? null : editInvigilator.departmentId,
          professorId: editInvigilator.type === 'บุคลากร' ? null : editInvigilator.professorId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast.success('Invigilator updated successfully');
      setShowEditModal(false);
      fetchInvigilators();
    } catch (error) {
      console.error('Failed to update invigilator:', error);
      toast.error(error.message || 'Failed to update invigilator');
    }
  };

  const deleteInvigilator = async () => {
    if (!selectedInvigilator) return;
    try {
      const response = await fetch(`/api/invigilators/${selectedInvigilator.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Invigilator deleted successfully');
        setShowDeleteModal(false);
        fetchInvigilators();
      }
    } catch (error) {
      console.error('Failed to delete invigilator:', error);
      toast.error('Failed to delete invigilator');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Toaster/>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">รายการผู้คุมสอบ</h1>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          onClick={() => setShowAddModal(true)}
        >
          เพิ่มผู้คุมสอบ
        </button>
      </div>

      <div className="bg-white/30 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-white/95 backdrop-blur-sm">
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ข้อมูลทั่วไป</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ภาควิชา</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ข้อมูลอาจารย์</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">บัญชี Google</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ข้อมูลโควต้า</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ตารางคุมสอบ</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invigilators.map((invigilator) => (
                <tr key={invigilator.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900">{invigilator.name}</div>
                      <div className="text-sm text-gray-500">รหัส: {invigilator.id}</div>
                      <div className="text-sm text-gray-500">ประเภท: {invigilator.type}</div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {invigilator.departmentId && invigilator.department ? (
                        <>
                          <div className="font-medium text-gray-900">{invigilator.department.name}</div>
                          <div className="text-sm text-gray-500">รหัส: {invigilator.departmentId}</div>
                        </>
                      ) : (
                        <span className="text-gray-400">ไม่มีข้อมูลภาควิชา</span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {invigilator.professorId && invigilator.professor ? (
                        <>
                          <div className="font-medium text-gray-900">{invigilator.professor?.name}</div>
                          <div className="text-sm text-gray-500">รหัส: {invigilator.professorId}</div>
                        </>
                      ) : (
                        <span className="text-orange-400 font-medium italic">เป็นบุคลากร</span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {invigilator.userId && invigilator.user ? (
                        <>
                          <div className="font-medium text-gray-900">
                            {invigilator.user?.name || invigilator.user?.email || 'ไม่ระบุชื่อ'}
                          </div>
                          <div className="text-sm text-gray-500">รหัส: {invigilator.userId}</div>
                        </>
                      ) : (
                        <span className="text-gray-400">ไม่มีบัญชีผู้ใช้</span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="text-sm">
                        <span className="font-medium">โควต้าทั้งหมด:</span> {invigilator.quota}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">ใช้ไปแล้ว:</span> {invigilator.assignedQuota}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">คงเหลือ:</span> {invigilator.quota - invigilator.assignedQuota}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {invigilator.schedules?.length > 0 ? (
                        <div className="text-sm">
                          <span className="font-medium">จำนวนตารางคุมสอบ:</span> {invigilator.schedules.length}
                        </div>
                      ) : (
                        <span className="text-gray-400">ไม่มีตารางคุมสอบ</span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditInvigilator(invigilator);
                          setShowEditModal(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedInvigilator(invigilator);
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
      </div>

      <div className="fixed z-index-50 flex items-center justify-center">
        {showAddModal && (
          <PopupModal
            title="เพิ่มผู้คุมสอบใหม่"
            onClose={() => setShowAddModal(false)}
            onConfirm={handleAddInvigilator}
            confirmText="เพิ่มผู้คุมสอบ"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700">Name</label>
                <input
                  type="text"
                  value={newInvigilator.name}
                  onChange={(e) => setNewInvigilator({ ...newInvigilator, name: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter invigilator name"
                />
              </div>
              <div>
                <label className="block text-gray-700">Type</label>
                <select
                  value={newInvigilator.type}
                  onChange={(e) => setNewInvigilator({ ...newInvigilator, type: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="บุคลากร">บุคลากร</option>
                  <option value="อาจารย์">อาจารย์</option>
                </select>
              </div>

              {newInvigilator.type === 'บุคลากร' && (
                <div>
                  <label className="block text-gray-700">Department</label>
                  <select
                    value={newInvigilator.departmentId}
                    onChange={(e) => setNewInvigilator({ ...newInvigilator, departmentId: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {newInvigilator.type === 'อาจารย์' && (
                <div>
                  <label className="block text-gray-700">Professor</label>
                  <select
                    value={newInvigilator.professorId}
                    onChange={(e) => setNewInvigilator({ ...newInvigilator, professorId: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Professor</option>
                    {professors.map(prof => (
                      <option key={prof.id} value={prof.id}>{prof.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </PopupModal>
        )}

        {showEditModal && editInvigilator && (
          <PopupModal
            title="แก้ไขข้อมูลผู้คุมสอบ"
            onClose={() => setShowEditModal(false)}
            onConfirm={handleEditInvigilator}
            confirmText="บันทึกการแก้ไข"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700">Name</label>
                <input
                  type="text"
                  value={editInvigilator.name}
                  onChange={(e) => setEditInvigilator({ ...editInvigilator, name: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter invigilator name"
                />
              </div>
              <div>
                <label className="block text-gray-700">Type</label>
                <select
                  value={editInvigilator.type}
                  onChange={(e) => setEditInvigilator({ ...editInvigilator, type: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="บุคลากร">บุคลากร</option>
                  <option value="อาจารย์">อาจารย์</option>
                </select>
              </div>

              {editInvigilator.type === 'บุคลากร' && (
                <div>
                  <label className="block text-gray-700">Department</label>
                  <select
                    value={editInvigilator.departmentId}
                    onChange={(e) => setEditInvigilator({ ...editInvigilator, departmentId: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {editInvigilator.type === 'อาจารย์' && (
                <div>
                  <label className="block text-gray-700">Professor</label>
                  <select
                    value={editInvigilator.professorId}
                    onChange={(e) => setEditInvigilator({ ...editInvigilator, professorId: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Professor</option>
                    {professors.map(prof => (
                      <option key={prof.id} value={prof.id}>{prof.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </PopupModal>
        )}

        {showDeleteModal && selectedInvigilator && (
          <PopupModal
            title="ลบผู้คุมสอบ"
            onClose={() => setShowDeleteModal(false)}
            onConfirm={deleteInvigilator}
            confirmText="ยืนยันการลบ"
          >
            <p className="text-gray-700">
              คุณต้องการลบ <strong>{selectedInvigilator.name}</strong> ใช่หรือไม่?
            </p>
          </PopupModal>
        )}
      </div>
    </div>
  );
}