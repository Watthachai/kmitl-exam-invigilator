"use client";

import { useEffect, useState } from "react";
import { FiEdit2, FiTrash2, FiUsers, FiArrowRight, FiSearch, FiCheck } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import PopupModal from '@/app/components/ui/popup-modal';
import { ImSpinner8 } from 'react-icons/im';
import { FiDatabase } from 'react-icons/fi';
import Select from 'react-select';

// เพิ่ม import สำหรับการจัดการไฟล์
import { FiUpload, FiFileText, FiDownload } from 'react-icons/fi';

interface Invigilator {
  id: string;
  name: string;
  type: string;
  departmentId?: string;
  department?: Department;
  professorId?: string;
  professor?: Professor;
  schedules: Schedule[];
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  user?: User;
  quota: number;
  assignedQuota: number;
}

interface Department {
  id: string;
  name: string;
}

interface Professor {
  id: string;
  name: string;
  departmentId?: string; // Add departmentId property
}

interface User {
  id: string;
  name?: string;
  email?: string;
}

interface Schedule {
  id: string;
  date: Date;
  scheduleDateOption: string;
  startTime: Date;
  endTime: Date;
  roomId: string;
  subjectGroupId: string;
}

export default function InvigilatorsPage() {
  const [invigilators, setInvigilators] = useState<Invigilator[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInvigilator, setSelectedInvigilator] = useState<Invigilator | null>(null);
  const [editInvigilator, setEditInvigilator] = useState<Invigilator | null>(null);
  const [newInvigilator, setNewInvigilator] = useState({
    name: '',
    type: 'บุคลากร',
    departmentId: '',
    professorId: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  // เพิ่ม state สำหรับการค้นหา
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('');

  // เพิ่ม state สำหรับการค้นหาอาจารย์ที่ยังไม่เป็นผู้คุมสอบ
  const [searchProfessor, setSearchProfessor] = useState('');
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null);

  // เพิ่ม state และฟังก์ชันสำหรับการย้ายข้อมูล
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [mergeSearchTerm, setMergeSearchTerm] = useState("");
  const [filteredInvigilatorsForMerge, setFilteredInvigilatorsForMerge] = useState<Invigilator[]>([]);

  // เพิ่ม state สำหรับ Modal นำเข้าไฟล์
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  interface ImportPreviewItem {
    name: string;
    email?: string;
  }

  const [importPreview, setImportPreview] = useState<ImportPreviewItem[]>([]);
  const [importDepartmentId, setImportDepartmentId] = useState('');

  useEffect(() => {
    fetchInvigilators();
    fetchDepartments();
    fetchProfessors();
  }, []);

  const fetchInvigilators = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/invigilators?include=department,professor,user,schedules');
      const data = await response.json();
      setInvigilators(data);
    } catch (error) {
      console.error('Failed to fetch invigilators:', error);
      toast.error('Failed to fetch invigilators');
    } finally {
      setIsLoading(false);
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

  const handleAddInvigilator = async () => {
    try {
      // Validate required fields
      if (!newInvigilator.name) {
        toast.error('Name is required');
        return;
      }

      // For อาจารย์, require professorId
      if (newInvigilator.type === 'อาจารย์' && !newInvigilator.professorId) {
        toast.error('Please select a professor');
        return;
      }

      // For บุคลากร, require departmentId
      if (newInvigilator.type === 'บุคลากร' && !newInvigilator.departmentId) {
        toast.error('Please select a department');
        return;
      }

      const response = await fetch('/api/invigilators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newInvigilator,
          // Clear the other ID field based on type
          departmentId: newInvigilator.type === 'อาจารย์' ? null : newInvigilator.departmentId,
          professorId: newInvigilator.type === 'บุคลากร' ? null : newInvigilator.professorId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast.success('Invigilator added successfully');
      setShowAddModal(false);
      setNewInvigilator({ name: '', type: 'บุคลากร', departmentId: '', professorId: '' });
      fetchInvigilators();
    } catch (error) {
      console.error('Failed to add invigilator:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add invigilator');
    }
  };

  const handleEditInvigilator = async () => {
    if (!editInvigilator) return;
    
    try {
      // Similar validation as handleAddInvigilator
      if (!editInvigilator.name) {
        toast.error('Name is required');
        return;
      }

      if (editInvigilator.type === 'อาจารย์' && !editInvigilator.professorId) {
        toast.error('Please select a professor');
        return;
      }

      if (editInvigilator.type === 'บุคลากร' && !editInvigilator.departmentId) {
        toast.error('Please select a department');
        return;
      }

      const response = await fetch(`/api/invigilators/${editInvigilator.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editInvigilator,
          departmentId: editInvigilator.type === 'อาจารย์' ? null : editInvigilator.departmentId,
          professorId: editInvigilator.type === 'บุคลากร' ? null : editInvigilator.professorId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast.success('Invigilator updated successfully');
      setShowEditModal(false);
      fetchInvigilators();
    } catch (error) {
      console.error('Failed to update invigilator:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update invigilator');
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

  // เพิ่มฟังก์ชัน sendEmailToInvigilator
  interface SendEmailPayload {
    type: string;
    userId: string;
  }

  const sendEmailToInvigilator = async (invigilator: Invigilator, emailType: string): Promise<void> => {
    // ตรวจสอบว่ามีอีเมลหรือไม่
    if (!invigilator.user?.email || !invigilator.user.email.endsWith('@kmitl.ac.th')) {
      toast.error('ไม่พบอีเมล KMITL ของอาจารย์ท่านนี้');
      return;
    }
    
    try {
      const toastId = toast.loading('กำลังส่งอีเมล...');
      
      const payload: SendEmailPayload = {
        type: emailType,
        userId: invigilator.userId!,
      };

      const response = await fetch('/api/notifications/individual-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data: { message?: string; error?: string } = await response.json();
      
      toast.dismiss(toastId);
      
      if (response.ok) {
        toast.success(data.message || 'ส่งอีเมลเรียบร้อยแล้ว');
      } else {
        toast.error(data.error || 'เกิดข้อผิดพลาดในการส่งอีเมล');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('เกิดข้อผิดพลาดในการส่งอีเมล');
      console.error('Error sending email:', error);
    }
  };

  // เพิ่มฟังก์ชันหาอาจารย์ที่ยังไม่มีในระบบ
  const availableProfessors = professors.filter(
    prof => !invigilators.some(inv => inv.professorId === prof.id)
  );

  // เพิ่มฟังก์ชันกรองข้อมูล
  const filteredInvigilators = invigilators.filter(invigilator => {
    // กรองตามคำค้นหา
    const matchesSearch = invigilator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invigilator.professor?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (invigilator.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // กรองตามประเภท
    const matchesType = filterType === 'all' || invigilator.type === filterType;
    
    // กรองตามภาควิชา
    const matchesDepartment = !filterDepartment || 
      invigilator.departmentId === filterDepartment ||
      invigilator.professor?.departmentId === filterDepartment;
    
    return matchesSearch && matchesType && matchesDepartment;
  });

  // กรองตามคำค้นหา
  const filteredProfessors = availableProfessors.filter(
    prof => prof.name.toLowerCase().includes(searchProfessor.toLowerCase())
  );

  // เพิ่มฟังก์ชันสำหรับเริ่มการย้ายข้อมูล
  const handleStartMerge = (invigilator: Invigilator) => {
    setMergeSourceId(invigilator.id);
    setMergeSearchTerm("");
    setFilteredInvigilatorsForMerge(invigilators.filter(i => i.id !== invigilator.id));
    setShowMergeModal(true);
  };

  // เพิ่มฟังก์ชันสำหรับการค้นหา invigilator เป้าหมาย
  const handleMergeSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setMergeSearchTerm(term);
    
    if (term.trim() === "") {
      setFilteredInvigilatorsForMerge(invigilators.filter(i => i.id !== mergeSourceId));
      return;
    }
    
    const filtered = invigilators.filter(invigilator => {
      if (invigilator.id === mergeSourceId) return false;
      
      return (
        invigilator.name.toLowerCase().includes(term.toLowerCase()) ||
        (invigilator.professor?.name && 
         invigilator.professor.name.toLowerCase().includes(term.toLowerCase()))
      );
    });
    
    setFilteredInvigilatorsForMerge(filtered);
  };

  // เพิ่มฟังก์ชันสำหรับการย้ายข้อมูล
  const handleMergeInvigilators = async () => {
    if (!mergeSourceId || !mergeTargetId) {
      toast.error("กรุณาเลือกผู้คุมสอบปลายทาง");
      return;
    }
    
    try {
      toast.loading("กำลังย้ายข้อมูล...");
      
      const response = await fetch("/api/invigilators/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: mergeSourceId, targetId: mergeTargetId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "ไม่สามารถย้ายข้อมูลได้");
      }
      
      const result = await response.json();
      toast.dismiss();
      toast.success(`ย้ายข้อมูลสำเร็จ: ${result.movedSchedules} รายการ`);
      
      setShowMergeModal(false);
      setMergeSourceId(null);
      setMergeTargetId(null);
      
      // Refresh the data
      fetchInvigilators();
      
    } catch (error) {
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการย้ายข้อมูล");
    }
  };

  // แก้ไขฟังก์ชัน handleFileChange ให้มีการจัดการข้อผิดพลาดที่ดีขึ้น

const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  setImportFile(file);
  
  // แสดงตัวอย่างข้อมูลที่จะนำเข้า
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    toast.loading("กำลังวิเคราะห์ไฟล์...");
    
    const response = await fetch('/api/invigilators/preview-import', {
      method: 'POST',
      body: formData,
    });
    
    // ตรวจสอบสถานะการตอบกลับ
    if (!response.ok) {
      toast.dismiss();
      // อ่านข้อมูลความผิดพลาดแบบ text ก่อน เพื่อหลีกเลี่ยงข้อผิดพลาด JSON parsing
      const errorText = await response.text();
      
      // ทดลองแปลงเป็น JSON หากเป็นไปได้
      let errorMessage = 'ไม่สามารถแสดงตัวอย่างไฟล์ได้';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch {
        // ถ้าไม่สามารถแปลงเป็น JSON ได้ ให้ใช้ข้อความเดิม
        console.error('Raw error response:', errorText);
      }
      
      throw new Error(errorMessage);
    }
    
    // อ่านข้อมูลที่ส่งกลับมาเป็น text ก่อน
    const responseText = await response.text();
    
    // ตรวจสอบว่าข้อความที่ได้รับกลับมาว่างเปล่าหรือไม่
    if (!responseText || responseText.trim() === '') {
      toast.dismiss();
      throw new Error('ได้รับข้อมูลว่างเปล่าจากเซิร์ฟเวอร์');
    }
    
    // แปลงข้อความเป็น JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      toast.dismiss();
      console.error('Failed to parse JSON response:', responseText);
      throw new Error('ไม่สามารถอ่านข้อมูลจากเซิร์ฟเวอร์ได้ (รูปแบบไม่ถูกต้อง)');
    }
    
    // ตรวจสอบว่าข้อมูลมี preview หรือไม่
    if (!data || !data.preview || !Array.isArray(data.preview)) {
      toast.dismiss();
      throw new Error('รูปแบบข้อมูลไม่ถูกต้อง: ไม่พบข้อมูลตัวอย่าง');
    }
    
    // ตั้งค่าข้อมูลตัวอย่าง
    setImportPreview(data.preview);
    toast.dismiss();
    toast.success(`พบข้อมูลจำนวน ${data.preview.length} รายการ`);
    
  } catch (error) {
    console.error('Error previewing file:', error);
    toast.dismiss();
    toast.error(error instanceof Error ? error.message : 'ไม่สามารถแสดงตัวอย่างไฟล์ได้');
    setImportFile(null);
  }
};

  // เพิ่มฟังก์ชันสำหรับการนำเข้าข้อมูล
const handleImportInvigilators = async () => {
  if (!importFile || !importDepartmentId) {
    toast.error('กรุณาเลือกไฟล์และภาควิชา');
    return;
  }
  
  try {
    setIsImporting(true);
    toast.loading("กำลังนำเข้าข้อมูล...", { duration: 30000 }); // เพิ่มเวลา toast สำหรับไฟล์ใหญ่
    
    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('departmentId', importDepartmentId);
    
    const response = await fetch('/api/invigilators/import', {
      method: 'POST',
      body: formData,
    });
    
    // อ่านข้อมูลที่ส่งกลับมาก่อนเป็น text
    const responseText = await response.text();
    
    // ตรวจสอบว่าการตอบกลับเป็น OK หรือไม่
    if (!response.ok) {
      let errorMessage = 'ไม่สามารถนำเข้าข้อมูลได้';
      
      // พยายามแปลงเป็น JSON หากเป็นไปได้
      if (responseText) {
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // ถ้าไม่สามารถแปลงเป็น JSON ได้ ใช้ข้อความเดิม
          console.error('Raw error response:', responseText);
        }
      }
      
      throw new Error(errorMessage);
    }
    
    // แปลงข้อความเป็น JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse JSON response:', responseText);
      throw new Error('ไม่สามารถอ่านข้อมูลจากเซิร์ฟเวอร์ได้ (รูปแบบไม่ถูกต้อง)');
    }
    
    toast.dismiss();
    
    // แสดงผลสำเร็จพร้อมสถิติ
    if (result.skipped > 0) {
      toast.success(
        <div>
          <p>นำเข้าข้อมูลสำเร็จ {result.imported} รายการ</p>
          <p className="text-xs">ข้ามข้อมูลที่มีอยู่แล้ว {result.skipped} รายการ</p>
        </div>, 
        { duration: 5000 }
      );
    } else {
      toast.success(`นำเข้าข้อมูลสำเร็จ ${result.imported} รายการ`);
    }
    
    setShowImportModal(false);
    setImportFile(null);
    setImportPreview([]);
    setImportDepartmentId('');
    
    // Refresh the data
    fetchInvigilators();
  } catch (error) {
    console.error('Error importing invigilators:', error);
    toast.dismiss();
    toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
  } finally {
    setIsImporting(false);
  }
};

  // เพิ่มฟังก์ชันสำหรับดาวน์โหลดเทมเพลต Excel
  const downloadTemplateFile = () => {
    fetch('/api/invigilators/template')
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'invigilator_import_template.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(error => {
        console.error('Error downloading template:', error);
        toast.error('Failed to download template');
      });
  };

  // เพิ่ม component สำหรับแสดงตัวเลือกที่เลือกไว้
  const ProfessorTag = ({ professor, department, onRemove }: { professor: Professor; department?: Department; onRemove?: () => void }) => (
    <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
      <span>{professor.name}</span>
      {department && (
        <span className="text-xs text-blue-600">({department.name})</span>
      )}
      {onRemove && (
        <button 
          onClick={onRemove}
          className="text-blue-800 hover:text-blue-900"
        >
          &times;
        </button>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <Toaster/>
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">รายการผู้คุมสอบ</h1>
        <div className="flex gap-2">
          <button 
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center gap-2"
            onClick={() => setShowImportModal(true)}
          >
            <FiUpload className="w-4 h-4" />
            นำเข้าบุคลากร
          </button>
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            onClick={() => setShowAddModal(true)}
          >
            เพิ่มผู้คุมสอบ
          </button>
        </div>
      </div>

      {/* เพิ่มส่วน UI สำหรับการค้นหาและกรอง (ต่อจาก header) */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div className="flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="ค้นหาชื่อ, อีเมล..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">ทุกประเภท</option>
            <option value="อาจารย์">อาจารย์</option>
            <option value="บุคลากร">บุคลากร</option>
          </select>
        </div>
        
        <div className="w-auto">
          <Select
            placeholder="กรองตามภาควิชา"
            options={[
              { value: '', label: 'ทุกภาควิชา' },
              ...departments.map(dept => ({ value: dept.id, label: dept.name }))
            ]}
            value={filterDepartment ? 
              { value: filterDepartment, label: departments.find(d => d.id === filterDepartment)?.name || '' } : 
              { value: '', label: 'ทุกภาควิชา' }}
            onChange={(option) => setFilterDepartment(option?.value || '')}
            className="w-[240px]"
            isClearable
          />
        </div>
        
        {(searchTerm || filterType !== 'all' || filterDepartment) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterType('all');
              setFilterDepartment('');
            }}
            className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="h-[calc(100vh-12rem)] overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <ImSpinner8 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            </div>
          ) : invigilators.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <FiDatabase className="w-16 h-16 text-gray-300" />
                <p className="text-gray-500 text-lg">ไม่พบข้อมูลผู้คุมสอบ</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  เพิ่มผู้คุมสอบ
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-white/95 backdrop-blur-sm">
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ข้อมูลทั่วไป</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ภาควิชา</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ข้อมูลอาจารย์</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">บัญชี Google</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ข้อมูลโควต้า</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ตารางคุมสอบ</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">อีเมล</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvigilators.map((invigilator) => (
                    <tr key={invigilator.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">{invigilator.name}</div>
                          <div className="text-sm text-gray-500">รหัส: {invigilator.id}</div>
                          <div className="text-sm text-gray-500">ประเภท: {invigilator.type}</div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {invigilator.departmentId && invigilator.department ? (
                            <>
                              <div className="font-medium text-gray-900">{invigilator.department.name}</div>
                              <div className="text-sm text-gray-500">รหัส: {invigilator.departmentId}</div>
                            </>
                          ) : (
                            <span className="text-gray-400">ไม่มีข้อมูลภาควิชา</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {invigilator.professorId && invigilator.professor ? (
                            <>
                              <div className="font-medium text-gray-900">{invigilator.professor?.name}</div>
                              <div className="text-sm text-gray-500">รหัส: {invigilator.professorId}</div>
                            </>
                          ) : (
                            <span className="text-orange-400 font-medium italic">เป็นบุคลากร</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {invigilator.userId && invigilator.user ? (
                            <>
                              <div className="font-medium text-gray-900">
                                {invigilator.user?.name || invigilator.user?.email || 'ไม่ระบุชื่อ'}
                              </div>
                              <div className="text-sm text-gray-500">รหัส: {invigilator.userId}</div>
                            </>
                          ) : (
                            <span className="text-gray-400">ไม่มีบัญชีผู้ใช้</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">โควต้าทั้งหมด:</span> {invigilator.quota}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">ใช้ไปแล้ว:</span> {invigilator.assignedQuota}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">คงเหลือ:</span> {invigilator.quota - invigilator.assignedQuota}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {invigilator.schedules?.length > 0 ? (
                            <div className="text-sm">
                              <span className="font-medium">จำนวนตารางคุมสอบ:</span> {invigilator.schedules.length}
                            </div>
                          ) : (
                            <span className="text-gray-400">ไม่มีตารางคุมสอบ</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {invigilator.userId && invigilator.user?.email?.endsWith('@kmitl.ac.th') ? (
                            <>
                              <div className="font-medium text-gray-900">
                                {invigilator.user.email}
                              </div>
                              <div className="flex gap-2 mt-1">
                                <button
                                  onClick={() => sendEmailToInvigilator(invigilator, 'schedule')}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                  title="ส่งอีเมลแจ้งตารางสอบ"
                                >
                                  ส่งตารางสอบ
                                </button>
                                <button
                                  onClick={() => sendEmailToInvigilator(invigilator, 'quota')}
                                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                  title="ส่งอีเมลแจ้งโควต้า"
                                >
                                  ส่งโควต้า
                                </button>
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400">ไม่มีอีเมล KMITL</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
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
                          <button
                            onClick={() => handleStartMerge(invigilator)}
                            className="flex items-center gap-1 px-3 py-1 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                          >
                            <FiUsers className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals - Only render container when a modal is open */}
      {(showAddModal || showEditModal || showDeleteModal || showMergeModal) && (
        <div className="fixed inset-0 z-[100]" style={{ margin: '0px !important' }}>
          {showAddModal && (
            <PopupModal
              title="เพิ่มผู้คุมสอบใหม่"
              onClose={() => setShowAddModal(false)}
              onConfirm={handleAddInvigilator}
              confirmText="เพิ่มผู้คุมสอบ"
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
                    onChange={(e) => setNewInvigilator({ ...newInvigilator, type: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="บุคลากร">บุคลากร</option>
                    <option value="อาจารย์">อาจารย์</option>
                  </select>
                </div>

                {newInvigilator.type === 'บุคลากร' && (
                  <div>
                    <label className="block text-gray-700">ภาควิชา</label>
                    <select
                      value={newInvigilator.departmentId || ''}  // Ensure empty string fallback
                      onChange={(e) => setNewInvigilator({ ...newInvigilator, departmentId: e.target.value })}
                      className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">เลือกภาควิชา</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {newInvigilator.type === 'อาจารย์' && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="ค้นหาอาจารย์..."
                          value={searchProfessor}
                          onChange={(e) => setSearchProfessor(e.target.value)}
                          className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <select
                          value={filterDepartment}
                          onChange={(e) => setFilterDepartment(e.target.value)}
                          className="border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">ทุกภาควิชา</option>
                          {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="h-[240px] overflow-y-auto border border-gray-200 rounded-md">
                      {filteredProfessors.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          ไม่พบรายชื่ออาจารย์ที่ตรงกับการค้นหา
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {filteredProfessors.map(prof => (
                            <div 
                              key={prof.id}
                              className={`p-3 cursor-pointer hover:bg-blue-50 ${selectedProfessor?.id === prof.id ? 'bg-blue-100' : ''}`}
                              onClick={() => {
                                setSelectedProfessor(prof);
                                setNewInvigilator({
                                  ...newInvigilator,
                                  professorId: prof.id,
                                  name: prof.name // ใช้ชื่ออาจารย์เป็นชื่อผู้คุมสอบ
                                });
                              }}
                            >
                              <div className="font-medium">{prof.name}</div>
                              <div className="text-sm text-gray-500">
                                {departments.find(d => d.id === prof.departmentId)?.name || 'ไม่ระบุภาควิชา'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedProfessor && (
                      <div className="mt-3">
                        <ProfessorTag 
                          professor={selectedProfessor}
                          department={departments.find(d => d.id === selectedProfessor.departmentId)}
                          onRemove={() => {
                            setSelectedProfessor(null);
                            setNewInvigilator({
                              ...newInvigilator,
                              professorId: '',
                              name: '' // ล้างชื่อด้วยเมื่อล้างการเลือก
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </PopupModal>
          )}

          {showEditModal && editInvigilator && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[101]">
              <div className="max-w-3xl w-full bg-white rounded-lg shadow-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">แก้ไขข้อมูลผู้คุมสอบ</h3>
                </div>
                  
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-700 mb-2">ชื่อผู้คุมสอบ</label>
                      <input
                        type="text"
                        value={editInvigilator.name}
                        onChange={(e) => setEditInvigilator({ ...editInvigilator, name: e.target.value })}
                        className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                        placeholder="ระบุชื่อผู้คุมสอบ"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-gray-700 mb-2">ประเภท</label>
                        <select
                          value={editInvigilator.type}
                          onChange={(e) => setEditInvigilator({ ...editInvigilator, type: e.target.value })}
                          className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                        >
                          <option value="บุคลากร">บุคลากร</option>
                          <option value="อาจารย์">อาจารย์</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 mb-2">โควต้า</label>
                        <input
                          type="number"
                          value={editInvigilator.quota || 0}
                          onChange={(e) => setEditInvigilator({ 
                            ...editInvigilator, 
                            quota: parseInt(e.target.value) || 0 
                          })}
                          className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                          placeholder="ระบุจำนวนโควต้า"
                        />
                      </div>
                    </div>

                    {editInvigilator.type === 'บุคลากร' && (
                      <div className="mt-4">
                        <label className="block text-gray-700 mb-2">ภาควิชา</label>
                        <Select
                          placeholder="เลือกภาควิชา"
                          options={departments.map(dept => ({ value: dept.id, label: dept.name }))}
                          value={editInvigilator.departmentId ? 
                            { value: editInvigilator.departmentId, label: departments.find(d => d.id === editInvigilator.departmentId)?.name || '' } : 
                            null}
                          onChange={(option) => setEditInvigilator({ 
                            ...editInvigilator, 
                            departmentId: option?.value || '' 
                          })}
                          className="text-lg"
                          styles={{
                            control: (base) => ({
                              ...base,
                              minHeight: '3rem'
                            })
                          }}
                          isClearable
                        />
                      </div>
                    )}

                    {editInvigilator.type === 'อาจารย์' && (
                      <div className="mt-4">
                        <label className="block text-gray-700 mb-2">อาจารย์</label>
                        <Select
                          placeholder="ค้นหาและเลือกอาจารย์..."
                          options={
                            departments.map(dept => ({
                              label: dept.name,
                              options: professors
                                .filter(prof => prof.departmentId === dept.id)
                                .map(prof => ({ 
                                  value: prof.id, 
                                  label: prof.name,
                                  department: dept.name
                                }))
                            })).filter(group => group.options.length > 0)
                          }
                          value={editInvigilator.professorId ? 
                            { 
                              value: editInvigilator.professorId, 
                              label: professors.find(p => p.id === editInvigilator.professorId)?.name || '',
                              department: departments.find(d => d.id === professors.find(p => p.id === editInvigilator.professorId)?.departmentId)?.name
                            } : 
                            null
                          }
                          onChange={(option) => setEditInvigilator({ 
                            ...editInvigilator, 
                            professorId: option?.value || '' 
                          })}
                          className="text-lg"
                          styles={{
                            control: (base) => ({
                              ...base,
                              minHeight: '3rem'
                            })
                          }}
                          formatOptionLabel={(option) => (
                            <div className="flex flex-col py-1">
                              <div>{option.label}</div>
                              {option.department && (
                                <div className="text-xs text-gray-500">{option.department}</div>
                              )}
                            </div>
                          )}
                          isClearable
                          isSearchable
                          noOptionsMessage={() => "ไม่พบรายชื่ออาจารย์"}
                        />
                      </div>
                    )}
                    
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">ข้อมูลทั่วไป</h4>
                      <div className="text-sm text-gray-500">
                        <p>รหัส: {editInvigilator.id}</p>
                        <p>สร้างเมื่อ: {new Date(editInvigilator.createdAt).toLocaleString('th-TH')}</p>
                        <p>แก้ไขล่าสุด: {new Date(editInvigilator.updatedAt).toLocaleString('th-TH')}</p>
                      </div>
                    </div>
                  </div>
                </div>
                  
                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleEditInvigilator}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    บันทึกการแก้ไข
                  </button>
                </div>
              </div>
            </div>
          )}

          {showDeleteModal && selectedInvigilator && (
            <PopupModal
              title="ลบผู้คุมสอบ"
              onClose={() => setShowDeleteModal(false)}
              onConfirm={deleteInvigilator}
              confirmText="ยืนยันการลบ"
            >
              <p className="text-gray-700">
                คุณต้องการลบ <strong>{selectedInvigilator.name}</strong> ใช่หรือไม่?
              </p>
            </PopupModal>
          )}

          {showMergeModal && (
            <PopupModal
              title="ย้ายข้อมูลตารางสอบ"
              onClose={() => setShowMergeModal(false)}
              onConfirm={handleMergeInvigilators}
              confirmText="ยืนยันการย้าย"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700">ค้นหาผู้คุมสอบปลายทาง</label>
                  <input
                    type="text"
                    value={mergeSearchTerm}
                    onChange={handleMergeSearchChange}
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ค้นหาชื่อผู้คุมสอบ..."
                  />
                </div>
                <div className="h-[240px] overflow-y-auto border border-gray-200 rounded-md">
                  {filteredInvigilatorsForMerge.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      ไม่พบรายชื่อผู้คุมสอบที่ตรงกับการค้นหา
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredInvigilatorsForMerge.map(invigilator => (
                        <div 
                          key={invigilator.id}
                          className={`p-3 cursor-pointer hover:bg-blue-50 ${mergeTargetId === invigilator.id ? 'bg-blue-100' : ''}`}
                          onClick={() => setMergeTargetId(invigilator.id)}
                        >
                          <div className="font-medium">{invigilator.name}</div>
                          <div className="text-sm text-gray-500">
                            {invigilator.professor?.name || 'ไม่ระบุชื่ออาจารย์'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </PopupModal>
          )}

          {/* เพิ่ม Modal สำหรับการย้ายข้อมูล */}
          {showMergeModal && mergeSourceId && (
            <PopupModal
              title="ย้ายข้อมูลตารางคุมสอบ"
              onClose={() => {
                setShowMergeModal(false);
                setMergeSourceId(null);
                setMergeTargetId(null);
              }}
              onConfirm={handleMergeInvigilators}
              confirmText="ยืนยันการย้ายข้อมูล"
              confirmIcon={<FiArrowRight className="w-4 h-4" />}
            >
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <h3 className="font-medium text-yellow-800">คำเตือน: การดำเนินการนี้ไม่สามารถยกเลิกได้</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    การย้ายข้อมูลจะทำการย้ายตารางคุมสอบทั้งหมดจากผู้คุมสอบต้นทางไปยังผู้คุมสอบปลายทาง 
                    และจะลบข้อมูลผู้คุมสอบต้นทางออกจากระบบ โปรดตรวจสอบข้อมูลให้ถูกต้องก่อนดำเนินการ
                  </p>
                </div>
                
                {/* แสดงข้อมูลผู้คุมสอบต้นทาง */}
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-800">ผู้คุมสอบต้นทาง (จะถูกลบหลังการย้าย)</h3>
                  {invigilators.find(i => i.id === mergeSourceId) && (
                    <div className="mt-2">
                      <p className="font-medium">{invigilators.find(i => i.id === mergeSourceId)?.name}</p>
                      <div className="mt-1 text-sm text-gray-600">
                        <p>ประเภท: {invigilators.find(i => i.id === mergeSourceId)?.type}</p>
                        <p>ภาควิชา: {invigilators.find(i => i.id === mergeSourceId)?.department?.name}</p>
                        <p>ตารางคุมสอบ: {invigilators.find(i => i.id === mergeSourceId)?.schedules?.length || 0} รายการ</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* ค้นหาผู้คุมสอบปลายทาง */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ค้นหาผู้คุมสอบปลายทาง
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={mergeSearchTerm}
                      onChange={handleMergeSearchChange}
                      placeholder="พิมพ์ชื่อหรือรายละเอียดเพื่อค้นหา..."
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <FiSearch className="absolute right-3 top-3 text-gray-400" />
                  </div>
                </div>
                
                {/* แสดงรายการผู้คุมสอบปลายทาง */}
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredInvigilatorsForMerge.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {filteredInvigilatorsForMerge.map((invigilator) => (
                        <div 
                          key={invigilator.id}
                          className={`p-3 cursor-pointer hover:bg-gray-50 ${mergeTargetId === invigilator.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                          onClick={() => setMergeTargetId(invigilator.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{invigilator.name}</p>
                              <div className="text-sm text-gray-600">
                                <p>ประเภท: {invigilator.type}</p>
                                <p>ภาควิชา: {invigilator.department?.name}</p>
                                {invigilator.professor && (
                                  <p className="text-blue-600">อาจารย์: {invigilator.professor.name}</p>
                                )}
                              </div>
                              <p className="text-sm mt-1">
                                จำนวนตารางคุมสอบ: <span className="font-bold">{invigilator.schedules?.length || 0}</span> รายการ
                              </p>
                            </div>
                            
                            <div className="flex shrink-0 h-full">
                              <div className={`w-5 h-5 border-2 rounded-full ${mergeTargetId === invigilator.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                                {mergeTargetId === invigilator.id && (
                                  <FiCheck className="text-white" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-gray-500">
                      ไม่พบข้อมูลผู้คุมสอบที่ตรงกับคำค้นหา
                    </div>
                  )}
                </div>
                
                {mergeTargetId && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-sm text-green-800">
                    <p>
                      <span className="font-bold">การดำเนินการ:</span> ย้ายตารางคุมสอบจำนวน{" "}
                      <span className="font-bold">{invigilators.find(i => i.id === mergeSourceId)?.schedules?.length || 0}</span>{" "}
                      รายการจาก{" "}
                      <span className="font-bold">{invigilators.find(i => i.id === mergeSourceId)?.name}</span>{" "}
                      ไปยัง{" "}
                      <span className="font-bold">{invigilators.find(i => i.id === mergeTargetId)?.name}</span>
                    </p>
                  </div>
                )}
              </div>
            </PopupModal>
          )}
        </div>
      )}
{showImportModal && (
  <PopupModal
    title="นำเข้าบุคลากรจากไฟล์ Excel"
    onClose={() => {
      if (!isImporting) {
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
        setImportDepartmentId('');
      }
    }}
    onConfirm={handleImportInvigilators}
    confirmText={isImporting ? "กำลังนำเข้า..." : "นำเข้าข้อมูล"}
    confirmDisabled={isImporting || !importFile || !importDepartmentId}
    confirmIcon={isImporting ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent" /> : <FiUpload className="w-4 h-4" />}
    maxWidth="3xl"
    closeDisabled={isImporting}
  >
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h3 className="font-medium text-blue-800">คำแนะนำการนำเข้าข้อมูล</h3>
        <p className="text-sm text-blue-700 mt-1">
          คุณสามารถนำเข้าข้อมูลบุคลากรจากไฟล์ Excel โดยไฟล์ต้องมีคอลัมน์ ชื่อ-นามสกุล และสามารถมีคอลัมน์อีเมลได้ (ถ้ามี)
          บุคลากรทั้งหมดจะถูกเพิ่มเป็นประเภท &quot;บุคลากร&quot; และคุณต้องเลือกภาควิชาที่สังกัด
        </p>
        <button
          onClick={downloadTemplateFile}
          className="flex items-center gap-2 text-sm text-blue-700 mt-2 hover:text-blue-800"
        >
          <FiDownload className="w-4 h-4" />
          ดาวน์โหลดเทมเพลตไฟล์ Excel
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            เลือกไฟล์ Excel (.xlsx)
          </label>
          <div className="flex items-center">
            <label className="flex-1">
              <div className="border border-gray-300 rounded-lg px-4 py-10 text-center cursor-pointer hover:bg-gray-50">
                {importFile ? (
                  <div className="text-blue-500">
                    <FiFileText className="w-10 h-10 mx-auto" />
                    <p className="mt-2 font-medium">{importFile.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(importFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <FiUpload className="w-10 h-10 mx-auto" />
                    <p className="mt-2">คลิกเพื่อเลือกไฟล์</p>
                    <p className="text-xs mt-1">รองรับไฟล์ .xlsx เท่านั้น</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            เลือกภาควิชา/หน่วยงานที่สังกัด
          </label>
          <Select
            placeholder="เลือกภาควิชา/หน่วยงาน"
            options={departments.map(dept => ({ 
              value: dept.id, 
              label: dept.name 
            }))}
            value={importDepartmentId ? 
              { value: importDepartmentId, label: departments.find(d => d.id === importDepartmentId)?.name || '' } : 
              null}
            onChange={(option) => setImportDepartmentId(option?.value || '')}
            className="w-full"
            isClearable
          />
          <p className="text-xs text-gray-500 mt-1">
            บุคลากรทั้งหมดที่นำเข้าจะถูกกำหนดให้สังกัดในภาควิชา/หน่วยงานนี้
          </p>
        </div>
      </div>
      
      {importPreview.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-700 mb-2">ตัวอย่างข้อมูลที่จะนำเข้า ({importPreview.length} รายการ)</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">ชื่อ-นามสกุล</th>
                    <th className="px-4 py-2 text-left">อีเมล (ถ้ามี)</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((item, index) => (
                    <tr key={index} className="border-t border-gray-200">
                      <td className="px-4 py-2">{index + 1}</td>
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2">{item.email || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {isImporting && (
        <div className="bg-blue-50 p-4 rounded-lg flex items-center space-x-3">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          <p className="text-blue-700">
            กำลังนำเข้าข้อมูล กรุณารอสักครู่... <span className="text-sm">(อาจใช้เวลานานสำหรับไฟล์ขนาดใหญ่)</span>
          </p>
        </div>
      )}
    </div>
  </PopupModal>
)}
    </div>
  );
}