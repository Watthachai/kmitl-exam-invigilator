'use client';

import { useEffect, useState } from "react";
import { FiEdit2, FiTrash2, FiDownload, FiFilter, FiEye } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import PopupModal from '@/app/components/ui/popup-modal';
import { Invigilator } from "@prisma/client";
import Highlight from '@/app/components/ui/highlight';
import { ImSpinner8 } from 'react-icons/im';
import { FiDatabase } from 'react-icons/fi';
import { utils as XLSXUtils, write } from 'xlsx';

interface SubjectGroup {
  id: string;
  groupNumber: string;
  subject: {
    code: string;
    name: string;
  };
}
interface Room {
  id: string;
  building: string;
  roomNumber: string;
}
interface Schedule {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  notes?: string;
  scheduleDateOption: 'ช่วงเช้า' | 'ช่วงบ่าย'; // เพิ่ม
  examType: 'MIDTERM' | 'FINAL'; // เพิ่ม 
  academicYear: number; // เพิ่ม
  semester: 1 | 2; // เพิ่ม
  room: {
    id: string;
    building: string;
    roomNumber: string;
    capacity?: number;
  };
  subjectGroup: {
    id: string;
    groupNumber: string;
    year?: number;
    studentCount?: number;
    professor: {
      name: string;
    };
    additionalProfessors?: {
      professor: {
        name: string;
      }
    }[];
    subject: {
      code: string;
      name: string;
      department: {
        name: string;
      };
    };
  };
  invigilator?: {
    id: string;
    name: string;
    type?: string;
  };
}

interface Department {
  id: string;
  name: string;
}

interface ExtendedInvigilator extends Invigilator {
  id: string;
  name: string;
  type: string;
  assignedQuota: number;
  quota: number;
  displayName?: string;
  isProfessor?: boolean;
}

type SortKey = keyof Schedule | 'subjectGroup.subject.department.name';

const formatThaiDate = (date: Date) => {
  const thaiDays = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  const d = new Date(date);
  const day = thaiDays[d.getDay()];
  const month = thaiMonths[d.getMonth()];
  const year = (d.getFullYear() + 543).toString().slice(-2);

  return `${day} ${d.getDate()} ${month} ${year}`;
};

