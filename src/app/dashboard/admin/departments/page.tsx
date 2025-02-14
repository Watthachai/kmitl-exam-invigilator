"use client";

import { useEffect, useState } from 'react';
import { FiEdit2, FiTrash2, FiDatabase } from 'react-icons/fi';
import { ImSpinner8 } from 'react-icons/im';
import toast, { Toaster } from 'react-hot-toast';
import PopupModal from '@/app/components/ui/popup-modal';

interface Department {
  id: string;
  name: string;
  codes: string[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    subjects: number;
    professors: number;
    invigilators: number;
  };
}

interface DepartmentFormData {
  name: string;
  codes: string[];
}

export default function DepartmentsPage() {
  // Initialize with empty array to prevent undefined
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [setError] = useState<string | null>(null);

  // Add State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDepartmentData, setNewDepartmentData] = useState<DepartmentFormData>({
    name: '',
    codes: ['']
  });
  
  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDepartment, setEditDepartment] = useState<Department | null>(null);
  
  // Delete State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  // Add Department Handler Function
  const handleAddDepartment = async () => {
    try {
      if (!newDepartmentData.name.trim() || !newDepartmentData.codes[0]?.trim()) {
        toast.error('Department name and primary code are required');
        return;
      }
      
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDepartmentData),
      });

      if (!response.ok) throw new Error('Failed to add department');
      const data = await response.json();
      setDepartments([...departments, data]);
      setNewDepartmentData({ name: '', codes: [''] });
      setShowAddModal(false);
      toast.success('Department added successfully');
    } catch (error) {
      toast.error('Department with this name or code already exists');
      console.error(error);
    }
  };

  //Edit Department Handler Function
  const handleEditDepartment = async () => {
    try {
      if (!editDepartment?.name.trim() || !editDepartment?.codes[0]?.trim()) {
        toast.error('Department name and primary code are required');
        return;
      }

      const response = await fetch(`/api/departments/${editDepartment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editDepartment.name,
          codes: editDepartment.codes
        }),
      });

      if (!response.ok) throw new Error('Failed to update department');
      const data = await response.json();
      const updatedDepartments = departments.map((department) =>
        department.id === data.id ? data : department
      );
      setDepartments(updatedDepartments);
      setEditDepartment(null);
      setShowEditModal(false);
      toast.success('Department updated successfully');
    } catch (error) {
      toast.error('Failed to update department');
      console.error(error);
    }
  }
      
  //Delete Department Handler Function
  const deleteDepartment = async () => {
    if (!selectedDepartment) return;
    try {
      const response = await fetch(`/api/departments/${selectedDepartment.id}`, {
        method: 'DELETE',
      });
  
      if (!response.ok) throw new Error('Failed to delete department');
      const filteredDepartments = departments.filter(
        (department) => department.id !== selectedDepartment.id
      );
      setDepartments(filteredDepartments);
      setSelectedDepartment(null);
      setShowDeleteModal(false);
      toast.success('Department deleted successfully');
    } catch (error) {
      toast.error('Failed to delete department');
      console.error(error);
    }
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/departments');
        if (!response.ok) throw new Error('Failed to fetch departments');
        const data = await response.json();
        // Ensure we always set an array
        setDepartments(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error:', error);
        setDepartments([]); // Reset to empty array on error
        setError('Failed to fetch departments. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDepartments();
  }, [setError]);

  return (
    <div className="p-6 space-y-6">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">จัดการภาควิชา</h1>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          onClick={() => setShowAddModal(true)}
        >
          เพิ่มภาควิชา
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="h-[calc(100vh-12rem)] overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <ImSpinner8 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            </div>
          ) : departments.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <FiDatabase className="w-16 h-16 text-gray-300" />
                <p className="text-gray-500 text-lg">ไม่พบข้อมูลภาควิชา</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  เพิ่มภาควิชา
                </button>
              </div>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="bg-white/95 backdrop-blur-sm sticky top-0 z-10">
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">รหัสภาควิชา</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">รหัสย่อ</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ชื่อภาควิชา</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">วิชา</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">อาจารย์</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ผู้คุมสอบ</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">วันที่เพิ่ม</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">วันที่แก้ไข</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Array.isArray(departments) && departments.length > 0 ? (
                  departments.map((department) => (
                    <tr key={department.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">{department.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {department.codes.map((code, index) => (
                            <span 
                              key={index}
                              className={`px-2 py-0.5 rounded-full text-xs ${
                                index === 0
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">{department.name}</td>
                      <td className="px-6 py-4">{department._count?.subjects || 0}</td>
                      <td className="px-6 py-4">{department._count?.professors || 0}</td>
                      <td className="px-6 py-4">{department._count?.invigilators || 0}</td>
                      <td className="px-6 py-4">
                        {new Date(department.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {new Date(department.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditDepartment(department);
                              setShowEditModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDepartment(department);
                              setShowDeleteModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded-md transition-colors">
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                      No departments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals - Moved outside the table container */}
      {showAddModal && (
        <PopupModal
          title="Add New Department"
          onClose={() => setShowAddModal(false)}
          onConfirm={handleAddDepartment}
          confirmText="Add Department"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700">Department Name</label>
              <input
                type="text"
                value={newDepartmentData.name}
                onChange={(e) => setNewDepartmentData({
                  ...newDepartmentData,
                  name: e.target.value
                })}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter department name"
              />
            </div>
            <div>
              <label className="block text-gray-700">Primary Code</label>
              <input
                type="text"
                value={newDepartmentData.codes[0]}
                onChange={(e) => setNewDepartmentData({
                  ...newDepartmentData,
                  codes: [e.target.value, ...newDepartmentData.codes.slice(1)]
                })}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter primary department code"
              />
            </div>
            <div>
              <label className="block text-gray-700">Additional Codes</label>
              <div className="flex gap-2 flex-wrap">
                {newDepartmentData.codes.slice(1).map((code, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => {
                        const newCodes = [...newDepartmentData.codes];
                        newCodes[index + 1] = e.target.value;
                        setNewDepartmentData({
                          ...newDepartmentData,
                          codes: newCodes
                        });
                      }}
                      className="border border-gray-300 p-2 rounded-md w-24"
                      placeholder="Code"
                    />
                    <button
                      onClick={() => {
                        const newCodes = newDepartmentData.codes.filter((_, i) => i !== index + 1);
                        setNewDepartmentData({
                          ...newDepartmentData,
                          codes: newCodes
                        });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setNewDepartmentData({
                    ...newDepartmentData,
                    codes: [...newDepartmentData.codes, '']
                  })}
                  className="text-blue-500 hover:text-blue-700"
                >
                  + Add Code
                </button>
              </div>
            </div>
          </div>
        </PopupModal>
      )}

      {showEditModal && editDepartment && (
        <PopupModal
          title="Edit Department"
          onClose={() => setShowEditModal(false)}
          onConfirm={handleEditDepartment}
          confirmText="Update Department"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700">Primary Code</label>
              <input
                type="text"
                value={editDepartment.codes[0]}
                onChange={(e) => setEditDepartment({
                  ...editDepartment,
                  codes: [e.target.value, ...editDepartment.codes.slice(1)]
                })}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter primary code"
              />
            </div>
            <div>
              <label className="block text-gray-700">Additional Codes</label>
              <div className="flex gap-2 flex-wrap">
                {editDepartment?.codes.slice(1).map((code, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => {
                        if (!editDepartment) return;
                        const newCodes = [...editDepartment.codes];
                        newCodes[index + 1] = e.target.value;
                        setEditDepartment({
                          ...editDepartment,
                          codes: newCodes
                        });
                      }}
                      className="border border-gray-300 p-2 rounded-md w-24"
                      placeholder="Code"
                    />
                    <button
                      onClick={() => {
                        if (!editDepartment) return;
                        const newCodes = editDepartment.codes.filter((_, i) => i !== index + 1);
                        setEditDepartment({
                          ...editDepartment,
                          codes: newCodes
                        });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => editDepartment && setEditDepartment({
                    ...editDepartment,
                    codes: [...editDepartment.codes, '']
                  })}
                  className="text-blue-500 hover:text-blue-700"
                >
                  + Add Code
                </button>
              </div>
            </div>
          </div>
        </PopupModal>
      )}

      {showDeleteModal && selectedDepartment && (
        <PopupModal
          title="Delete Department"
          onClose={() => setShowDeleteModal(false)}
          onConfirm={deleteDepartment}
          confirmText="Yes, Delete"
        >
          <p className="text-gray-700">
            Are you sure you want to delete <strong>{selectedDepartment.name}</strong>?
          </p>
        </PopupModal>
      )}
    </div>
  );
}