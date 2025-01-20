"use client";

import { useEffect, useState } from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import PopupModal from '@/app/components/ui/popup-modal';

interface Department {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);

  // Add State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDepartment, setNewDepartment] = useState('');
  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDepartment, setEditDepartment] = useState<Department | null>(null);
  // Delete State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  // Add Department Handler Function
  const handleAddDepartment = async () => {
    try {
      if (!newDepartment.trim()) {
        toast.error('Department name is required');
        return;
      }
      
          const response = await fetch('/api/departments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: newDepartment }),
          });
      
          if (!response.ok) throw new Error('Failed to add department');
          const data = await response.json();
          setDepartments([...departments, data]);
          setNewDepartment('');
          setShowAddModal(false);
          toast.success('Department added successfully');
        } catch (error) {
          toast.error('Failed to add department');
          console.error(error);
        }
  };

      //Edit Department Handler Function
      const handleEditDepartment = async () => {
        try {
          if (!editDepartment) return;
          const response = await fetch(`/api/departments/${editDepartment.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: editDepartment.name }),
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
        const response = await fetch('/api/departments');
        const data = await response.json();
        setDepartments(data);
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <Toaster position="top-center" />
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Departments</h1>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        onClick={() => setShowAddModal(true)}
        >
          Add Department
        </button>
      </div>

      <div className="bg-white/30 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-white/95 backdrop-blur-sm">
                <tr className="border-b border-gray-100">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Department ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Department Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Created At</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Updated At</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {departments.map((department) => (
                <tr key={department.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{department.id}</td>
                    <td className="px-6 py-4">{department.name}</td>
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
                ))}
            </tbody>
          </table>
        </div>
        

        {/*POPUP ZONE*/}
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
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter department name"
                />
            </div>
            </div>
        </PopupModal>
        )}

        {showEditModal && (
        <PopupModal
            title="Edit Department"
            onClose={() => setShowEditModal(false)}
            onConfirm={handleEditDepartment}
            confirmText="Update Department"
        >
            <div className="space-y-4">
            <div>
                <label className="block text-gray-700">Department Name</label>
                <input
                type="text"
                value={editDepartment?.name}
                onChange={(e) => editDepartment && setEditDepartment({ ...editDepartment, name: e.target.value } as Department)}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter department name"
                />
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
    </div>

    );
}