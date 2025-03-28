"use client";

import { useEffect, useState } from "react";
import { FiEdit2, FiTrash2, FiUpload, FiDatabase } from 'react-icons/fi';
import { ImSpinner8 } from 'react-icons/im';
import toast, { } from 'react-hot-toast';
import PopupModal from '@/app/components/ui/popup-modal';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import { chunk } from 'lodash';

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

interface ImportRow {
  order?: string;
  firstName: string;
  lastName: string;
  department: string;
}

interface ImportResult {
  success: boolean;
  name: string;
  department: string;
  error?: string;
}

interface ImportSummary {
  total: number;
  successful: number;
  failed: number;
  results: ImportResult[];
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedData, setImportedData] = useState<ImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const BATCH_SIZE = 50; // Process 50 records at a time

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
      setIsLoading(true);
      const response = await fetch('/api/professors');
      if (response.ok) {
        const data = await response.json();
        setProfessors(data);
      }
    } catch (error) {
      console.error('Failed to fetch professors:', error);
      toast.error('Failed to fetch professors');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProfessor = async () => {
    try {
      if (!formData.name || !formData.departmentId) {
        toast.error('Please fill all required fields');
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
        body: JSON.stringify({
          name: editProfessor.name,
          departmentId: editProfessor.departmentId
        }),
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
  
    const loadingToast = toast.loading('กำลังอ่านไฟล์...');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: ['order', 'firstName', 'lastName', 'department'],
          raw: false
        }) as ImportRow[];
        
        // Remove header row and only validate names
        const filteredData = jsonData
          .slice(1) // Skip header row
          .filter((row: ImportRow) => 
            row.firstName && 
            row.lastName && 
            typeof row.firstName === 'string'
            // Removed department validation
          );
  
        if (filteredData.length === 0) {
          toast.error('ไม่พบข้อมูลที่สามารถนำเข้าได้');
          return;
        }
  
        setImportedData(filteredData);
        setShowImportModal(true);
        toast.success(`พบข้อมูลที่สามารถนำเข้าได้ ${filteredData.length} รายการ`);
      } catch (err) {
        console.error('Error reading file:', err);
        toast.error('ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบไฟล์');
      } finally {
        toast.dismiss(loadingToast);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processImportedData = async () => {
    setIsImporting(true);
    let progress = 0;
    const results: ImportResult[] = [];
    
    // Process in batches
    const batches = chunk(importedData, BATCH_SIZE);
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (row: ImportRow) => {
        try {
          const dept = departments.find(d => d.name.includes(row.department));
          
          if (!dept) {
            return {
              success: false,
              name: `${row.firstName} ${row.lastName}`,
              department: row.department,
              error: 'Department not found'
            };
          }
  
          await fetch('/api/professors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `${row.firstName} ${row.lastName}`,
              departmentId: dept.id
            }),
          });
  
          return {
            success: true,
            name: `${row.firstName} ${row.lastName}`,
            department: row.department
          };
        } catch (error) {
          console.error('Error importing professor:', error);
          return {
            success: false,
            name: `${row.firstName} ${row.lastName}`,
            department: row.department,
            error: 'Failed to import'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      progress += (batch.length / importedData.length) * 100;
      setImportProgress(Math.round(progress));
    }
  
    const summary: ImportSummary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  
    setImportSummary(summary);
    setShowSummaryModal(true);
    setIsImporting(false);
    setShowImportModal(false);
    setImportedData([]);
    fetchProfessors();
  };

  // Add this function to handle filling empty departments in imported data
  const fillEmptyDepartmentsInImport = () => {
    let lastDepartment = '';
    const filledData = importedData.map((row) => {
      if (row.department) {
        lastDepartment = row.department;
        return row;
      }
      return {
        ...row,
        department: lastDepartment
      };
    });
    setImportedData(filledData);
    toast.success('เติมข้อมูลภาควิชาเรียบร้อย');
  };
    
  return (
    <div className="p-6 space-y-6">
      {/* Header section */}
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <h1 className="text-2xl font-bold text-gray-800">จัดการรายชื่ออาจารย์</h1>
        <div className="flex gap-2">
          <button 
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            onClick={() => setShowImportModal(true)}
          >
            <FiUpload className="inline-block mr-2" />
            นำเข้าไฟล์ Excel
          </button>
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            onClick={() => setShowAddModal(true)}
          >
            เพิ่มอาจารย์
          </button>
        </div>
      </div>

      {/* Table container */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="h-[calc(100vh-12rem)] overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <ImSpinner8 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            </div>
          ) : professors.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <FiDatabase className="w-16 h-16 text-gray-300" />
                <p className="text-gray-500 text-lg">ไม่พบข้อมูลอาจารย์</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  เพิ่มอาจารย์
                </button>
              </div>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="bg-white/95 backdrop-blur-sm sticky top-0 z-10">
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">รหัสอาจารย์</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ชื่อ-นามสกุล</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ภาควิชา</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">วันที่เพิ่ม</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">วันที่แก้ไข</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">จัดการ</th>
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
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <PopupModal
          title="เพิ่มอาจารย์"
          onClose={() => setShowAddModal(false)}
          onConfirm={handleAddProfessor}
          confirmText="เพิ่มอาจารย์"
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
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          title="แก้ไขข้อมูลอาจารย์"
          onClose={() => setShowEditModal(false)}
          onConfirm={handleEditProfessor}
          confirmText="บันทึกการแก้ไข"
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
          title="ลบอาจารย์"
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteProfessor}
          confirmText="ยืนยันการลบ"
        >
          <p className="text-gray-700">
            คุณต้องการลบ <strong>{selectedProfessor.name}</strong> ใช่หรือไม่?
          </p>
        </PopupModal>
      )}

      {showImportModal && (
        <PopupModal
          title="นำเข้าข้อมูลอาจารย์" 
          onClose={() => {
            if (!isImporting) {
              setShowImportModal(false);
              setSelectedFile(null);
              setImportedData([]);
            }
          }}
          onConfirm={processImportedData}
          confirmText={isImporting ? 'กำลังนำเข้า...' : 'นำเข้าข้อมูล'}
          isProcessing={isImporting}
          confirmButtonClass="bg-green-500 hover:bg-green-600"
          className="max-w-5xl"
        >
          <div className="space-y-6">
            {!importedData.length ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  {selectedFile ? (
                    <div className="w-full p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FiUpload className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-gray-600">{selectedFile.name}</span>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full p-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                      <div className="space-y-3 text-center">
                        <FiUpload className="w-8 h-8 mx-auto text-gray-400" />
                        <div className="text-gray-600">
                          <span className="font-medium text-blue-500 hover:underline">เลือกไฟล์</span>
                          <span className="text-gray-500"> หรือลากไฟล์มาวางที่นี่</span>
                        </div>
                        <p className="text-xs text-gray-500">รองรับไฟล์ XLSX, XLS</p>
                      </div>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedFile(file);
                            await handleFileUpload(e);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    รายการข้อมูลที่จะนำเข้า ({importedData.length} รายการ)
                  </h3>
                  <button
                    className="px-5 py-2.5 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors text-sm font-medium"
                    onClick={fillEmptyDepartmentsInImport}
                  >
                    เติมภาควิชาที่ว่าง
                  </button>
                </div>
                <div className="max-h-[60vh] overflow-auto rounded-lg border border-gray-200 shadow-sm">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ลำดับ</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ชื่อ</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">นามสกุล</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ภาควิชา</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {importedData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-600 font-medium">{row.order || index + 1}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{row.firstName}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{row.lastName}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {row.department || 
                              <span className="text-gray-400 italic">ยังไม่ได้ระบุ</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
  
                {isImporting && (
                  <div className="space-y-4 mt-6">
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-green-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${importProgress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <p className="text-sm text-center text-gray-600 font-medium">
                      กำลังนำเข้าข้อมูล... {importProgress}%
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </PopupModal>
      )}

      {/* Import Summary Modal */}
      {showSummaryModal && importSummary && (
        <PopupModal
          title="ผลการนำเข้าข้อมูล"
          onClose={() => setShowSummaryModal(false)}
          onConfirm={() => setShowSummaryModal(false)}
          confirmText="ปิด"
          className="max-w-4xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold">{importSummary.total}</div>
                <div className="text-sm text-gray-600">จำนวนทั้งหมด</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importSummary.successful}</div>
                <div className="text-sm text-gray-600">นำเข้าสำเร็จ</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{importSummary.failed}</div>
                <div className="text-sm text-gray-600">นำเข้าไม่สำเร็จ</div>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-auto rounded-lg border">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อ-นามสกุล</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ภาควิชา</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {importSummary.results.map((result, index) => (
                    <tr key={index} className={result.success ? 'bg-green-50' : 'bg-red-50'}>
                      <td className="px-6 py-4 text-sm">{result.name}</td>
                      <td className="px-6 py-4 text-sm">{result.department}</td>
                      <td className="px-6 py-4 text-sm">
                        {result.success ? (
                          <span className="text-green-600">สำเร็จ</span>
                        ) : (
                          <span className="text-red-600">{result.error}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </PopupModal>
      )}
    </div>
  );
}