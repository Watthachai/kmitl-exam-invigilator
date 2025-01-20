"use client";

import { useEffect, useState } from "react";
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import PopupModal from '@/app/components/ui/popup-modal';

interface Department {
  id: string;
  name: string;
}

interface Professor {
  id: string;
  name: string;
  department: Department;
  departmentId: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function ProfessorsPage() {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null);
  const [editProfessor, setEditProfessor] = useState<Professor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    departmentId: ''
  });

  useEffect(() => {
    fetchProfessors();
    fetchDepartments();
  }, []);

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

  const handleAddProfessor = async () => {
    try {
      if (!formData.name.trim() || !formData.departmentId) {
        toast.error('Professor name and department are required');
        return;
      }

      const response = await fetch('/api/professors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Professor added successfully');
        setShowAddModal(false);
        setFormData({ name: '', departmentId: '' });
        fetchProfessors();
      } else {
        toast.error('Failed to add professor');
      }
    } catch (error) {
      console.error('Failed to add professor:', error);
      toast.error('Failed to add professor');
    }
  };

  const handleEditProfessor = async () => {
    if (!editProfessor) return;
    try {
      const response = await fetch(`/api/professors/${editProfessor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editProfessor.name }),
      });
      if (response.ok) {
        toast.success('Professor updated successfully');
        setShowEditModal(false);
        fetchProfessors();
      }
    } catch (error) {
      console.error('Failed to update professor:', error);
      toast.error('Failed to update professor');
    }
  };

  const handleDeleteProfessor = async () => {
    if (!selectedProfessor) return;
    try {
      const response = await fetch(`/api/professors/${selectedProfessor.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Professor deleted successfully');
        setShowDeleteModal(false);
        fetchProfessors();
      }
    } catch (error) {
      console.error('Failed to delete professor:', error);
      toast.error('Failed to delete professor');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Toaster/>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Professors</h1>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          onClick={() => setShowAddModal(true)}
        >
          Add Professor
        </button>
      </div>

      <div className="bg-white/30 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-white/95 backdrop-blur-sm">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Professor ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Department</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Created At</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Updated At</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {professors.map((professor) => (
                <tr key={professor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{professor.id}</td>
                  <td className="px-6 py-4">{professor.name}</td>
                  <td className="px-6 py-4">{professor.department.name}</td>
                  <td className="px-6 py-4">
                    {new Date(professor.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {new Date(professor.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditProfessor(professor);
                          setShowEditModal(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProfessor(professor);
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

        {showAddModal && (
          <PopupModal
            title="Add New Professor"
            onClose={() => setShowAddModal(false)}
            onConfirm={handleAddProfessor}
            confirmText="Add Professor"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700">Professor Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter professor name"
                />
              </div>
              <div>
                <label className="block text-gray-700">Department</label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-md"
                  required
                >
                  <option value="">Select Department</option>
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

        {showEditModal && editProfessor && (
          <PopupModal
            title="Edit Professor"
            onClose={() => setShowEditModal(false)}
            onConfirm={handleEditProfessor}
            confirmText="Update Professor"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700">Professor Name</label>
                <input
                  type="text"
                  value={editProfessor.name}
                  onChange={(e) => setEditProfessor({ ...editProfessor, name: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter professor name"
                />
              </div>
            </div>
          </PopupModal>
        )}

        {showDeleteModal && selectedProfessor && (
          <PopupModal
            title="Delete Professor"
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDeleteProfessor}
            confirmText="Yes, Delete"
          >
            <p className="text-gray-700">
              Are you sure you want to delete professor <strong>{selectedProfessor.name}</strong>?
            </p>
          </PopupModal>
        )}
      </div>
    </div>
  );
}