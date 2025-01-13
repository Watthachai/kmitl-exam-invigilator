"use client";

import { useEffect, useState } from "react";
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import PopupModal from '@/app/components/ui/popup-modal';

interface Room {
  id: string;
  building: string;
  roomNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    building: '',
    roomNumber: ''
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms');
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      toast.error('Failed to fetch rooms');
    }
  };

  const handleAddRoom = async () => {
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        toast.success('Room added successfully');
        setShowAddModal(false);
        setFormData({ building: '', roomNumber: '' });
        fetchRooms();
      } else {
        toast.error('Failed to add room');
      }
    } catch (error) {
      console.error('Failed to add room:', error);
      toast.error('Failed to add room');
    }
  };

  const handleEditRoom = async () => {
    if (!selectedRoom) return;
    try {
      const response = await fetch(`/api/rooms/${selectedRoom.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          building: selectedRoom.building,
          roomNumber: selectedRoom.roomNumber
        }),
      });

      if (response.ok) {
        toast.success('Room updated successfully');
        setShowEditModal(false);
        setSelectedRoom(null);
        fetchRooms();
      } else {
        toast.error('Failed to update room');
      }
    } catch (error) {
      console.error('Failed to update room:', error);
      toast.error('Failed to update room');
    }
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoom) return;
    try {
      const response = await fetch(`/api/rooms/${selectedRoom.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Room deleted successfully');
        setShowDeleteModal(false);
        setSelectedRoom(null);
        fetchRooms();
      } else {
        toast.error('Failed to delete room');
      }
    } catch (error) {
      console.error('Failed to delete room:', error);
      toast.error('Failed to delete room');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Toaster/>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Rooms</h1>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          onClick={() => setShowAddModal(true)}
        >
          Add Room
        </button>
      </div>

      <div className="bg-white/30 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-white/95 backdrop-blur-sm">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Building</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Room Number</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Created At</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Updated At</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rooms.map((room) => (
                <tr key={room.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{room.building}</td>
                  <td className="px-6 py-4">{room.roomNumber}</td>
                  <td className="px-6 py-4">{new Date(room.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{new Date(room.updatedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedRoom(room);
                          setShowEditModal(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRoom(room);
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
            title="Add New Room"
            onClose={() => setShowAddModal(false)}
            onConfirm={handleAddRoom}
            confirmText="Add Room"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700">Building</label>
                <input
                  type="text"
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-md"
                  placeholder="Enter building name"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700">Room Number</label>
                <input
                  type="text"
                  value={formData.roomNumber}
                  onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-md"
                  placeholder="Enter room number"
                  required
                />
              </div>
            </div>
          </PopupModal>
        )}

        {showEditModal && selectedRoom && (
          <PopupModal
            title="Edit Room"
            onClose={() => setShowEditModal(false)}
            onConfirm={handleEditRoom}
            confirmText="Update Room"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700">Building</label>
                <input
                  type="text"
                  value={selectedRoom.building}
                  onChange={(e) => setSelectedRoom({ ...selectedRoom, building: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-md"
                  placeholder="Enter building name"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700">Room Number</label>
                <input
                  type="text"
                  value={selectedRoom.roomNumber}
                  onChange={(e) => setSelectedRoom({ ...selectedRoom, roomNumber: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-md"
                  placeholder="Enter room number"
                  required
                />
              </div>
            </div>
          </PopupModal>
        )}

        {showDeleteModal && selectedRoom && (
          <PopupModal
            title="Delete Room"
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDeleteRoom}
            confirmText="Yes, Delete"
          >
            <p className="text-gray-700">
              Are you sure you want to delete room <strong>{selectedRoom.roomNumber}</strong> in building <strong>{selectedRoom.building}</strong>?
            </p>
          </PopupModal>
        )}
      </div>
    </div>
  );
}