'use client';

import { useEffect, useState } from 'react';
import PopupModal from '@/app/components/ui/popup-modal';

const formatGroupNumbers = (groups: SubjectGroup[]): string => {
  return groups.map((group) => group.groupNumber).join(', ');
};

interface SubjectGroup {
  groupNumber: string;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  subjectGroups: SubjectGroup[];
  department: { id: string; name: string };
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [newSubject, setNewSubject] = useState({ name: '', code: '', departmentId: '' });

  // Fetch Subjects
  const fetchSubjects = () => {
    fetch('/api/subjects')
      .then((res) => res.json())
      .then((data: Subject[]) => setSubjects(data))
      .catch((error) => console.error('Failed to fetch subjects', error));
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  // Edit Handler
  const handleEditClick = (subject: Subject) => {
    setSelectedSubject(subject);
    setShowEditModal(true);
  };

  const handleEditConfirm = async () => {
    if (!selectedSubject) return;
    try {
      const response = await fetch(`/api/subjects/${selectedSubject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedSubject.name,
          code: selectedSubject.code,
          departmentId: selectedSubject.department?.id || '',
        }),
      });
      if (response.ok) {
        fetchSubjects();
        setShowEditModal(false);
      } else {
        console.error('Failed to update subject');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };
  

  // Delete Handler
  const handleDeleteClick = (subject: Subject) => {
    setSelectedSubject(subject);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSubject) return;
    try {
      const response = await fetch(`/api/subjects/${selectedSubject.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchSubjects();
        setShowDeleteModal(false);
      } else {
        console.error('Failed to delete subject');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Add Handler
  const handleAddConfirm = async () => {
    try {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubject),
      });
      if (response.ok) {
        fetchSubjects();
        setShowAddModal(false);
        setNewSubject({ name: '', code: '', departmentId: '' });
      } else {
        console.error('Failed to add subject');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-4">Subjects</h1>
      <button
        className="mb-4 bg-green-500 text-white px-3 py-2 rounded"
        onClick={() => setShowAddModal(true)}
      >
        Add New Subject
      </button>
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2 text-black">ID</th>
            <th className="border p-2 text-black">Code</th>
            <th className="border p-2 text-black">Name</th>
            <th className="border p-2 text-black">Subject Group</th>
            <th className="border p-2 text-black">Department</th>
            <th className="border p-2 text-black">Actions</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => (
            <tr key={subject.id} className="hover:bg-gray-100">
              <td className="border p-2 text-black">{subject.id}</td>
              <td className="border p-2 text-black">{subject.code}</td>
              <td className="border p-2 text-black">{subject.name}</td>
              <td className="border p-2 text-black">
                {formatGroupNumbers(subject.subjectGroups) || 'N/A'}
              </td>
              <td className="border p-2 text-black">{subject.department?.name || 'N/A'}</td>
              <td className="border p-2 text-black space-x-2">
                <button
                  className="bg-blue-500 text-white px-2 py-1 rounded"
                  onClick={() => handleEditClick(subject)}
                >
                  Edit
                </button>
                <button
                  className="bg-red-500 text-white px-2 py-1 rounded"
                  onClick={() => handleDeleteClick(subject)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Edit Modal */}
      {showEditModal && selectedSubject && (
        <PopupModal
          title="Edit Subject"
          onClose={() => setShowEditModal(false)}
          onConfirm={handleEditConfirm}
          confirmText="Save Changes"
        >
          <div>
            <label>Code</label>
            <input
              type="text"
              value={selectedSubject.code}
              onChange={(e) =>
                setSelectedSubject({ ...selectedSubject, code: e.target.value })
              }
              className="w-full border p-2"
            />
            <label>Name</label>
            <input
              type="text"
              value={selectedSubject.name}
              onChange={(e) =>
                setSelectedSubject({ ...selectedSubject, name: e.target.value })
              }
              className="w-full border p-2"
            />
          </div>
        </PopupModal>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedSubject && (
        <PopupModal
          title="Delete Subject"
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          confirmText="Yes, Delete"
        >
          <p>Are you sure you want to delete <strong>{selectedSubject.name}</strong>?</p>
        </PopupModal>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <PopupModal
          title="Add New Subject"
          onClose={() => setShowAddModal(false)}
          onConfirm={handleAddConfirm}
          confirmText="Add Subject"
        >
          <div>
            <label>Code</label>
            <input
              type="text"
              value={newSubject.code}
              onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
              className="w-full border p-2"
            />
            <label>Name</label>
            <input
              type="text"
              value={newSubject.name}
              onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
              className="w-full border p-2"
            />
            <label>Department ID</label>
            <input
              type="text"
              value={newSubject.departmentId}
              onChange={(e) => setNewSubject({ ...newSubject, departmentId: e.target.value })}
              className="w-full border p-2"
            />
          </div>
        </PopupModal>
      )}
    </div>
  );
}
