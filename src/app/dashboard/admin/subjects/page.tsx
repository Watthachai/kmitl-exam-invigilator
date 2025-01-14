"use client";

import { useEffect, useState } from "react";
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import PopupModal from '@/app/components/ui/popup-modal';

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

  useEffect(() => {
    fetchSubjects();
    fetchDepartments();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subjects');
      const data = await response.json();
      setSubjects(data);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      toast.error('Failed to fetch subjects');
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Subjects</h1>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          onClick={() => setShowAddModal(true)}
        >
          Add Subject
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search subjects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border rounded-md"
        />
      </div>

      <div className="bg-white/30 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-white/95 backdrop-blur-sm">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Code</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Department</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Created At</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
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

        {showAddModal && (
          <PopupModal
            title="Add New Subject"
            onClose={() => setShowAddModal(false)}
            onConfirm={handleAddSubject}
            confirmText="Add Subject"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700">Subject Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-md"
                  placeholder="Enter subject code"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700">Subject Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-md"
                  placeholder="Enter subject name"
                  required
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

        {showEditModal && selectedSubject && (
          <PopupModal
            title="Edit Subject"
            onClose={() => setShowEditModal(false)}
            onConfirm={handleEditSubject}
            confirmText="Update Subject"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700">Subject Code</label>
                <input
                  type="text"
                  value={selectedSubject.code}
                  onChange={(e) => setSelectedSubject({ 
                    ...selectedSubject, 
                    code: e.target.value 
                  })}
                  className="w-full border border-gray-300 p-2 rounded-md"
                  placeholder="Enter subject code"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700">Subject Name</label>
                <input
                  type="text"
                  value={selectedSubject.name}
                  onChange={(e) => setSelectedSubject({ 
                    ...selectedSubject, 
                    name: e.target.value 
                  })}
                  className="w-full border border-gray-300 p-2 rounded-md"
                  placeholder="Enter subject name"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700">Department</label>
                <select
                  value={selectedSubject.department.id}
                  onChange={(e) => setSelectedSubject({
                    ...selectedSubject,
                    department: { ...selectedSubject.department, id: e.target.value }
                  })}
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

        {showDeleteModal && selectedSubject && (
          <PopupModal
            title="Delete Subject"
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDeleteSubject}
            confirmText="Yes, Delete"
          >
            <p className="text-gray-700">
              Are you sure you want to delete subject <strong>{selectedSubject.code}</strong> - <strong>{selectedSubject.name}</strong>?
            </p>
          </PopupModal>
        )}
      </div>
    </div>
  );
}