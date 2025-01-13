"use client";

import { useEffect, useState } from "react";
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import PopupModal from '@/app/components/ui/popup-modal';

interface Message {
  id: string;
  professorId: string;
  content: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  professor: {
    name: string;
  };
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  const [formData, setFormData] = useState({
    content: '',
    notes: '',
    professorId: ''
  });

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/messages');
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Failed to fetch messages');
    }
  };

  const handleAddMessage = async () => {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        toast.success('Message added successfully');
        setShowAddModal(false);
        setFormData({ content: '', notes: '', professorId: '' });
        fetchMessages();
      }
    } catch (error) {
      console.error('Failed to add message:', error);
      toast.error('Failed to add message');
    }
  };

  const handleEditMessage = async () => {
    if (!editMessage) return;
    try {
      const response = await fetch(`/api/messages/${editMessage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editMessage.content,
          notes: editMessage.notes,
          professorId: editMessage.professorId
        }),
      });
      if (response.ok) {
        toast.success('Message updated successfully');
        setShowEditModal(false);
        fetchMessages();
      }
    } catch (error) {
      console.error('Failed to update message:', error);
      toast.error('Failed to update message');
    }
  };

  const handleDelete = async () => {
    if (!selectedMessage) return;
    try {
      const response = await fetch(`/api/messages/${selectedMessage.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Message deleted successfully');
        setShowDeleteModal(false);
        fetchMessages();
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Toaster/>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Messages From Users (รอดำเนินการฝั่ง User) </h1>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          onClick={() => setShowAddModal(true)}
          disabled={true}
        >
          Add Message
        </button>
      </div>

      <div className="bg-white/30 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-white/95 backdrop-blur-sm">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Professor</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Content</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Notes</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Created At</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {messages.map((message) => (
                <tr key={message.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{message.professor.name}</td>
                  <td className="px-6 py-4">{message.content}</td>
                  <td className="px-6 py-4">{message.notes}</td>
                  <td className="px-6 py-4">
                    {new Date(message.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditMessage(message);
                          setShowEditModal(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedMessage(message);
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
            title="Add New Message"
            onClose={() => setShowAddModal(false)}
            onConfirm={handleAddMessage}
            confirmText="Add Message"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter message content"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-gray-700">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter notes (optional)"
                  rows={2}
                />
              </div>
            </div>
          </PopupModal>
        )}

        {showEditModal && editMessage && (
          <PopupModal
            title="Edit Message"
            onClose={() => setShowEditModal(false)}
            onConfirm={handleEditMessage}
            confirmText="Update Message"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700">Content</label>
                <textarea
                  value={editMessage.content}
                  onChange={(e) => setEditMessage({ ...editMessage, content: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter message content"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-gray-700">Notes</label>
                <textarea
                  value={editMessage.notes || ''}
                  onChange={(e) => setEditMessage({ ...editMessage, notes: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter notes (optional)"
                  rows={2}
                />
              </div>
            </div>
          </PopupModal>
        )}

        {showDeleteModal && selectedMessage && (
          <PopupModal
            title="Delete Message"
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDelete}
            confirmText="Yes, Delete"
          >
            <p className="text-gray-700">
              Are you sure you want to delete this message?
            </p>
          </PopupModal>
        )}
      </div>
    </div>
  );
}