export default function ExamsPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null);
  const [subjectGroups, setSubjectGroups] = useState([]);
  const [invigilators, setInvigilators] = useState<ExtendedInvigilator[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState({
    subjectGroupId: '',
    date: '',
    startTime: '',
    endTime: '',
    roomId: '',
    invigilatorId: ''
  });

  const [filters, setFilters] = useState({
    date: '',
    timeSlot: '', // 'ช่วงเช้า' or 'ช่วงบ่าย'
    department: '',
    professor: '',
    building: '',
    searchQuery: '',
    examType: '', // MIDTERM/FINAL
    academicYear: '',
    semester: ''
  });

  const [isLoading, setIsLoading] = useState(true);

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: 'asc' | 'desc';
  }>({
    key: 'date',
    direction: 'asc'
  });

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    examType: '',
    academicYear: '',
    semester: '',
    department: '',
    startDate: '',
    endDate: '',
  });
  const [previewData, setPreviewData] = useState<Schedule[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/schedules');
      const data = await response.json();
      
      // เรียงลำดับข้อมูลก่อนเก็บใน state
      const sortedData = data.sort((a: Schedule, b: Schedule) => {
        const yearCompare = b.academicYear - a.academicYear;
        if (yearCompare !== 0) return yearCompare;
  
        const semesterCompare = b.semester - a.semester;
        if (semesterCompare !== 0) return semesterCompare;
  
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
  
        const timeSlotOrder = { 'ช่วงเช้า': 1, 'ช่วงบ่าย': 2 };
        return timeSlotOrder[a.scheduleDateOption] - timeSlotOrder[b.scheduleDateOption];
      });
  
      setSchedules(sortedData);
    } catch (error) {
      console.error('Failed to fetch exam schedules:', error);
      toast.error('ไม่สามารถโหลดข้อมูลตารางสอบได้');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. ปรับปรุง useEffect สำหรับการโหลดข้อมูลครั้งแรก
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [subjectGroupsRes, invigilatorsRes] = await Promise.all([
          fetch('/api/subject-groups'),
          fetch('/api/invigilators', {
            cache: 'no-store' // เพิ่มตรงนี้ด้วย
          })
        ]);
        
        const subjectGroups = await subjectGroupsRes.json();
        const invigilators = await invigilatorsRes.json();
        
        setSubjectGroups(subjectGroups);
        setInvigilators(invigilators);
      } catch (error) {
        console.error('Failed to fetch form data:', error);
        toast.error('Failed to fetch form data');
      }
    };
    
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch rooms');
      }
      
      setRooms(result.data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      toast.error('Failed to fetch rooms');
    }
  };

  useEffect(() => {
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
    fetchDepartments();
  }, []);

  // 4. ปรับปรุง handleAddSchedule ด้วยเช่นกัน
  const handleAddSchedule = async () => {
    try {
      if (!formData.subjectGroupId || !formData.date || !formData.startTime || 
          !formData.endTime || !formData.roomId || !formData.invigilatorId) {
        toast.error('Please fill all required fields');
        return;
      }
  
      // ตรวจสอบโควต้าก่อนเพิ่มตารางสอบ
      const invigilator = invigilators.find(inv => inv.id === formData.invigilatorId);
      if (invigilator && invigilator.assignedQuota >= invigilator.quota) {
        toast.error('ผู้คุมสอบท่านนี้มีโควต้าเต็มแล้ว');
        return;
      }
  
      // Format dates to match Prisma schema
      const dateOnly = new Date(formData.date).toISOString().split('T')[0];
      const startDateTime = new Date(`${dateOnly}T${formData.startTime}:00`);
      const endDateTime = new Date(`${dateOnly}T${formData.endTime}:00`);
  
      // ปรับปรุงการกำหนดช่วงเวลา
      const startHour = parseInt(formData.startTime.split(':')[0]);
      const scheduleDateOption = startHour < 12 ? 'ช่วงเช้า' : 'ช่วงบ่าย';

      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectGroupId: formData.subjectGroupId,
          date: dateOnly,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          roomId: formData.roomId,
          invigilatorId: formData.invigilatorId,
          updateQuota: true, // เพิ่ม flag สำหรับอัพเดทโควต้า
          examType: filters.examType || 'FINAL',
          academicYear: parseInt(filters.academicYear) || new Date().getFullYear(),
          semester: parseInt(filters.semester) || 1,
          scheduleDateOption: scheduleDateOption // ใช้ค่าที่คำนวณใหม่
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create schedule');
      }
  
      await response.json();
      toast.success('Exam schedule added successfully');
      setShowAddModal(false);
      setFormData({
        subjectGroupId: '',
        date: '',
        startTime: '',
        endTime: '',
        roomId: '',
        invigilatorId: ''
      });
      
      // เรียก fetch ทั้งสองอันพร้อมกัน
      await Promise.all([
        fetchSchedules(),
        fetchInvigilators() // เพิ่มการ fetch invigilators
      ]);
    } catch (error) {
      console.error('Error adding schedule:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add schedule');
    }
  };

  // 2. เรียกใช้ฟังก์ชันนี้ในทุกครั้งที่มีการเปลี่ยนแปลงข้อมูล
  const handleEditSchedule = async () => {
    if (!editSchedule) return;

    try {
        // กรณีเปลี่ยนแปลงผู้คุมสอบ
        if (editSchedule.invigilator?.id !== selectedSchedule?.invigilator?.id) {
            // กรณีมีผู้คุมสอบคนใหม่
            if (editSchedule.invigilator?.id) {
                const newInvigilator = invigilators.find(inv => inv.id === editSchedule.invigilator?.id);
                if (newInvigilator && newInvigilator.assignedQuota >= newInvigilator.quota) {
                    toast.error('ผู้คุมสอบท่านนี้มีโควต้าเต็มแล้ว');
                    return;
                }
            }
            
            // เพิ่มการตรวจสอบกรณียกเลิกการกำหนดผู้คุมสอบ
            if (selectedSchedule?.invigilator?.id && !editSchedule.invigilator?.id) {
                console.log('Removing invigilator, should decrease quota');
            }
        }

        const response = await fetch(`/api/schedules/${editSchedule.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subjectGroupId: editSchedule.subjectGroup.id,
                date: editSchedule.date,
                startTime: editSchedule.startTime,
                endTime: editSchedule.endTime,
                roomId: editSchedule.room.id,
                invigilatorId: editSchedule.invigilator?.id || null,
                previousInvigilatorId: selectedSchedule?.invigilator?.id,
                updateQuota: true,
                shouldDecreaseQuota: selectedSchedule?.invigilator?.id && !editSchedule.invigilator?.id // เพิ่มฟิลด์นี้
            }),
        });

        if (response.ok) {
            toast.success('อัพเดตตารางสอบสำเร็จ');
            setShowEditModal(false);
            setEditSchedule(null);
            await Promise.all([
                fetchSchedules(),
                fetchInvigilators()
            ]);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update exam schedule');
        }
    } catch (error) {
        console.error('Error updating exam schedule:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to update exam schedule');
    }
};

  const handleDeleteSchedule = async () => {
    if (!selectedSchedule) return;

    try {
        const response = await fetch(`/api/schedules/${selectedSchedule.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                invigilatorId: selectedSchedule.invigilator?.id // ส่ง ID ของผู้คุมสอบไปด้วย
            })
        });

        if (response.ok) {
            toast.success('ลบตารางสอบสำเร็จ');
            setShowDeleteModal(false);
            setSelectedSchedule(null);
            await Promise.all([
                fetchSchedules(),
                fetchInvigilators() // เพิ่มการ fetch invigilators หลังลบ
            ]);
        } else {
            toast.error('ไม่สามารถลบตารางสอบได้');
        }
    } catch (error) {
        console.error('Error deleting exam schedule:', error);
        toast.error('ไม่สามารถลบตารางสอบได้');
    }
};

