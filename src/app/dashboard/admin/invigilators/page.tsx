"use client";

import { useEffect, useState } from "react";
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import PopupModal from '@/app/components/ui/popup-modal';

interface Invigilator {
  id: string;
  name: string;
  type: 'INTERNAL' | 'EXTERNAL' | 'STAFF';
  professorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function InvigilatorsPage() {
  const [invigilators, setInvigilators] = useState<Invigilator[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInvigilator, setSelectedInvigilator] = useState<Invigilator | null>(null);
  const [editInvigilator, setEditInvigilator] = useState<Invigilator | null>(null);
  const [newInvigilator, setNewInvigilator] = useState({
    name: '',
    type: 'INTERNAL' as 'INTERNAL' | 'EXTERNAL' | 'STAFF'
  });

  useEffect(() => {
    fetchInvigilators();
  }, []);

  const fetchInvigilators = async () => {
    try {
      const response = await fetch('/api/invigilators');
      const data = await response.json();
      setInvigilators(data);
    } catch (error) {
      console.error('Failed to fetch invigilators:', error);
      toast.error('Failed to fetch invigilators');
    }
  };

  const handleAddInvigilator = async () => {
    try {
      const response = await fetch('/api/invigilators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInvigilator),
      });
      if (response.ok) {
        toast.success('Invigilator added successfully');
        setShowAddModal(false);
        setNewInvigilator({ name: '', type: 'INTERNAL' });
        fetchInvigilators();
      }
    } catch (error) {
      console.error('Failed to add invigilator:', error);
      toast.error('Failed to add invigilator');
    }
  };

  const handleEditInvigilator = async () => {
    if (!editInvigilator) return;
    try {
      const response = await fetch(`/api/invigilators/${editInvigilator.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editInvigilator),
      });
      if (response.ok) {
        toast.success('Invigilator updated successfully');
        setShowEditModal(false);
        fetchInvigilators();
      }
    } catch (error) {
      console.error('Failed to update invigilator:', error);
      toast.error('Failed to update invigilator');
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
        <h1 className="text-2xl font-bold text-gray-800">Invigilators</h1>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        onClick={() => setShowAddModal(true)}
        >
          Add Invigilator
        </button>
      </div>

      <div className="bg-white/30 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-white/95 backdrop-blur-sm">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Created At</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Updated At</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invigilators.map((invigilator) => (
                <tr key={invigilator.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{invigilator.id}</td>
                  <td className="px-6 py-4">{invigilator.name}</td>
                  <td className="px-6 py-4">{invigilator.type}</td>
                  <td className="px-6 py-4">
                    {new Date(invigilator.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {new Date(invigilator.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
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

        {showAddModal && (
          <PopupModal
            title="Add New Invigilator"
            onClose={() => setShowAddModal(false)}
            onConfirm={handleAddInvigilator}
            confirmText="Add Invigilator"
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
                  onChange={(e) => setNewInvigilator({ ...newInvigilator, type: e.target.value as 'INTERNAL' | 'EXTERNAL' | 'STAFF' })}
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="INTERNAL">Internal</option>
                  <option value="EXTERNAL">External</option>
                  <option value="STAFF">Staff</option>
                </select>
              </div>
            </div>
          </PopupModal>
        )}

        {showEditModal && editInvigilator && (
          <PopupModal
            title="Edit Invigilator"
            onClose={() => setShowEditModal(false)}
            onConfirm={handleEditInvigilator}
            confirmText="Update Invigilator"
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
                  onChange={(e) => setEditInvigilator({ ...editInvigilator, type: e.target.value as 'INTERNAL' | 'EXTERNAL' | 'STAFF' })}
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="INTERNAL">Internal</option>
                  <option value="EXTERNAL">External</option>
                  <option value="STAFF">Staff</option>
                </select>
              </div>
            </div>
          </PopupModal>
        )}

        {showDeleteModal && selectedInvigilator && (
          <PopupModal
            title="Delete Invigilator"
            onClose={() => setShowDeleteModal(false)}
            onConfirm={deleteInvigilator}
            confirmText="Yes, Delete"
          >
            <p className="text-gray-700">
              Are you sure you want to delete <strong>{selectedInvigilator.name}</strong>?
            </p>
          </PopupModal>
        )}
      </div>
    </div>
  );
}