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
    <div className="max-w-[1400px] mx-auto">
      <div className="bg-white/30 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-white/95 backdrop-blur-sm">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Code</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Subject Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Groups</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Department</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subjects.map((subject) => (
                <tr 
                  key={subject.id}
                  className="group transition-all hover:bg-gray-50/50"
                >
                  <td className="px-6 py-4 text-sm text-gray-600">{subject.code}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">{subject.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatGroupNumbers(subject.subjectGroups) || 'ยังไม่มีกลุ่ม'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{subject.department.name}</td>
                  <td className="px-2 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setSelectedSubject(subject);
                          setShowEditModal(true);
                        }}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSubject(subject);
                          setShowDeleteModal(true);
                        }}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-100 rounded-md transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
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
          <p className="text-gray-700">
            Are you sure you want to delete <strong>{selectedSubject.name}</strong>?
          </p>
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
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700">Code</label>
              <input
                type="text"
                value={newSubject.code}
                onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-700">Name</label>
              <input
                type="text"
                value={newSubject.name}
                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-700">Department ID</label>
              <input
                type="text"
                value={newSubject.departmentId}
                onChange={(e) => setNewSubject({ ...newSubject, departmentId: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </PopupModal>
      )}
    </div>
  );
}