const generateExportPreview = () => {
  // Apply export filters
  const filtered = schedules.filter(schedule => {
    const matchesExamType = !exportFilters.examType || schedule.examType === exportFilters.examType;
    
    const matchesYear = !exportFilters.academicYear || 
      schedule.academicYear === parseInt(exportFilters.academicYear);
    
    const matchesSemester = !exportFilters.semester || 
      schedule.semester === parseInt(exportFilters.semester);
    
    const matchesDepartment = !exportFilters.department || 
      schedule.subjectGroup.subject.department.name === exportFilters.department;
    
    // Add date range filtering
    const scheduleDate = new Date(schedule.date);
    const startDate = exportFilters.startDate ? new Date(exportFilters.startDate) : null;
    const endDate = exportFilters.endDate ? new Date(exportFilters.endDate) : null;
    
    const matchesDateRange = (!startDate || scheduleDate >= startDate) && 
                             (!endDate || scheduleDate <= endDate);

    return matchesExamType && matchesYear && matchesSemester && 
           matchesDepartment && matchesDateRange;
  });
  
    // Sort the filtered data
    const sorted = [...filtered].sort((a, b) => {
      // Sort by department
      const deptCompare = a.subjectGroup.subject.department.name.localeCompare(b.subjectGroup.subject.department.name);
      if (deptCompare !== 0) return deptCompare;
      
      // Sort by subject code
      const codeCompare = a.subjectGroup.subject.code.localeCompare(b.subjectGroup.subject.code);
      if (codeCompare !== 0) return codeCompare;
      
      // Sort by group
      const groupCompare = a.subjectGroup.groupNumber.localeCompare(b.subjectGroup.groupNumber);
      if (groupCompare !== 0) return groupCompare;
      
      // Sort by date
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  
    setPreviewData(sorted);
    setShowPreview(true);
  };

    // แก้ไขฟังก์ชัน handleExportExcel ให้แสดงชื่ออาจารย์แทนชื่อ Google Account และเรียงคอลัมน์ให้ตรงกับตารางแสดงผล
  const handleExportExcel = () => {
    try {
      // ใช้ข้อมูลจาก previewData สำหรับการส่งออก
      const exportData = previewData.map(schedule => {
        // หาชื่ออาจารย์จาก invigilator ที่เชื่อมกับ professor (ถ้ามี)
        let invigilatorName = schedule.invigilator?.name || '-';
        
        // ค้นหา invigilator ในรายการ state เพื่อดึง displayName (ถ้ามี)
        if (schedule.invigilator) {
          const matchedInvigilator = invigilators.find(inv => inv.id === schedule.invigilator?.id);
          if (matchedInvigilator?.displayName) {
            invigilatorName = matchedInvigilator.displayName;
          }
        }
        
        // รวมรายชื่ออาจารย์ผู้สอน
        const allProfessors = getAllProfessors(schedule);
        
        // คืนค่าข้อมูลที่จะใช้ในการส่งออกตามลำดับเดียวกับตาราง
        return {
          'วันที่': formatThaiDate(new Date(schedule.date)),
          'เวลา': `${new Date(schedule.startTime).toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
          })} - ${new Date(schedule.endTime).toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
          })}`,
          'วิชา': `${schedule.subjectGroup.subject.code} - ${schedule.subjectGroup.subject.name}`,
          'กลุ่มเรียน': schedule.subjectGroup.groupNumber,
          'ชั้นปี': schedule.subjectGroup.year || '-',
          'จำนวน นศ.': schedule.subjectGroup.studentCount || '-',
          'ผู้สอน': allProfessors,
          'อาคาร': schedule.room.building,
          'ห้อง': schedule.room.roomNumber,
          'ความจุห้อง': schedule.room.capacity || '-',
          'ภาควิชา': schedule.subjectGroup.subject.department.name || '-',
          'ตำแหน่งผู้คุมสอบ': schedule.invigilator?.type || '-',
          'ชื่อเจ้าหน้าที่': invigilatorName, // ใช้ชื่ออาจารย์แทนชื่อ Google
          'หมายเหตุ': schedule.notes || '-'
        };
      });

      // สร้าง workbook และ worksheet
      const wb = XLSXUtils.book_new();
      const ws = XLSXUtils.json_to_sheet(exportData, { 
        header: [
          'วันที่', 'เวลา', 'วิชา', 'กลุ่มเรียน', 'ชั้นปี', 'จำนวน นศ.',
          'ผู้สอน', 'อาคาร', 'ห้อง', 'ความจุห้อง', 'ภาควิชา', 
          'ตำแหน่งผู้คุมสอบ', 'ชื่อเจ้าหน้าที่', 'หมายเหตุ'
        ]
      });

      // ตั้งค่า autofilter
      ws['!autofilter'] = {
        ref: `A1:N${exportData.length + 1}`
      };

      // กำหนดความกว้างคอลัมน์ให้เหมาะสม
      const colWidths = [
        { wch: 15 },  // วันที่
        { wch: 18 },  // เวลา
        { wch: 40 },  // วิชา
        { wch: 10 },  // กลุ่มเรียน
        { wch: 8 },   // ชั้นปี
        { wch: 10 },  // จำนวน นศ.
        { wch: 30 },  // ผู้สอน
        { wch: 15 },  // อาคาร
        { wch: 10 },  // ห้อง
        { wch: 10 },  // ความจุห้อง
        { wch: 30 },  // ภาควิชา
        { wch: 15 },  // ตำแหน่งผู้คุมสอบ
        { wch: 30 },  // ชื่อเจ้าหน้าที่
        { wch: 30 },  // หมายเหตุ
      ];
      ws['!cols'] = colWidths;

      // เพิ่ม worksheet ไปยัง workbook
      XLSXUtils.book_append_sheet(wb, ws, 'ตารางสอบ');

      // สร้างชื่อไฟล์ที่มีข้อมูลตามฟิลเตอร์
      const examTypeText = exportFilters.examType ? 
        (exportFilters.examType === 'MIDTERM' ? 'กลางภาค' : 'ปลายภาค') : 'ทั้งหมด';
      const yearText = exportFilters.academicYear || 'ทุกปี';
      const semesterText = exportFilters.semester || 'ทุกภาค';
      const deptText = exportFilters.department ? 
        exportFilters.department.substring(0, 10) : 'ทุกภาควิชา';
      
      const fileName = `ตารางสอบ_${examTypeText}_${yearText}_${semesterText}_${deptText}.xlsx`;

      // ดาวน์โหลด
      const wbout = write(wb, {
        bookType: 'xlsx',
        type: 'array',
        bookSST: false,
        cellStyles: true,
        compression: true
      });

      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      
      setShowExportModal(false);
      setShowPreview(false);
      toast.success('ส่งออกข้อมูลสำเร็จ');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
    }
  };

  // Update filter logic
  const filteredSchedules = schedules.filter(schedule => {
    const matchesDate = !filters.date || 
      new Date(schedule.date).toISOString().split('T')[0] === filters.date;
  
    const matchesTimeSlot = !filters.timeSlot || 
      (filters.timeSlot === schedule.scheduleDateOption);  // แก้ไขตรงนี้
    
    const matchesDepartment = !filters.department || 
      schedule.subjectGroup.subject.department.name === filters.department;
  
    const matchesExamType = !filters.examType || schedule.examType === filters.examType;
    
    const matchesAcademicYear = !filters.academicYear || 
      schedule.academicYear === parseInt(filters.academicYear);
      
    const matchesSemester = !filters.semester || 
      schedule.semester === parseInt(filters.semester);
  
    const searchQuery = filters.searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      schedule.subjectGroup.subject.code.toLowerCase().includes(searchQuery) ||
      schedule.subjectGroup.subject.name.toLowerCase().includes(searchQuery) ||
      schedule.room.building.toLowerCase().includes(searchQuery) ||
      schedule.room.roomNumber.toLowerCase().includes(searchQuery);
  
    return matchesDate && matchesTimeSlot && matchesDepartment && 
           matchesExamType && matchesAcademicYear && matchesSemester && matchesSearch;
  });

  const sortedSchedules = [...filteredSchedules].sort((a, b) => {
    // เรียงตามปีการศึกษา
    const yearCompare = b.academicYear - a.academicYear;
    if (yearCompare !== 0) return yearCompare;

    // เรียงตามภาคการศึกษา
    const semesterCompare = b.semester - a.semester;
    if (semesterCompare !== 0) return semesterCompare;

    // เรียงตามภาควิชา
    const deptCompare = a.subjectGroup.subject.department.name.localeCompare(b.subjectGroup.subject.department.name);
    if (deptCompare !== 0) return deptCompare;

    // เรียงตามวันที่
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;

    // เรียงตามช่วงเวลา
    const timeSlotOrder = { 'ช่วงเช้า': 1, 'ช่วงบ่าย': 2 };
    return timeSlotOrder[a.scheduleDateOption] - timeSlotOrder[b.scheduleDateOption];
  });

  // 1. สร้างฟังก์ชันสำหรับ fetch invigilators โดยเฉพาะ
  const fetchInvigilators = async () => {
    try {
      const response = await fetch('/api/invigilators', {
        // เพิ่ม cache: 'no-store' เพื่อให้ได้ข้อมูลล่าสุดเสมอ
        cache: 'no-store'
      });
      const data = await response.json();
      setInvigilators(data);
    } catch (error) {
      console.error('Failed to fetch invigilators:', error);
      toast.error('Failed to fetch invigilators data');
    }
  };

  // Function to get all professors for a subject group
  const getAllProfessors = (schedule: Schedule) => {
    const mainProfessor = schedule.subjectGroup.professor?.name || '-';
    const additionalProfessors = schedule.subjectGroup.additionalProfessors?.map(
      ap => ap.professor.name
    ) || [];
    
    const allProfessors = [mainProfessor, ...additionalProfessors].filter(p => p !== '-');
    return allProfessors.length > 0 ? allProfessors.join(', ') : '-';
  };
  return (
    <div className="p-6 space-y-6">
      <Toaster/>
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">ตารางสอบ</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FiDownload className="w-4 h-4" />
              ส่งออกเป็น Excel
            </span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            เพิ่มตารางสอบ
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white/30 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100 p-6">
  {/* Filter Groups */}
  <div className="space-y-4">
    {/* Filter Row 1 - Main Filters */}
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {/* Academic Year Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ปีการศึกษา
        </label>
        <select
          value={filters.academicYear}
          onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
          className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white text-sm"
        >
          <option value="">ทุกปีการศึกษา</option>
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + 543 - i).map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Exam Type Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ประเภทการสอบ
        </label>
        <select
          value={filters.examType}
          onChange={(e) => setFilters({ ...filters, examType: e.target.value })}
          className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white text-sm"
        >
          <option value="">ทั้งหมด</option>
          <option value="MIDTERM">สอบกลางภาค</option>
          <option value="FINAL">สอบปลายภาค</option>
        </select>
      </div>

      {/* Semester Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ภาคการศึกษา
        </label>
        <select
          value={filters.semester}
          onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
          className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white text-sm"
        >
          <option value="">ทั้งหมด</option>
          <option value="1">ภาคการศึกษาที่ 1</option>
          <option value="2">ภาคการศึกษาที่ 2</option>
        </select>
      </div>

      {/* Department Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ภาควิชา
        </label>
        <select
          value={filters.department}
          onChange={(e) => setFilters({ ...filters, department: e.target.value })}
          className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white text-sm"
        >
          <option value="">ทุกภาควิชา</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.name}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>
    </div>

    {/* Filter Row 2 - Secondary Filters */}
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {/* Date Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          วันที่สอบ
        </label>
        <input
          type="date"
          value={filters.date}
          onChange={(e) => setFilters({ ...filters, date: e.target.value })}
          className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
        />
      </div>

      {/* Time Slot Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ช่วงเวลา
        </label>
        <select
          value={filters.timeSlot}
          onChange={(e) => setFilters({ ...filters, timeSlot: e.target.value })}
          className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white text-sm"
        >
          <option value="">ทุกช่วงเวลา</option>
          <option value="ช่วงเช้า">ช่วงเช้า</option>
          <option value="ช่วงบ่าย">ช่วงบ่าย</option>
        </select>
      </div>

      {/* Search Filter */}
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ค้นหา
        </label>
        <div className="relative">
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
            placeholder="ค้นหารหัสวิชา, ชื่อวิชา, ห้อง..."
            className="w-full px-8 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
          />
          <svg
            className="absolute left-2 top-2 h-4 w-4 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>
    </div>

    {/* Filter Actions */}
    <div className="flex justify-end gap-2">
      <button
        onClick={() => setFilters({
          date: '',
          timeSlot: '',
          department: '',
          professor: '',
          building: '',
          searchQuery: '',
          examType: '',
          academicYear: '',
          semester: ''
        })}
        className="px-4 py-1.5 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-all flex items-center gap-2"
      >
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        ล้างตัวกรอง
      </button>
    </div>
  </div>
</div>

      {/* Table Container */}
      <div className="bg-white/30 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100">
        <div className="h-[calc(100vh-24rem)] overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <ImSpinner8 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            </div>
          ) : sortedSchedules.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <FiDatabase className="w-16 h-16 text-gray-300" />
                <p className="text-gray-500 text-lg">ไม่พบข้อมูลตารางสอบ</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  เพิ่มตารางสอบ
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-white/95 backdrop-blur-sm">
                  <tr className="border-b border-gray-100">
                    <th 
                      onClick={() => setSortConfig({
                        key: 'date',
                        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
                      })}
                      className="px-6 py-4 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50"
                    >
                      วันที่ {sortConfig.key === 'date' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">เวลา</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">วิชา</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">กลุ่มเรียน</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ชั้นปี</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">จำนวน นศ.</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ผู้สอน</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">อาคาร</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ห้อง</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">จำนวน</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ภาควิชา</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ตำแหน่งผู้คุมสอบ</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ชื่อเจ้าหน้าที่</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">หมายเหตุ</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                {/* Update table body rendering with null checks */}
                <tbody className="divide-y divide-gray-100">
                  {sortedSchedules.map((schedule) => (
                    <tr key={schedule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {formatThaiDate(new Date(schedule.date))}
                      </td>
                      <td className="px-6 py-4">
                        {new Date(schedule.startTime).toLocaleTimeString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} - {' '}
                        {new Date(schedule.endTime).toLocaleTimeString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <Highlight 
                          text={`${schedule.subjectGroup.subject.code} - ${schedule.subjectGroup.subject.name}`}
                          search={filters.searchQuery}
                        />
                      </td>
                      <td className="px-6 py-4">{schedule.subjectGroup.groupNumber}</td>
                      <td className="px-6 py-4">{schedule.subjectGroup.year || '-'}</td>
                      <td className="px-6 py-4">{schedule.subjectGroup.studentCount || '-'}</td>
                      <td className="px-6 py-4">
                        {getAllProfessors(schedule)}
                      </td>
                      <td className="px-6 py-4">{schedule.room.building}</td>
                      <td className="px-6 py-4">{schedule.room.roomNumber}</td>
                      <td className="px-6 py-4">{schedule.room.capacity || '-'}</td>
                      <td className="px-6 py-4">{schedule.subjectGroup.subject.department.name || '-'}</td>
                      {/* Update invigilator columns with null checks */}
                      <td className="px-6 py-4">
                        {schedule.invigilator?.type || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {/* Show professor name if available, otherwise show invigilator name */}
                        {(() => {
                          // If schedule has invigilator
                          if (schedule.invigilator) {
                            // Find matching invigilator in state
                            const matchedInvigilator = invigilators.find(inv => inv.id === schedule.invigilator?.id);
                            
                            // If matched and has displayName (from professor), use that
                            if (matchedInvigilator?.displayName) {
                              return matchedInvigilator.displayName;
                            }
                            
                            // Otherwise use the name we have
                            return schedule.invigilator.name || '-';
                          }
                          return '-';
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        {schedule.notes || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditSchedule(schedule);
                              setShowEditModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSchedule(schedule);
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
          )}
        </div>
      </div>

      {/* Modals - Moved outside table container */}
      {(showAddModal || showEditModal || showDeleteModal) && (
        <div className="fixed inset-0 z-[100]">
          {/* Add Schedule Modal */}
          {showAddModal && (
            <PopupModal
              title="เพิ่มตารางสอบใหม่"
              onClose={() => setShowAddModal(false)}
              onConfirm={handleAddSchedule}
              confirmText="เพิ่มตารางสอบ"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700">กลุ่มวิชา</label>
                  <select
                    value={formData.subjectGroupId}
                    onChange={(e) => setFormData({ ...formData, subjectGroupId: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">เลือกกลุ่มวิชา</option>
                    {subjectGroups.map((group: SubjectGroup) => (
                      <option key={group.id} value={group.id}>
                        {group.subject.code} - {group.subject.name} (กลุ่ม {group.groupNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700">วันที่</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">เวลาเริ่ม</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700">เวลาสิ้นสุด</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">ห้อง</label>
                    <select
                      value={formData.roomId}
                      onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                      className="w-full border border-gray-300 p-2 rounded-md"
                      required
                    >
                      <option value="">เลือกห้อง</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.building} - {room.roomNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700">ผู้คุมสอบ</label>
                    <select
                      value={formData.invigilatorId}
                      onChange={(e) => setFormData({ ...formData, invigilatorId: e.target.value })}
                      className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">เลือกผู้คุมสอบ</option>
                      {invigilators.map((invigilator: ExtendedInvigilator) => (
                      <option key={invigilator.id} value={invigilator.id}>
                        {invigilator.name} (โควต้า: {invigilator.assignedQuota}/{invigilator.quota})
                      </option>
                    ))}
                    </select>
                  </div>
                </div>
              </div>
            </PopupModal>
          )}

          {/* Edit Schedule Modal */}

        {showEditModal && editSchedule && (
          <PopupModal
            title="แก้ไขตารางสอบ"
            onClose={() => setShowEditModal(false)}
            onConfirm={handleEditSchedule}
            confirmText="บันทึกการแก้ไข"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700">กลุ่มวิชา</label>
                  <select
                    value={editSchedule.subjectGroup.id}
                    onChange={(e) => setEditSchedule({
                      ...editSchedule,
                      subjectGroup: { ...editSchedule.subjectGroup, id: e.target.value }
                    })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    required
                  >
                    <option value="">เลือกกลุ่มวิชา</option>
                    {subjectGroups.map((group: SubjectGroup) => (
                      <option key={group.id} value={group.id}>
                        {group.subject.code} - {group.subject.name} (กลุ่ม {group.groupNumber})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700">ผู้คุมสอบ</label>
                  <select
                    value={editSchedule.invigilator?.id || ''}
                    onChange={(e) => {
                      const selectedInvigilator = invigilators.find(inv => inv.id === e.target.value);
                      if (selectedInvigilator) {
                        setEditSchedule({
                          ...editSchedule,
                          invigilator: {
                            id: selectedInvigilator.id,
                            name: selectedInvigilator.displayName || selectedInvigilator.name,
                            type: selectedInvigilator.type
                          }
                        });
                      }
                    }}
                    className="w-full border border-gray-300 p-2 rounded-md"
                  >
                    <option value="">เลือกผู้คุมสอบ</option>
                    
                    {/* กลุ่มอาจารย์ */}
                    <optgroup label="อาจารย์">
                      {invigilators
                        .filter(inv => inv.isProfessor)
                        .map(invigilator => (
                          <option key={invigilator.id} value={invigilator.id}>
                            {invigilator.displayName || invigilator.name} {!invigilator.id.startsWith('prof_') && `(โควต้า: ${invigilator.assignedQuota}/${invigilator.quota})`}
                          </option>
                        ))
                      }
                    </optgroup>
                    
                    {/* กลุ่มเจ้าหน้าที่ */}
                    <optgroup label="เจ้าหน้าที่">
                      {invigilators
                        .filter(inv => !inv.isProfessor)
                        .map(invigilator => (
                          <option key={invigilator.id} value={invigilator.id}>
                            {invigilator.displayName || invigilator.name} (โควต้า: {invigilator.assignedQuota}/{invigilator.quota})
                          </option>
                        ))
                      }
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Add section for professors */}
              <div>
                <label className="block text-gray-700 mb-2">อาจารย์ผู้สอน</label>
                <div className="border border-gray-300 rounded-md p-3 bg-gray-50">
                  <div className="mb-2">
                    <p className="text-sm text-gray-500 mb-2">อาจารย์ผู้สอนปัจจุบัน:</p>
                    <div className="bg-white p-2 rounded border border-gray-200 text-sm">
                      {getAllProfessors(editSchedule) || '-'}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    หมายเหตุ: การแก้ไขอาจารย์ผู้สอนสามารถทำได้ที่หน้าจัดการกลุ่มวิชา
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700">วันที่</label>
                  <input
                    type="date"
                    value={new Date(editSchedule.date).toISOString().split('T')[0]}
                    onChange={(e) => setEditSchedule({
                      ...editSchedule,
                      date: new Date(e.target.value)
                    })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700">เวลาเริ่ม</label>
                  <input
                    type="time"
                    value={new Date(editSchedule.startTime).toLocaleTimeString('en-US', { hour12: false })}
                    onChange={(e) => setEditSchedule({
                      ...editSchedule,
                      startTime: new Date(`${editSchedule.date.toDateString()} ${e.target.value}`)
                    })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700">เวลาสิ้นสุด</label>
                  <input
                    type="time"
                    value={new Date(editSchedule.endTime).toLocaleTimeString('en-US', { hour12: false })}
                    onChange={(e) => setEditSchedule({
                      ...editSchedule,
                      endTime: new Date(`${editSchedule.date.toDateString()} ${e.target.value}`)
                    })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700">หมายเหตุ</label>
                  <input
                    type="text"
                    value={editSchedule.notes || ''}
                    onChange={(e) => setEditSchedule({
                      ...editSchedule,
                      notes: e.target.value
                    })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    placeholder="ระบุหมายเหตุ (ถ้ามี)"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700">อาคาร</label>
                  <input
                    type="text"
                    value={editSchedule.room.building}
                    onChange={(e) => setEditSchedule({
                      ...editSchedule,
                      room: { ...editSchedule.room, building: e.target.value }
                    })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700">หมายเลขห้อง</label>
                  <input
                    type="text"
                    value={editSchedule.room.roomNumber}
                    onChange={(e) => setEditSchedule({
                      ...editSchedule,
                      room: { ...editSchedule.room, roomNumber: e.target.value }
                    })}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    required
                  />
                </div>
              </div>
            </div>
          </PopupModal>
        )}

          {/* Delete Schedule Modal */}
          {showDeleteModal && selectedSchedule && (
            <PopupModal
              title="ลบตารางสอบ"
              onClose={() => setShowDeleteModal(false)}
              onConfirm={handleDeleteSchedule}
              confirmText="ยืนยันการลบ"
            >
              <p className="text-gray-700">
                คุณต้องการลบตารางสอบวิชา{' '}
                <strong>{selectedSchedule.subjectGroup.subject.name}</strong>{' '}
                วันที่{' '}
                <strong>{new Date(selectedSchedule.date).toLocaleDateString('th-TH')}</strong>{' '}
                ใช่หรือไม่?
              </p>
            </PopupModal>
          )}
        </div>
      )}

      {showExportModal && (
        <PopupModal
          title="ส่งออกข้อมูลตารางสอบเป็น Excel"
          onClose={() => {
            setShowExportModal(false);
            setShowPreview(false);
          }}
          onConfirm={showPreview ? handleExportExcel : generateExportPreview}
          confirmText={showPreview ? "ดาวน์โหลด Excel" : "แสดงตัวอย่างข้อมูล"}
          confirmIcon={showPreview ? <FiDownload className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
          maxWidth="5xl"
        >
          <div className="space-y-6">
            {!showPreview ? (
              <>
                <div className="bg-blue-50 p-4 rounded-lg text-blue-700 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-1">
                      <FiFilter className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">เลือกข้อมูลที่ต้องการส่งออก</h4>
                      <p>กรุณาระบุเงื่อนไขในการส่งออกข้อมูล โดยสามารถเลือกตามประเภทการสอบ ปีการศึกษา ภาคการศึกษา และภาควิชาได้</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ประเภทการสอบ
                    </label>
                    <select
                      value={exportFilters.examType}
                      onChange={(e) => setExportFilters({ ...exportFilters, examType: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white"
                    >
                      <option value="">ทั้งหมด</option>
                      <option value="MIDTERM">สอบกลางภาค</option>
                      <option value="FINAL">สอบปลายภาค</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ปีการศึกษา
                    </label>
                    <select
                      value={exportFilters.academicYear}
                      onChange={(e) => setExportFilters({ ...exportFilters, academicYear: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white"
                    >
                      <option value="">ทุกปีการศึกษา</option>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + 543 - i).map(year => (
                        <option key={year} value={year - 543}>{year}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ภาคการศึกษา
                    </label>
                    <select
                      value={exportFilters.semester}
                      onChange={(e) => setExportFilters({ ...exportFilters, semester: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white"
                    >
                      <option value="">ทุกภาคการศึกษา</option>
                      <option value="1">ภาคการศึกษาที่ 1</option>
                      <option value="2">ภาคการศึกษาที่ 2</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ภาควิชา
                    </label>
                    <select
                      value={exportFilters.department}
                      onChange={(e) => setExportFilters({ ...exportFilters, department: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white"
                    >
                      <option value="">ทุกภาควิชา</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      วันที่เริ่มต้น
                    </label>
                    <input
                      type="date"
                      value={exportFilters.startDate}
                      onChange={(e) => setExportFilters({ ...exportFilters, startDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      วันที่สิ้นสุด
                    </label>
                    <input
                      type="date"
                      value={exportFilters.endDate}
                      onChange={(e) => setExportFilters({ ...exportFilters, endDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-green-50 p-4 rounded-lg text-green-700 text-sm mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1">
                      <FiDownload className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">ตัวอย่างข้อมูลที่จะส่งออก ({previewData.length} รายการ)</h4>
                      <p>ข้อมูลด้านล่างเป็นตัวอย่างข้อมูลที่จะถูกส่งออกเป็นไฟล์ Excel คุณสามารถดาวน์โหลดไฟล์ Excel ได้โดยคลิกปุ่ม &quot;ดาวน์โหลด Excel&quot;</p>
                    </div>
                  </div>
                </div>
                
                <div className="max-h-96 overflow-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เวลา</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วิชา</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">กลุ่มเรียน</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชั้นปี</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวน นศ.</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้สอน</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">อาคาร</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ห้อง</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ความจุห้อง</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ภาควิชา</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ตำแหน่งผู้คุมสอบ</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อเจ้าหน้าที่</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.length > 0 ? (
                        previewData.map((schedule) => {
                          // ค้นหาชื่อผู้คุมสอบจาก displayName ถ้ามี
                          let invigilatorName = schedule.invigilator?.name || '-';
                          if (schedule.invigilator) {
                            const matchedInvigilator = invigilators.find(inv => inv.id === schedule.invigilator?.id);
                            if (matchedInvigilator?.displayName) {
                              invigilatorName = matchedInvigilator.displayName;
                            }
                          }
                          
                          // ใช้ฟังก์ชัน getAllProfessors สำหรับแสดงรายชื่ออาจารย์ผู้สอน
                          const allProfessors = getAllProfessors(schedule);
                          
                          return (
                            <tr key={schedule.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 whitespace-nowrap">{formatThaiDate(new Date(schedule.date))}</td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {`${new Date(schedule.startTime).toLocaleTimeString('th-TH', {
                                  hour: '2-digit', minute: '2-digit'
                                })} - ${new Date(schedule.endTime).toLocaleTimeString('th-TH', {
                                  hour: '2-digit', minute: '2-digit'
                                })}`}
                              </td>
                              <td className="px-4 py-2 max-w-xs truncate">
                                {`${schedule.subjectGroup.subject.code} - ${schedule.subjectGroup.subject.name}`}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">{schedule.subjectGroup.groupNumber}</td>
                              <td className="px-4 py-2 whitespace-nowrap">{schedule.subjectGroup.year || '-'}</td>
                              <td className="px-4 py-2 whitespace-nowrap">{schedule.subjectGroup.studentCount || '-'}</td>
                              <td className="px-4 py-2 whitespace-nowrap">{allProfessors}</td>
                              <td className="px-4 py-2 whitespace-nowrap">{schedule.room.building}</td>
                              <td className="px-4 py-2 whitespace-nowrap">{schedule.room.roomNumber}</td>
                              <td className="px-4 py-2 whitespace-nowrap">{schedule.room.capacity || '-'}</td>
                              <td className="px-4 py-2 whitespace-nowrap">{schedule.subjectGroup.subject.department.name}</td>
                              <td className="px-4 py-2 whitespace-nowrap">{schedule.invigilator?.type || '-'}</td>
                              <td className="px-4 py-2 whitespace-nowrap">{invigilatorName}</td>
                              <td className="px-4 py-2 whitespace-nowrap">{schedule.notes || '-'}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={14} className="px-4 py-8 text-center text-gray-500">
                            ไม่พบข้อมูลที่ตรงตามเงื่อนไขที่เลือก
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <button 
                    onClick={() => setShowPreview(false)} 
                    className="flex items-center gap-2 hover:text-blue-600"
                  >
                    <FiFilter className="w-4 h-4" />
                    ปรับเงื่อนไขการส่งออก
                  </button>
                  <div>จำนวนรายการทั้งหมด: <strong>{previewData.length}</strong> รายการ</div>
                </div>
              </>
            )}
          </div>
        </PopupModal>
      )}
    </div>
  );
}