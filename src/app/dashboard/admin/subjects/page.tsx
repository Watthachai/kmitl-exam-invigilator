'use client';

import { useEffect, useState } from 'react';
import PopupModal from '@/app/components/ui/popup-modal';
import { FiEdit2, FiTrash2, FiDownload, FiPrinter, FiSearch } from 'react-icons/fi';

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
  const [selectedRowData, setSelectedRowData] = useState<SheetData | null>(null);

  const handleDataSelect = (rowData: SheetData) => {
    setSelectedRowData(rowData);
  };

  //Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  
  // Add filter effect
  useEffect(() => {
    const filtered = subjects.filter((subject) =>
      subject.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.department.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredSubjects(filtered);
  }, [subjects, searchQuery]);

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

  //Export
  const handleExportData = () => {
    const csvContent = subjects.map(subject => 
      `${subject.code},${subject.name},${subject.department.name}`
    ).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subjects.csv';
    a.click();
  };

  return (
    <div className="max-w-auto mx-auto">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Subjects</h1>

        <div className="relative w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            <FiDownload className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            <FiPrinter className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>
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
            {filteredSubjects.map((subject) => (
              <tr key={subject.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{subject.code}</td>
                <td className="px-6 py-4">{subject.name}</td>
                <td className="px-6 py-4">{formatGroupNumbers(subject.subjectGroups) || 'ไม่มีกลุ่มเรียน'}</td>
                <td className="px-6 py-4">{subject.department.name}</td>
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
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSubject(subject);
                        setShowDeleteModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
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