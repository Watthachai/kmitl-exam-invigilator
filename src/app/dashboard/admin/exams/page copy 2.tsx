"use client";

import { useEffect, useState, useCallback } from "react";
import { FiEdit2, FiDownload, FiFilter, FiEye, FiShuffle, FiArrowLeft } from "react-icons/fi";
import toast, { Toaster } from "react-hot-toast";
import PopupModal from "@/app/components/ui/popup-modal";
import { Invigilator } from "@prisma/client";
import { utils as XLSXUtils, write } from "xlsx";
import  SearchableInvigilatorSelect from "@/app/components/ui/search-dropdown";
import debounce from 'lodash/debounce';

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
  scheduleDateOption: "ช่วงเช้า" | "ช่วงบ่าย"; // เพิ่ม
  examType: "MIDTERM" | "FINAL"; // เพิ่ม
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
      };
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
  department?: {
    name: string;
  };
}

interface AssignmentPreview {
  scheduleId: string;
  date: string | Date;
  timeSlot: string;
  subjectCode: string;
  subjectName: string;
  department: string;
  currentInvigilator?: string;
  newInvigilator: string;
  newInvigilatorId: string;
  invigilatorType?: string;
  invigilatorDepartment?: string;
  quotaUsed: number;
  quotaTotal: number;
  isTeachingFaculty: boolean;
  otherAssignments?: string;
  timeConflicts?: Array<{
    date: string;
    timeSlot: string;
    subjectCode: string;
  }> | null;
}

type SortKey = keyof Schedule | "subjectGroup.subject.department.name";

const formatThaiDate = (date: Date) => {
  const thaiDays = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  const thaiMonths = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];

  const d = new Date(date);
  const day = thaiDays[d.getDay()];
  const month = thaiMonths[d.getMonth()];
  const year = (d.getFullYear() + 543).toString().slice(-2);

  return `${day} ${d.getDate()} ${month} ${year}`;
};

export default function ExamsPage() {
  const [showEditInvigilatorModal, setShowEditInvigilatorModal] = useState(false);
  const [selectedInvForEdit, setSelectedInvForEdit] = useState<ExtendedInvigilator | null>(null);
  const [currentEditIndex, setCurrentEditIndex] = useState<number | null>(null);

  const [showQuickAssignModal, setShowQuickAssignModal] = useState(false);
  const [selectedInvForQuickAssign, setSelectedInvForQuickAssign] = useState<ExtendedInvigilator | null>(null);
  const [currentScheduleId, setCurrentScheduleId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null
  );
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null);
  const [subjectGroups, setSubjectGroups] = useState([]);
  const [invigilators, setInvigilators] = useState<ExtendedInvigilator[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState({
    subjectGroupId: "",
    date: "",
    startTime: "",
    endTime: "",
    roomId: "",
    invigilatorId: "",
  });

  const [filters, setFilters] = useState({
    date: "",
    timeSlot: "", // 'ช่วงเช้า' or 'ช่วงบ่าย'
    department: "",
    professor: "",
    building: "",
    searchQuery: "",
    examType: "", // MIDTERM/FINAL
    academicYear: "",
    semester: "",
  });

  const [isLoading, setIsLoading] = useState(true);

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({
    key: "date",
    direction: "asc",
  });

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    examType: "",
    academicYear: "",
    semester: "",
    department: "",
    startDate: "",
    endDate: "",
  });
  const [previewData, setPreviewData] = useState<Schedule[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async (page: number = 1) => {
    try {
      setIsLoading(true);
      
      // สร้าง URL params สำหรับ filter และ pagination
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(filters.examType && { examType: filters.examType }),
        ...(filters.academicYear && { academicYear: filters.academicYear }),
        ...(filters.semester && { semester: filters.semester }),
        ...(filters.department && { department: filters.department }),
        ...(filters.date && { date: filters.date }),
        ...(filters.timeSlot && { timeSlot: filters.timeSlot }),
        ...(filters.searchQuery && { searchQuery: filters.searchQuery })
      });
      
      const response = await fetch(`/api/schedules/paginate?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }
      
      const data = await response.json();
      
      // ตั้งค่าข้อมูลโดยตรง ไม่ต้องกรองอีกรอบ
      setSchedules(data.items);
      setPagination({
        page: data.page,
        pageSize: data.pageSize,
        totalItems: data.totalItems,
        totalPages: data.totalPages
      });
    } catch (error) {
      console.error("Failed to fetch exam schedules:", error);
      toast.error("ไม่สามารถโหลดข้อมูลตารางสอบได้");
    } finally {
      setIsLoading(false);
    }
  };

  // เพิ่ม useEffect เพื่อให้เรียก fetchSchedules เมื่อ filters เปลี่ยนแปลง
  useEffect(() => {
    // เรียกดึงข้อมูลทันทีเมื่อตัวกรองเปลี่ยนแปลง (ยกเว้น searchQuery ซึ่งจัดการโดย debounce แล้ว)
    if (!filters.searchQuery) {
      fetchSchedules(1);
    }
  }, [filters.date, filters.timeSlot, filters.department, filters.examType, filters.academicYear, filters.semester]);

  // แก้ไขฟังก์ชัน handleFilterChange ให้สะดวกขึ้น
  const handleFilterChange = (filterName: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    // ไม่ต้องเรียก fetchSchedules ที่นี่เพราะจะถูกจัดการโดย useEffect ข้างบน
  };

  // 3. ปรับปรุง useEffect สำหรับการโหลดข้อมูลครั้งแรก
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [subjectGroupsRes, invigilatorsRes] = await Promise.all([
          fetch("/api/subject-groups"),
          fetch("/api/invigilators", {
            cache: "no-store", // เพิ่มตรงนี้ด้วย
          }),
        ]);

        const subjectGroups = await subjectGroupsRes.json();
        const invigilators = await invigilatorsRes.json();

        setSubjectGroups(subjectGroups);
        setInvigilators(invigilators);
      } catch (error) {
        console.error("Failed to fetch form data:", error);
        toast.error("Failed to fetch form data");
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/rooms");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch rooms");
      }

      setRooms(result.data);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      toast.error("Failed to fetch rooms");
    }
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch("/api/departments");
        const data = await response.json();
        setDepartments(data);
      } catch (error) {
        console.error("Failed to fetch departments:", error);
        toast.error("Failed to fetch departments");
      }
    };
    fetchDepartments();
  }, []);

  // 4. ปรับปรุง handleAddSchedule ด้วยเช่นกัน
  const handleAddSchedule = async () => {
    try {
      if (
        !formData.subjectGroupId ||
        !formData.date ||
        !formData.startTime ||
        !formData.endTime ||
        !formData.roomId ||
        !formData.invigilatorId
      ) {
        toast.error("Please fill all required fields");
        return;
      }

      // ตรวจสอบโควต้าก่อนเพิ่มตารางสอบ
      const invigilator = invigilators.find(
        (inv) => inv.id === formData.invigilatorId
      );
      if (invigilator && invigilator.assignedQuota >= invigilator.quota) {
        toast.error("ผู้คุมสอบท่านนี้มีโควต้าเต็มแล้ว");
        return;
      }

      // Format dates to match Prisma schema
      const dateOnly = new Date(formData.date).toISOString().split("T")[0];
      const startDateTime = new Date(`${dateOnly}T${formData.startTime}:00`);
      const endDateTime = new Date(`${dateOnly}T${formData.endTime}:00`);

      // ปรับปรุงการกำหนดช่วงเวลา
      const startHour = parseInt(formData.startTime.split(":")[0]);
      const scheduleDateOption = startHour < 12 ? "ช่วงเช้า" : "ช่วงบ่าย";

      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectGroupId: formData.subjectGroupId,
          date: dateOnly,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          roomId: formData.roomId,
          invigilatorId: formData.invigilatorId,
          updateQuota: true, // เพิ่ม flag สำหรับอัพเดทโควต้า
          examType: filters.examType || "FINAL",
          academicYear:
            parseInt(filters.academicYear) || new Date().getFullYear(),
          semester: parseInt(filters.semester) || 1,
          scheduleDateOption: scheduleDateOption, // ใช้ค่าที่คำนวณใหม่
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create schedule");
      }

      await response.json();
      toast.success("Exam schedule added successfully");
      setShowAddModal(false);
      setFormData({
        subjectGroupId: "",
        date: "",
        startTime: "",
        endTime: "",
        roomId: "",
        invigilatorId: "",
      });

      // เรียก fetch ทั้งสองอันพร้อมกัน
      await Promise.all([
        fetchSchedules(),
        fetchInvigilators(), // เพิ่มการ fetch invigilators
      ]);
    } catch (error) {
      console.error("Error adding schedule:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add schedule"
      );
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
          const newInvigilator = invigilators.find(
            (inv) => inv.id === editSchedule.invigilator?.id
          );
          if (
            newInvigilator &&
            newInvigilator.assignedQuota >= newInvigilator.quota
          ) {
            toast.error("ผู้คุมสอบท่านนี้มีโควต้าเต็มแล้ว");
            return;
          }
        }

        // เพิ่มการตรวจสอบกรณียกเลิกการกำหนดผู้คุมสอบ
        if (
          selectedSchedule?.invigilator?.id &&
          !editSchedule.invigilator?.id
        ) {
          console.log("Removing invigilator, should decrease quota");
        }
      }

      const response = await fetch(`/api/schedules/${editSchedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectGroupId: editSchedule.subjectGroup.id,
          date: editSchedule.date,
          startTime: editSchedule.startTime,
          endTime: editSchedule.endTime,
          roomId: editSchedule.room.id,
          invigilatorId: editSchedule.invigilator?.id || null,
          previousInvigilatorId: selectedSchedule?.invigilator?.id,
          updateQuota: true,
          shouldDecreaseQuota:
            selectedSchedule?.invigilator?.id && !editSchedule.invigilator?.id, // เพิ่มฟิลด์นี้
        }),
      });

      if (response.ok) {
        toast.success("อัพเดตตารางสอบสำเร็จ");
        setShowEditModal(false);
        setEditSchedule(null);
        await Promise.all([fetchSchedules(), fetchInvigilators()]);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update exam schedule");
      }
    } catch (error) {
      console.error("Error updating exam schedule:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update exam schedule"
      );
    }
  };

  const handleDeleteSchedule = async () => {
    if (!selectedSchedule) return;

    try {
      const response = await fetch(`/api/schedules/${selectedSchedule.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invigilatorId: selectedSchedule.invigilator?.id, // ส่ง ID ของผู้คุมสอบไปด้วย
        }),
      });

      if (response.ok) {
        toast.success("ลบตารางสอบสำเร็จ");
        setShowDeleteModal(false);
        setSelectedSchedule(null);
        await Promise.all([
          fetchSchedules(),
          fetchInvigilators(), // เพิ่มการ fetch invigilators หลังลบ
        ]);
      } else {
        toast.error("ไม่สามารถลบตารางสอบได้");
      }
    } catch (error) {
      console.error("Error deleting exam schedule:", error);
      toast.error("ไม่สามารถลบตารางสอบได้");
    }
  };

  const generateExportPreview = () => {
    // Apply export filters
    const filtered = schedules.filter((schedule) => {
      const matchesExamType =
        !exportFilters.examType || schedule.examType === exportFilters.examType;

      const matchesYear =
        !exportFilters.academicYear ||
        schedule.academicYear === parseInt(exportFilters.academicYear);

      const matchesSemester =
        !exportFilters.semester ||
        schedule.semester === parseInt(exportFilters.semester);

      const matchesDepartment =
        !exportFilters.department ||
        schedule.subjectGroup.subject.department.name ===
          exportFilters.department;

      // Add date range filtering
      const scheduleDate = new Date(schedule.date);
      const startDate = exportFilters.startDate
        ? new Date(exportFilters.startDate)
        : null;
      const endDate = exportFilters.endDate
        ? new Date(exportFilters.endDate)
        : null;

      const matchesDateRange =
        (!startDate || scheduleDate >= startDate) &&
        (!endDate || scheduleDate <= endDate);

      return (
        matchesExamType &&
        matchesYear &&
        matchesSemester &&
        matchesDepartment &&
        matchesDateRange
      );
    });

    // Sort the filtered data
    const sorted = [...filtered].sort((a, b) => {
      // Sort by department
      const deptCompare = a.subjectGroup.subject.department.name.localeCompare(
        b.subjectGroup.subject.department.name
      );
      if (deptCompare !== 0) return deptCompare;

      // Sort by subject code
      const codeCompare = a.subjectGroup.subject.code.localeCompare(
        b.subjectGroup.subject.code
      );
      if (codeCompare !== 0) return codeCompare;

      // Sort by group
      const groupCompare = a.subjectGroup.groupNumber.localeCompare(
        b.subjectGroup.groupNumber
      );
      if (groupCompare !== 0) return groupCompare;

      // Sort by date
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    setPreviewData(sorted);
    setShowPreview(true);
  };

  const handleExportExcel = () => {
    try {
      // สร้าง workbook และ worksheet
      const wb = XLSXUtils.book_new();
      const ws = XLSXUtils.aoa_to_sheet([]);

      // กำหนดหัวเรื่องรายงาน
      const examTypeText = exportFilters.examType
        ? exportFilters.examType === "MIDTERM"
          ? "กลางภาค"
          : "ปลายภาค"
        : "ทั้งหมด";
      const yearText = exportFilters.academicYear || "ทุกปี";
      const semesterText = exportFilters.semester || "ทุกภาค";
      const departmentText = exportFilters.department || "ทุกภาควิชา";

      // เพิ่มหัวเรื่อง 2 บรรทัด และหัวตาราง
      XLSXUtils.sheet_add_aoa(
        ws,
        [
          [
            `รายงานการคุมสอบ${examTypeText} ภาคการศึกษาที่ ${semesterText} ปีการศึกษา ${yearText}`,
          ],
          [`ภาควิชา: ${departmentText}`],
          [], // บรรทัดว่าง
          [
            "วันที่",
            "เวลา",
            "ลำดับ",
            "วิชา",
            "กลุ่ม",
            "ชั้นปี",
            "นศ.",
            "ผู้สอน",
            "อาคาร",
            "ห้อง",
            "จำนวน",
            "คำนำหน้า",
            "ชื่อ",
            "นามสกุล",
            "หมายเหตุ",
          ],
        ],
        { origin: "A1" }
      );

      // เตรียมข้อมูลสำหรับการส่งออก
      const exportRows = [];

      for (const schedule of previewData) {
        // หาชื่ออาจารย์จาก invigilator ที่เชื่อมกับ professor (ถ้ามี)
        let invigilatorName = schedule.invigilator?.name || "-";
        let firstName = "-";
        let lastName = "-";
        let prefix = "-";

        // ค้นหา invigilator ในรายการ state เพื่อดึง displayName (ถ้ามี)
        if (schedule.invigilator) {
          const matchedInvigilator = invigilators.find(
            (inv) => inv.id === schedule.invigilator?.id
          );
          if (matchedInvigilator?.displayName) {
            invigilatorName = matchedInvigilator.displayName;

            // แยกคำนำหน้า ชื่อ นามสกุล
            const nameParts = invigilatorName.split(" ");
            if (nameParts.length >= 2) {
              // ตรวจสอบคำนำหน้า
              const possiblePrefixes = [
                "นาย",
                "นาง",
                "นางสาว",
                "ดร.",
                "ผศ.",
                "รศ.",
                "ศ.",
                "ผศ.ดร.",
                "รศ.ดร.",
                "ศ.ดร.",
              ];
              if (possiblePrefixes.some((p) => nameParts[0].includes(p))) {
                prefix = nameParts[0];
                firstName = nameParts[1] || "-";
                lastName = nameParts.slice(2).join(" ") || "-";
              } else {
                prefix = "-";
                firstName = nameParts[0] || "-";
                lastName = nameParts.slice(1).join(" ") || "-";
              }
            } else {
              firstName = invigilatorName;
            }
          }
        }

        // รวมรายชื่ออาจารย์ผู้สอน
        const allProfessors = getAllProfessors(schedule);

        // จำนวนนักศึกษา/ความจุห้อง
        const capacity = `${schedule.subjectGroup.studentCount || "0"}/${
          schedule.room.capacity || "0"
        }`;

        // แสดงข้อมูลในตารางแบบที่ต้องการ
        const isSystemGenerated = schedule.notes?.includes("เพิ่มแถวโดยระบบ");
        const notes = isSystemGenerated ? "เพิ่มแถว" : schedule.notes || "";

        // รวมรหัสวิชาและชื่อวิชาเป็น field เดียว
        const subject = `${schedule.subjectGroup.subject.code} ${schedule.subjectGroup.subject.name}`;

        exportRows.push([
          formatThaiDate(new Date(schedule.date)),
          `${new Date(schedule.startTime).toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
          })} - ${new Date(schedule.endTime).toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          "", // ลำดับ (อาจกำหนดตามต้องการ)
          subject, // วิชา (รวมรหัสและชื่อวิชาเป็นฟิลด์เดียว)
          schedule.subjectGroup.groupNumber, // กลุ่ม
          schedule.subjectGroup.year || "-", // ชั้นปี
          schedule.subjectGroup.studentCount || "-", // นศ.
          allProfessors, // ผู้สอน
          schedule.room.building, // อาคาร
          schedule.room.roomNumber, // ห้อง
          capacity, // จำนวน (นศ./ความจุห้อง)
          prefix, // คำนำหน้า
          firstName, // ชื่อ
          lastName, // นามสกุล
          notes, // หมายเหตุ
        ]);
      }

      // เพิ่มข้อมูลลงในชีท
      XLSXUtils.sheet_add_aoa(ws, exportRows, { origin: "A4" });

      // ตั้งค่าความกว้างคอลัมน์
      const colWidths = [
        { wch: 15 }, // วันที่
        { wch: 18 }, // เวลา
        { wch: 8 }, // ลำดับ
        { wch: 30 }, // วิชา
        { wch: 8 }, // กลุ่ม
        { wch: 8 }, // ชั้นปี
        { wch: 8 }, // นศ.
        { wch: 25 }, // ผู้สอน
        { wch: 15 }, // อาคาร
        { wch: 10 }, // ห้อง
        { wch: 10 }, // จำนวน
        { wch: 10 }, // คำนำหน้า
        { wch: 15 }, // ชื่อ
        { wch: 20 }, // นามสกุล
        { wch: 25 }, // หมายเหตุ
      ];
      ws["!cols"] = colWidths;

      // จัดรูปแบบหัวเรื่องและรวมเซลล์
      if (!ws["!merges"]) ws["!merges"] = [];
      ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 14 } }); // รวมเซลล์บรรทัดแรก
      ws["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 14 } }); // รวมเซลล์บรรทัดที่สอง

      // เพิ่ม worksheet ไปยัง workbook
      XLSXUtils.book_append_sheet(wb, ws, "ตารางสอบ");

      // สร้างชื่อไฟล์ที่มีข้อมูลตามฟิลเตอร์
      const fileName = `ตารางสอบ_${examTypeText}_${yearText}_${semesterText}_${departmentText.substring(
        0,
        10
      )}.xlsx`;

      // ดาวน์โหลด
      const wbout = write(wb, {
        bookType: "xlsx",
        type: "array",
        bookSST: false,
        compression: true,
      });

      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);

      setShowExportModal(false);
      setShowPreview(false);
      toast.success("ส่งออกข้อมูลสำเร็จ");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("เกิดข้อผิดพลาดในการส่งออกข้อมูล");
    }
  };

  // Update filter logic
  const filteredSchedules = schedules.filter((schedule) => {
    const matchesDate =
      !filters.date ||
      new Date(schedule.date).toISOString().split("T")[0] === filters.date;

    const matchesTimeSlot =
      !filters.timeSlot || filters.timeSlot === schedule.scheduleDateOption; // แก้ไขตรงนี้

    const matchesDepartment =
      !filters.department ||
      schedule.subjectGroup.subject.department.name === filters.department;

    const matchesExamType =
      !filters.examType || schedule.examType === filters.examType;

    const matchesAcademicYear =
      !filters.academicYear ||
      schedule.academicYear === parseInt(filters.academicYear);

    const matchesSemester =
      !filters.semester || schedule.semester === parseInt(filters.semester);

    const searchQuery = filters.searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      schedule.subjectGroup.subject.code.toLowerCase().includes(searchQuery) ||
      schedule.subjectGroup.subject.name.toLowerCase().includes(searchQuery) ||
      schedule.room.building.toLowerCase().includes(searchQuery) ||
      schedule.room.roomNumber.toLowerCase().includes(searchQuery);

    return (
      matchesDate &&
      matchesTimeSlot &&
      matchesDepartment &&
      matchesExamType &&
      matchesAcademicYear &&
      matchesSemester &&
      matchesSearch
    );
  });

  const sortedSchedules = [...filteredSchedules].sort((a, b) => {
    // เรียงตามปีการศึกษา
    const yearCompare = b.academicYear - a.academicYear;
    if (yearCompare !== 0) return yearCompare;

    // เรียงตามภาคการศึกษา
    const semesterCompare = b.semester - a.semester;
    if (semesterCompare !== 0) return semesterCompare;

    // เรียงตามภาควิชา
    const deptCompare = a.subjectGroup.subject.department.name.localeCompare(
      b.subjectGroup.subject.department.name
    );
    if (deptCompare !== 0) return deptCompare;

    // เรียงตามวันที่
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;

    // เรียงตามช่วงเวลา
    const timeSlotOrder = { ช่วงเช้า: 1, ช่วงบ่าย: 2 };
    return (
      timeSlotOrder[a.scheduleDateOption] - timeSlotOrder[b.scheduleDateOption]
    );
  });

  // 1. สร้างฟังก์ชันสำหรับ fetch invigilators โดยเฉพาะ
  const fetchInvigilators = async () => {
    try {
      const response = await fetch("/api/invigilators", {
        // เพิ่ม cache: 'no-store' เพื่อให้ได้ข้อมูลล่าสุดเสมอ
        cache: "no-store",
      });
      const data = await response.json();
      setInvigilators(data);
    } catch (error) {
      console.error("Failed to fetch invigilators:", error);
      toast.error("Failed to fetch invigilators data");
    }
  };

  // Function to get all professors for a subject group
  const getAllProfessors = (schedule: Schedule) => {
    const mainProfessor = schedule.subjectGroup.professor?.name || "-";
    const additionalProfessors =
      schedule.subjectGroup.additionalProfessors?.map(
        (ap) => ap.professor.name
      ) || [];

    const allProfessors = [mainProfessor, ...additionalProfessors].filter(
      (p) => p !== "-"
    );
    return allProfessors.length > 0 ? allProfessors.join(", ") : "-";
  };

  const [showRandomAssignModal, setShowRandomAssignModal] = useState(false);
  const [randomAssignConfig, setRandomAssignConfig] = useState({
    examType: "",
    academicYear: "",
    semester: "",
    department: "",
    prioritizeQuota: true,
    excludeAlreadyAssigned: true,
    respectTimeConstraints: true,
    avoidSameTimeSlot: true, // เพิ่มตัวเลือกนี้
    allowSameDayDifferentSlot: true // เพิ่มตัวเลือกนี้
  });

  const [previewAssignments, setPreviewAssignments] = useState<AssignmentPreview[]>([]);

  // ฟังก์ชันสำหรับสุ่มและจัดสรรผู้คุมสอบ
  // แก้ไขฟังก์ชัน handleRandomAssign ใน component ExamsPage
  const handleRandomAssign = async () => {
  if (previewAssignments.length > 0) {
    // ถ้ามีการ preview แล้ว ให้บันทึกการมอบหมาย
    try {
      toast.loading("กำลังบันทึกข้อมูล...");
      
      // แก้ไขโครงสร้างข้อมูลให้ใช้ scheduleId แทน id
      const formattedAssignments = previewAssignments.map(assignment => ({
        scheduleId: assignment.scheduleId,
        newInvigilatorId: assignment.newInvigilatorId
      }));
      
      console.log('Sending assignments:', formattedAssignments);
      
      // ส่งข้อมูลไปบันทึกที่ API
      const response = await fetch("/api/schedules/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: formattedAssignments }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "ไม่สามารถบันทึกข้อมูลได้");
      }
      
      toast.dismiss();
      toast.success(`บันทึกข้อมูลสำเร็จ ${previewAssignments.length} รายการ`);
      setShowRandomAssignModal(false);
      setPreviewAssignments([]);
      
      await Promise.all([fetchSchedules(), fetchInvigilators()]);
    } catch (error) {
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  } else {
    // ถ้ายังไม่มี preview ให้ดึงข้อมูลเพื่อแสดงตัวอย่าง
    try {
      toast.loading("กำลังประมวลผล...");
      
      console.log("Sending config to API:", randomAssignConfig);
      
      // ส่งเงื่อนไขการกรองไปยัง API รวมถึงตัวเลือกเพิ่มเติมใหม่
      const response = await fetch("/api/schedules/random-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...randomAssignConfig,
          // เพิ่มข้อมูลเกี่ยวกับตัวเลือกใหม่
          timeConstraints: {
            avoidSameTimeSlot: randomAssignConfig.avoidSameTimeSlot,
            allowSameDayDifferentSlot: randomAssignConfig.allowSameDayDifferentSlot
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "ไม่สามารถดึงข้อมูลได้");
      }
      
      const data = await response.json();
      console.log("Received data from API:", data);
      
      // ตรวจสอบว่าได้รับข้อมูลแบบที่คาดหวังหรือไม่
      if (!data || !data.assignments || !Array.isArray(data.assignments)) {
        throw new Error("ข้อมูลที่ได้รับไม่ถูกต้อง: " + JSON.stringify(data));
      }
      
      if (data.assignments.length === 0) {
        toast.dismiss();
        toast("ไม่พบข้อมูลที่ตรงตามเงื่อนไข กรุณาลองเปลี่ยนเงื่อนไขการค้นหา");
        return;
      }
      
      // ตรวจสอบความขัดแย้งก่อนแสดงผล
      const assignmentsByInvigilator = new Map();
      const timeSlotConflicts = [];

      // จัดกลุ่มตามผู้คุมสอบ
      data.assignments.forEach((assignment: AssignmentPreview) => {
        if (!assignmentsByInvigilator.has(assignment.newInvigilatorId)) {
          assignmentsByInvigilator.set(assignment.newInvigilatorId, [] as AssignmentPreview[]);
        }
        assignmentsByInvigilator.get(assignment.newInvigilatorId)?.push(assignment);
      });

      // ตรวจสอบความขัดแย้งในแต่ละกลุ่ม
      assignmentsByInvigilator.forEach((assignments) => {
        // จัดเรียงตามวันและเวลา
        assignments.sort((a: AssignmentPreview, b: AssignmentPreview): number => {
          const dateA: Date = new Date(a.date);
          const dateB: Date = new Date(b.date);
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
          }
          // ถ้าวันเดียวกัน เรียงตาม timeSlot
          return a.timeSlot.localeCompare(b.timeSlot);
        });
        
        // ตรวจสอบความขัดแย้ง
        for (let i = 0; i < assignments.length; i++) {
          const current = assignments[i];
          
          // เตรียมตรวจสอบความขัดแย้ง
          const currentDate = new Date(current.date).toDateString();
          const currentTime = current.timeSlot;
          
          // ตรวจสอบกับรายการอื่นๆ
          for (let j = i + 1; j < assignments.length; j++) {
            const other = assignments[j];
            const otherDate = new Date(other.date).toDateString();
            const otherTime = other.timeSlot;
            
            // ถ้าวันเดียวกันและเวลาเดียวกัน = ขัดแย้ง
            if (currentDate === otherDate && currentTime === otherTime) {
              console.log(`ความขัดแย้ง: ${current.newInvigilator} ได้รับมอบหมายให้คุมสอบซ้ำซ้อนในวันและเวลาเดียวกัน`);
              
              // เพิ่มข้อมูลความขัดแย้ง
              if (!current.timeConflicts) current.timeConflicts = [];
              if (!other.timeConflicts) other.timeConflicts = [];
              
              current.timeConflicts.push({
                date: formatThaiDate(new Date(other.date)),
                timeSlot: other.timeSlot,
                subjectCode: other.subjectCode
              });
              
              other.timeConflicts.push({
                date: formatThaiDate(new Date(current.date)),
                timeSlot: current.timeSlot,
                subjectCode: current.subjectCode
              });
              
              timeSlotConflicts.push({current, other});
            }
          }
        }
      });

      // แจ้งเตือนถ้าพบความขัดแย้ง
      if (timeSlotConflicts.length > 0) {
        toast(`พบความขัดแย้งของเวลาคุมสอบ ${timeSlotConflicts.length} คู่ กรุณาตรวจสอบและแก้ไข`, {
          icon: '⚠️',
          duration: 5000,
        });
      }

      // กำหนดข้อมูลที่มีการตรวจสอบแล้วให้กับ state
      setPreviewAssignments(data.assignments);
      console.log("Set preview assignments, new length:", data.assignments.length);
      toast.dismiss();
      toast.success(`พบข้อมูลทั้งหมด ${data.assignments.length} รายการ`);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการดึงข้อมูล");
    }
  }
};

  // แก้ไขฟังก์ชัน handleChangeAssignedInvigilator 
  const handleChangeAssignedInvigilator = (index: number) => {
    setCurrentEditIndex(index);
    setSelectedInvForEdit(null); // รีเซ็ตค่าเลือกผู้คุมสอบก่อนแสดง Modal
    setShowEditInvigilatorModal(true);
  };

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setFilters(prev => ({ ...prev, searchQuery: value }));
      fetchSchedules(1); // Reset to page 1 when searching
    }, 300),
    [setFilters, fetchSchedules]
  );

  // อัพเดทฟังก์ชัน handleChangeAssignedInvigilator ให้ตรวจสอบความขัดแย้งเมื่อมีการเปลี่ยนแปลง
const handleEditConfirm = () => {
  if (!selectedInvForEdit || currentEditIndex === null) return;
  
  // ตรวจสอบความขัดแย้งด้านเวลา
  const currentAssignment = previewAssignments[currentEditIndex];
  const sameInvigilatorAssignments = previewAssignments.filter(
    (a, idx) => 
      idx !== currentEditIndex && 
      a.newInvigilatorId === selectedInvForEdit.id
  );
  
  // ตรวจสอบว่ามีความขัดแย้งด้านเวลาหรือไม่
  const timeConflicts = sameInvigilatorAssignments
    .filter(a => {
      const sameDate = new Date(a.date).toDateString() === new Date(currentAssignment.date).toDateString();
      const sameTimeSlot = a.timeSlot === currentAssignment.timeSlot;
      
      // ถ้าเป็นวันเดียวกันและช่วงเวลาเดียวกัน = มีความขัดแย้ง
      return sameDate && sameTimeSlot;
    })
    .map(a => ({
      date: formatThaiDate(new Date(a.date)),
      timeSlot: a.timeSlot,
      subjectCode: `${a.subjectCode} - ${a.subjectName}`
    }));
  
  // ถ้ามีความขัดแย้งและผู้ใช้ต้องการหลีกเลี่ยงความขัดแย้ง ให้แสดง warning
  if (timeConflicts.length > 0 && randomAssignConfig.avoidSameTimeSlot) {
    // แสดง confirm dialog
    if (!window.confirm(
      `พบความขัดแย้งด้านเวลา: อาจารย์ ${selectedInvForEdit.name} มีตารางคุมสอบซ้ำซ้อนในช่วงเวลาเดียวกัน ${timeConflicts.length} รายการ \n\nต้องการดำเนินการต่อหรือไม่?`
    )) {
      return; // ยกเลิกการแก้ไข
    }
  }
  
  // ถ้าผู้ใช้ยืนยันหรือไม่มีความขัดแย้ง ให้ดำเนินการต่อ
  const updatedAssignments = [...previewAssignments];
  updatedAssignments[currentEditIndex] = {
    ...updatedAssignments[currentEditIndex],
    newInvigilatorId: selectedInvForEdit.id,
    newInvigilator: selectedInvForEdit.displayName || selectedInvForEdit.name || '',
    invigilatorType: selectedInvForEdit.type || '',
    invigilatorDepartment: selectedInvForEdit.department?.name || "-",
    quotaUsed: selectedInvForEdit.assignedQuota || 0,
    quotaTotal: selectedInvForEdit.quota || 0,
    isTeachingFaculty: false,
    timeConflicts: timeConflicts.length > 0 ? timeConflicts : null
  };
  
  setPreviewAssignments(updatedAssignments);
  setShowEditInvigilatorModal(false);
  toast.success("อัพเดทผู้คุมสอบเรียบร้อย");
  
  // ถ้ามีความขัดแย้งให้แสดง warning
  if (timeConflicts.length > 0) {
    toast(`พบความขัดแย้งด้านเวลา ${timeConflicts.length} รายการ กรุณาตรวจสอบ`, {
      duration: 5000,
      icon: '⚠️',
      style: {
        background: '#fef3c7',
        color: '#92400e',
      },
    });
  }
};

  return (
    <div className="p-6 space-y-6">
      <Toaster />

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
          <button
            onClick={() => setShowRandomAssignModal(true)}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FiShuffle className="w-4 h-4" />
              สุ่มผู้คุมสอบอัตโนมัติ
            </span>
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
                onChange={(e) =>
                  handleFilterChange("academicYear", e.target.value)
                }
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white text-sm"
              >
                <option value="">ทุกปีการศึกษา</option>
                {Array.from(
                  { length: 5 },
                  (_, i) => new Date().getFullYear() + 543 - i
                ).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
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
                onChange={(e) =>
                  handleFilterChange("examType", e.target.value)
                }
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
                onChange={(e) =>
                  handleFilterChange("semester", e.target.value)
                }
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
                onChange={(e) =>
                  handleFilterChange("department", e.target.value)
                }
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
                onChange={(e) =>
                  handleFilterChange("date", e.target.value)
                }
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
                onChange={(e) =>
                  handleFilterChange("timeSlot", e.target.value)
                }
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
                  onChange={(e) => debouncedSearch(e.target.value)}
                  placeholder="ค้นหารหัสวิชา, ชื่อวิชา, ห้อง, ชื่อผู้สอน..."
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
              onClick={() =>
                setFilters({
                  date: "",
                  timeSlot: "",
                  department: "",
                  professor: "",
                  building: "",
                  searchQuery: "",
                  examType: "",
                  academicYear: "",
                  semester: "",
                })
              }
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
        <div className="overflow-hidden h-[calc(100vh-24rem)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-white/95">
                <tr className="border-b border-gray-100">
                  <th onClick={() => setSortConfig({
                      key: "date", 
                      direction: sortConfig.direction === "asc" ? "desc" : "asc",
                    })} 
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50"
                  >
                    วันที่
                    {sortConfig.key === "date" && (
                      <span>
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    เวลา
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    วิชา
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    กลุ่มเรียน
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    ชั้นปี
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    จำนวน นศ.
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    ผู้สอน
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    อาคาร
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    ห้อง
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    จำนวน
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    ภาควิชา
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    ตำแหน่งผู้คุมสอบ
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    ชื่อเจ้าหน้าที่
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    หมายเหตุ
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    ตรวจสอบ
                  </th> {/* เพิ่มคอลัมน์นี้ */}
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              
              {isLoading ? (
                <tbody>
                  {[...Array(8)].map((_, i) => (
                    <tr key={i} className="animate-pulse border-b border-gray-100">
                      <td colSpan={15} className="px-6 py-4">
                        <div className="h-10 bg-gray-200 rounded-md"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              ) : (
                <tbody>
                  {schedules.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-6 py-8 text-center text-gray-500">
                        ไม่พบข้อมูลที่ตรงตามเงื่อนไขการค้นหา
                      </td>
                    </tr>
                  ) : (
                    schedules.map((schedule) => (
                      <tr key={schedule.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-3 whitespace-nowrap">
                          {formatThaiDate(new Date(schedule.date))}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {`${new Date(schedule.startTime).toLocaleTimeString("th-TH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })} - ${new Date(schedule.endTime).toLocaleTimeString("th-TH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {`${schedule.subjectGroup.subject.code} - ${schedule.subjectGroup.subject.name}`}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {schedule.subjectGroup.groupNumber}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {schedule.subjectGroup.year || "-"}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {schedule.subjectGroup.studentCount || "-"} คน
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {getAllProfessors(schedule)}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {schedule.room.building}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {schedule.room.roomNumber}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {`${schedule.subjectGroup.studentCount || "0"}/${schedule.room.capacity || "0"}`}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {schedule.subjectGroup.subject.department.name}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {schedule.invigilator?.type || "-"}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {schedule.invigilator?.name || "-"}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {schedule.notes || "-"}
                        </td>
                        <td className="px-4 py-2">
                          {/* คอลัมน์ตรวจสอบ */}
                          {"timeConflicts" in schedule && schedule.timeConflicts ? (
                            <div className="flex items-center text-red-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.742-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs">ช่วงเวลาซ้ำซ้อน</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-green-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs">ไม่มีความขัดแย้ง</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setCurrentScheduleId(schedule.id);
                                setShowQuickAssignModal(true);
                              }}
                              className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                              title="เพิ่มผู้คุมสอบ"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedSchedule(schedule);
                                setEditSchedule(JSON.parse(JSON.stringify(schedule)));
                                setShowEditModal(true);
                              }}
                              className="p-1.5 bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                              title="แก้ไขตารางสอบ"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedSchedule(schedule);
                                setShowDeleteModal(true);
                              }}
                              className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"
                              title="ลบตารางสอบ"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              )}
            </table>
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            แสดงรายการที่ {(pagination.page - 1) * pagination.pageSize + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} จากทั้งหมด {pagination.totalItems} รายการ
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchSchedules(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className={`px-3 py-1 rounded-md ${
                pagination.page <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              ก่อนหน้า
            </button>
            
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = pagination.page + i - 2;
              if (pageNum > 0 && pageNum <= pagination.totalPages) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => fetchSchedules(pageNum)}
                    className={`w-8 h-8 rounded-md ${
                      pagination.page === pageNum ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              }
              return null;
            })}
            
            <button
              onClick={() => fetchSchedules(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className={`px-3 py-1 rounded-md ${
                pagination.page >= pagination.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              ถัดไป
            </button>
          </div>
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subjectGroupId: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">เลือกกลุ่มวิชา</option>
                    {subjectGroups.map((group: SubjectGroup) => (
                      <option key={group.id} value={group.id}>
                        {group.subject.code} - {group.subject.name} (กลุ่ม{" "}
                        {group.groupNumber})
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
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">เวลาเริ่ม</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData({ ...formData, startTime: e.target.value })
                      }
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
                      onChange={(e) =>
                        setFormData({ ...formData, endTime: e.target.value })
                      }
                      className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">ห้อง</label>
                    <select
                      value={formData.roomId}
                      onChange={(e) =>
                        setFormData({ ...formData, roomId: e.target.value })
                      }
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
                    <SearchableInvigilatorSelect
                      invigilators={invigilators}
                      selectedInvigilator={invigilators.find(inv => inv.id === formData.invigilatorId) || null}
                      onChange={(selectedInv) => {
                        setFormData({
                          ...formData,
                          invigilatorId: selectedInv ? selectedInv.id : '',
                        });
                      }}
                      placeholder="ค้นหาและเลือกผู้คุมสอบ..."
                    />
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
                      onChange={(e) =>
                        setEditSchedule({
                          ...editSchedule,
                          subjectGroup: {
                            ...editSchedule.subjectGroup,
                            id: e.target.value,
                          },
                        })
                      }
                      className="w-full border border-gray-300 p-2 rounded-md"
                      required
                    >
                      <option value="">เลือกกลุ่มวิชา</option>
                      {subjectGroups.map((group: SubjectGroup) => (
                        <option key={group.id} value={group.id}>
                          {group.subject.code} - {group.subject.name} (กลุ่ม{" "}
                          {group.groupNumber})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">ผู้คุมสอบ</label>
                    <SearchableInvigilatorSelect
                      invigilators={invigilators}
                      selectedInvigilator={invigilators.find(inv => inv.id === editSchedule.invigilator?.id) || null}
                      onChange={(selectedInv) => {
                        setEditSchedule({
                          ...editSchedule,
                          invigilator: selectedInv ? {
                            id: selectedInv.id,
                            name: selectedInv.displayName || selectedInv.name || '',
                            type: selectedInv.type,
                          } : undefined,
                        });
                      }}
                      placeholder="ค้นหาและเลือกผู้คุมสอบ..."
                    />
                    {editSchedule.invigilator && (
                      <p className="mt-1 text-xs text-gray-500">
                        ผู้คุมสอบที่เลือก: <span className="font-medium">{editSchedule.invigilator.name}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Add section for professors */}
                <div>
                  <label className="block text-gray-700 mb-2">
                    อาจารย์ผู้สอน
                  </label>
                  <div className="border border-gray-300 rounded-md p-3 bg-gray-50">
                    <div className="mb-2">
                      <p className="text-sm text-gray-500 mb-2">
                        อาจารย์ผู้สอนปัจจุบัน:
                      </p>
                      <div className="bg-white p-2 rounded border border-gray-200 text-sm">
                        {getAllProfessors(editSchedule) || "-"}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      หมายเหตุ:
                      การแก้ไขอาจารย์ผู้สอนสามารถทำได้ที่หน้าจัดการกลุ่มวิชา
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700">วันที่</label>
                    <input
                      type="date"
                      value={
                        new Date(editSchedule.date).toISOString().split("T")[0]
                      }
                      onChange={(e) =>
                        setEditSchedule({
                          ...editSchedule,
                          date: new Date(e.target.value),
                        })
                      }
                      className="w-full border border-gray-300 p-2 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">เวลาเริ่ม</label>
                    <input
                      type="time"
                      value={new Date(
                        editSchedule.startTime
                      ).toLocaleTimeString("en-US", { hour12: false })}
                      onChange={(e) =>
                        setEditSchedule({
                          ...editSchedule,
                          startTime: new Date(
                            `${editSchedule.date.toDateString()} ${
                              e.target.value
                            }`
                          ),
                        })
                      }
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
                      value={new Date(editSchedule.endTime).toLocaleTimeString(
                        "en-US",
                        { hour12: false }
                      )}
                      onChange={(e) =>
                        setEditSchedule({
                          ...editSchedule,
                          endTime: new Date(
                            `${editSchedule.date.toDateString()} ${
                              e.target.value
                            }`
                          ),
                        })
                      }
                      className="w-full border border-gray-300 p-2 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">หมายเหตุ</label>
                    <input
                      type="text"
                      value={editSchedule.notes || ""}
                      onChange={(e) =>
                        setEditSchedule({
                          ...editSchedule,
                          notes: e.target.value,
                        })
                      }
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
                      onChange={(e) =>
                        setEditSchedule({
                          ...editSchedule,
                          room: {
                            ...editSchedule.room,
                            building: e.target.value,
                          },
                        })
                      }
                      className="w-full border border-gray-300 p-2 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">หมายเลขห้อง</label>
                    <input
                      type="text"
                      value={editSchedule.room.roomNumber}
                      onChange={(e) =>
                        setEditSchedule({
                          ...editSchedule,
                          room: {
                            ...editSchedule.room,
                            roomNumber: e.target.value,
                          },
                        })
                      }
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
                คุณต้องการลบตารางสอบวิชา{" "}
                <strong>{selectedSchedule.subjectGroup.subject.name}</strong>{" "}
                วันที่{" "}
                <strong>
                  {new Date(selectedSchedule.date).toLocaleDateString("th-TH")}
                </strong>{" "}
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
          confirmIcon={
            showPreview ? (
              <FiDownload className="w-4 h-4" />
            ) : (
              <FiEye className="w-4 h-4" />
            )
          }
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
                      <h4 className="font-medium mb-1">
                        เลือกข้อมูลที่ต้องการส่งออก
                      </h4>
                      <p>
                        กรุณาระบุเงื่อนไขในการส่งออกข้อมูล
                        โดยสามารถเลือกตามประเภทการสอบ ปีการศึกษา ภาคการศึกษา
                        และภาควิชาได้
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg mt-4">
                  <h4 className="font-medium text-yellow-700">หลักการจัดสรรโควต้า</h4>
                  <p className="text-sm text-yellow-600 mt-1">
                    ระบบจะจัดสรรตารางคุมสอบโดยแบ่งจำนวนตารางสอบทั้งหมดให้แก่อาจารย์อย่างเท่าเทียมกัน 
                    หากมีเศษของการจัดสรรคงเหลือ ระบบจะจัดสรรให้แก่บุคลากรทั่วไป
                    โดยจำนวนตารางสอบต่ออาจารย์ = จำนวนตารางสอบทั้งหมด ÷ จำนวนอาจารย์ทั้งหมด (ปัดลง)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ประเภทการสอบ
                    </label>
                    <select
                      value={exportFilters.examType}
                      onChange={(e) =>
                        setExportFilters({
                          ...exportFilters,
                          examType: e.target.value,
                        })
                      }
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
                      onChange={(e) =>
                        setExportFilters({
                          ...exportFilters,
                          academicYear: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white"
                    >
                      <option value="">ทุกปีการศึกษา</option>
                      {Array.from(
                        { length: 5 },
                        (_, i) => new Date().getFullYear() + 543 - i
                      ).map((year) => (
                        <option key={year} value={year - 543}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ภาคการศึกษา
                    </label>
                    <select
                      value={exportFilters.semester}
                      onChange={(e) =>
                        setExportFilters({
                          ...exportFilters,
                          semester: e.target.value,
                        })
                      }
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
                      onChange={(e) =>
                        setExportFilters({
                          ...exportFilters,
                          department: e.target.value,
                        })
                      }
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
                      onChange={(e) =>
                        setExportFilters({
                          ...exportFilters,
                          startDate: e.target.value,
                        })
                      }
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
                      onChange={(e) =>
                        setExportFilters({
                          ...exportFilters,
                          endDate: e.target.value,
                        })
                      }
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
                      <h4 className="font-medium mb-1">
                        ตัวอย่างข้อมูลที่จะส่งออก ({previewData.length} รายการ)
                      </h4>
                      <p>
                        ข้อมูลด้านล่างเป็นตัวอย่างข้อมูลที่จะถูกส่งออกเป็นไฟล์
                        Excel คุณสามารถดาวน์โหลดไฟล์ Excel ได้โดยคลิกปุ่ม
                        &quot;ดาวน์โหลด Excel&quot;
                      </p>
                    </div>
                  </div>
                </div>

                <div className="max-h-96 overflow-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          วันที่
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          เวลา
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          วิชา
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          กลุ่มเรียน
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ชั้นปี
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          จำนวน นศ.
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ผู้สอน
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          อาคาร
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ห้อง
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ความจุห้อง
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ภาควิชา
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ตำแหน่งผู้คุมสอบ
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ชื่อเจ้าหน้าที่
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          หมายเหตุ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.length > 0 ? (
                        previewData.map((schedule) => {
                          // ค้นหาชื่อผู้คุมสอบจาก displayName ถ้ามี
                          let invigilatorName =
                            schedule.invigilator?.name || "-";
                          let firstName = "-";
                          let lastName = "-";
                          let prefix = "-";

                          if (schedule.invigilator) {
                            const matchedInvigilator = invigilators.find(
                              (inv) => inv.id === schedule.invigilator?.id
                            );
                            if (matchedInvigilator?.displayName) {
                              invigilatorName = matchedInvigilator.displayName;

                              // แยกคำนำหน้า ชื่อ นามสกุล
                              const nameParts = invigilatorName.split(" ");
                              if (nameParts.length >= 2) {
                                // ตรวจสอบคำนำหน้า
                                const possiblePrefixes = [
                                  "นาย",
                                  "นาง",
                                  "นางสาว",
                                  "ดร.",
                                  "ผศ.",
                                  "รศ.",
                                  "ศ.",
                                  "ผศ.ดร.",
                                  "รศ.ดร.",
                                  "ศ.ดร.",
                                ];
                                if (
                                  possiblePrefixes.some((p) =>
                                    nameParts[0].includes(p)
                                  )
                                ) {
                                  prefix = nameParts[0];
                                  firstName = nameParts[1] || "-";
                                  lastName =
                                    nameParts.slice(2).join(" ") || "-";
                                } else {
                                  prefix = "-";
                                  firstName = nameParts[0] || "-";
                                  lastName =
                                    nameParts.slice(1).join(" ") || "-";
                                }
                              } else {
                                firstName = invigilatorName;
                              }
                            }
                          }

                          // ใช้ฟังก์ชัน getAllProfessors สำหรับแสดงรายชื่ออาจารย์ผู้สอน
                          const allProfessors = getAllProfessors(schedule);

                          // ข้อมูลอื่นๆ
                          const capacity = `${
                            schedule.subjectGroup.studentCount || "0"
                          }/${schedule.room.capacity || "0"}`;
                          const isSystemGenerated =
                            schedule.notes?.includes("เพิ่มแถวโดยระบบ");
                          const notes = isSystemGenerated
                            ? "เพิ่มแถว"
                            : schedule.notes || "-";
                          const subject = `${schedule.subjectGroup.subject.code} ${schedule.subjectGroup.subject.name}`;

                          return (
                            <tr
                              key={schedule.id}
                              className={
                                isSystemGenerated ? "bg-yellow-50" : ""
                              }
                            >
                              <td className="px-4 py-2 whitespace-nowrap">
                                {formatThaiDate(new Date(schedule.date))}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {`${new Date(
                                  schedule.startTime
                                ).toLocaleTimeString("th-TH", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })} - ${new Date(
                                  schedule.endTime
                                ).toLocaleTimeString("th-TH", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap"></td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {subject}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {schedule.subjectGroup.groupNumber}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {schedule.subjectGroup.year || "-"}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {schedule.subjectGroup.studentCount || "-"}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {allProfessors}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {schedule.room.building}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {schedule.room.roomNumber}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {capacity}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {prefix}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {firstName}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {lastName}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {notes}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={15}
                            className="px-4 py-8 text-center text-gray-500"
                          >
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
                  <div>
                    จำนวนรายการทั้งหมด: <strong>{previewData.length}</strong>{" "}
                    รายการ
                  </div>
                </div>
              </>
            )}
          </div>
        </PopupModal>

        
      )}

    {showRandomAssignModal && (
      <PopupModal
        title="สุ่มผู้คุมสอบอัตโนมัติ"
        onClose={() => {
          setShowRandomAssignModal(false);
          // เพิ่มการล้างค่า previewAssignments เมื่อปิด modal
          setPreviewAssignments([]);
        }}
        onConfirm={handleRandomAssign}
        confirmText={previewAssignments.length ? "ยืนยันการมอบหมาย" : "แสดงตัวอย่างผลการจัดตาราง"}
        maxWidth="5xl"
      >
        {!previewAssignments.length ? (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-700">เงื่อนไขการสุ่มผู้คุมสอบ</h3>
              <p className="text-sm text-blue-600 mt-1">
                ระบบจะสุ่มผู้คุมสอบโดยอิงตามเงื่อนไขที่ท่านกำหนด โดยจะพิจารณาโควต้า ข้อจำกัดด้านเวลา และความเหมาะสม
              </p>
            </div>
            
            {/* ตัวเลือกสำหรับกำหนดเงื่อนไข */}
            <div className="grid grid-cols-2 gap-4">
              {/* เงื่อนไขการกรอง */}
              <div>
                <label className="block text-sm font-medium mb-1">ประเภทการสอบ</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={randomAssignConfig.examType}
                  onChange={e => setRandomAssignConfig({...randomAssignConfig, examType: e.target.value})}
                >
                  <option value="">ทั้งหมด</option>
                  <option value="MIDTERM">กลางภาค</option>
                  <option value="FINAL">ปลายภาค</option>
                </select>
              </div>
              
              {/* ปีการศึกษาและภาค */}
              <div>
                <label className="block text-sm font-medium mb-1">ภาควิชา</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={randomAssignConfig.department}
                  onChange={e => setRandomAssignConfig({...randomAssignConfig, department: e.target.value})}
                >
                  <option value="">ทุกภาควิชา</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* ตัวเลือกเพิ่มเติม */}
<div className="mt-4">
  <h3 className="font-medium mb-2">ตัวเลือกเพิ่มเติม</h3>
  <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
    {/* ตัวเลือกเดิม */}
    <div className="flex items-center">
      <input 
        type="checkbox" 
        id="prioritizeQuota" 
        checked={randomAssignConfig.prioritizeQuota}
        onChange={e => setRandomAssignConfig({...randomAssignConfig, prioritizeQuota: e.target.checked})}
        className="mr-2"
      />
      <label htmlFor="prioritizeQuota" className="text-sm">จัดลำดับความสำคัญตามโควต้า (อาจารย์ที่มีโควต้าน้อยจะถูกมอบหมายก่อน)</label>
    </div>
    
    <div className="flex items-center">
      <input 
        type="checkbox" 
        id="excludeAlreadyAssigned" 
        checked={randomAssignConfig.excludeAlreadyAssigned}
        onChange={e => setRandomAssignConfig({...randomAssignConfig, excludeAlreadyAssigned: e.target.checked})}
        className="mr-2"
      />
      <label htmlFor="excludeAlreadyAssigned" className="text-sm">ข้ามตารางสอบที่มีผู้คุมสอบแล้ว</label>
    </div>
    
    {/* ตัวเลือกใหม่เกี่ยวกับช่วงเวลา */}
    <div className="pt-2 border-t border-gray-200">
      <h4 className="font-medium text-sm mb-2 text-blue-700">ข้อจำกัดด้านเวลา</h4>
      
      <div className="flex items-center mb-2">
        <input 
          type="checkbox" 
          id="avoidSameTimeSlot" 
          checked={randomAssignConfig.avoidSameTimeSlot}
          onChange={e => setRandomAssignConfig({...randomAssignConfig, avoidSameTimeSlot: e.target.checked})}
          className="mr-2"
        />
        <label htmlFor="avoidSameTimeSlot" className="text-sm font-medium">
          ป้องกันการมอบหมายซ้ำในช่วงเวลาเดียวกัน
          <span className="block text-xs text-gray-500 font-normal mt-0.5">
            เช่น อาจารย์ท่านหนึ่งจะไม่ได้รับมอบหมายให้คุมสอบช่วงเช้าซ้ำกันหลายวิชา
          </span>
        </label>
      </div>
      
      <div className="flex items-center">
        <input 
          type="checkbox" 
          id="allowSameDayDifferentSlot" 
          checked={randomAssignConfig.allowSameDayDifferentSlot}
          onChange={e => setRandomAssignConfig({...randomAssignConfig, allowSameDayDifferentSlot: e.target.checked})}
          className="mr-2"
        />
        <label htmlFor="allowSameDayDifferentSlot" className="text-sm font-medium">
          อนุญาตให้คุมสอบหลายช่วงเวลาในวันเดียวกัน
          <span className="block text-xs text-gray-500 font-normal mt-0.5">
            เช่น อาจารย์สามารถได้รับมอบหมายให้คุมสอบทั้งช่วงเช้าและช่วงบ่ายในวันเดียวกัน
          </span>
        </label>
      </div>
    </div>
  </div>
</div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="excludeAlreadyAssigned" 
                    checked={randomAssignConfig.excludeAlreadyAssigned}
                    onChange={e => setRandomAssignConfig({...randomAssignConfig, excludeAlreadyAssigned: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="excludeAlreadyAssigned" className="text-sm">ข้ามตารางสอบที่มีผู้คุมสอบแล้ว</label>
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="respectTimeConstraints" 
                    checked={randomAssignConfig.respectTimeConstraints}
                    onChange={e => setRandomAssignConfig({...randomAssignConfig, respectTimeConstraints: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="respectTimeConstraints" className="text-sm">คำนึงถึงข้อจำกัดด้านเวลา (หลีกเลี่ยงการมอบหมายในวันเดียวกัน)</label>
                </div>
              </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 p-4 rounded-lg text-green-700 text-sm mb-4">
              <h3 className="font-medium">ตัวอย่างผลการจัดตาราง ({previewAssignments.length} รายการ)</h3>
              <p className="text-sm mt-1">
                ตรวจสอบผลการจัดตารางคุมสอบด้านล่าง คุณสามารถปรับแก้ได้ก่อนบันทึกผล
              </p>
              
              {/* Add statistics section */}
              <div className="mt-3 grid grid-cols-4 gap-2">
                <div className="bg-white rounded-md p-2 border border-green-100">
                  <p className="text-xs text-gray-500">จำนวนตารางสอบทั้งหมด</p>
                  <p className="text-lg font-bold">{previewAssignments.length} รายการ</p>
                </div>
                <div className="bg-white rounded-md p-2 border border-blue-100">
                  <p className="text-xs text-gray-500">จัดสรรให้อาจารย์</p>
                  <p className="text-lg font-bold text-blue-600">
                    {previewAssignments.filter(a => a.invigilatorType === 'อาจารย์').length} รายการ
                  </p>
                </div>
                <div className="bg-white rounded-md p-2 border border-purple-100">
                  <p className="text-xs text-gray-500">จัดสรรให้บุคลากร</p>
                  <p className="text-lg font-bold text-purple-600">
                    {previewAssignments.filter(a => a.invigilatorType === 'บุคลากรทั่วไป').length} รายการ
                  </p>
                </div>
                <div className="bg-white rounded-md p-2 border border-yellow-100">
                  <p className="text-xs text-gray-500">เกณฑ์การจัดสรร</p>
                  <p className="text-xs font-medium text-yellow-700">
                    อาจารย์: {Math.floor(previewAssignments.length / invigilators.filter(i => i.type === 'อาจารย์').length || 1)} วิชา/คน
                    <br/>
                    เศษที่เหลือ: {previewAssignments.length % invigilators.filter(i => i.type === 'อาจารย์').length || 0} วิชา → บุคลากร
                  </p>
                </div>
              </div>
            </div>
            
            <div className="max-h-96 overflow-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">วันที่</th>
                      <th className="px-4 py-2 text-left">เวลา</th>
                      <th className="px-4 py-2 text-left">วิชา</th>
                      <th className="px-4 py-2 text-left">ภาควิชา</th>
                      <th className="px-4 py-2 text-left">ผู้คุมสอบ (เดิม)</th>
                      <th className="px-4 py-2 text-left">ผู้คุมสอบ (ใหม่)</th>
                      <th className="px-4 py-2 text-left">โควต้า</th>
                      <th className="px-4 py-2 text-left">ตรวจสอบ</th> {/* เพิ่มคอลัมน์นี้ */}
                      <th className="px-4 py-2 text-left">แก้ไข</th>
                    </tr>
                  </thead>
                    <tbody>
                  {previewAssignments.map((assignment, index) => (
                    <tr 
                      key={index} 
                      className={`hover:bg-gray-50 ${assignment.isTeachingFaculty ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-2">{formatThaiDate(new Date(assignment.date))}</td>
                      <td className="px-4 py-2">{assignment.timeSlot}</td>
                      <td className="px-4 py-2">{`${assignment.subjectCode} - ${assignment.subjectName}`}</td>
                      <td className="px-4 py-2">{assignment.department}</td>
                      <td className="px-4 py-2">{assignment.currentInvigilator || "-"}</td>
                      <td className="px-4 py-2">
                        <div className="relative group">
                          <span 
                            className={`cursor-help border-b border-dashed ${
                              assignment.isTeachingFaculty ? 'border-blue-500 font-medium text-blue-700' : 'border-gray-500'
                            }`}
                          >
                            {assignment.newInvigilator}
                            {assignment.isTeachingFaculty && (
                              <span className="ml-1 text-xs text-blue-600 bg-blue-100 px-1 py-0.5 rounded">ผู้สอน</span>
                            )}
                          </span>

                          {/* ปรับแต่ง tooltip ให้มีความโปร่งใสและเอฟเฟกต์ blur */}
                          <div className="hidden group-hover:block absolute z-10 bg-white/80 backdrop-blur-lg p-4 rounded-xl shadow-lg border border-gray-200/50 w-72 text-sm transition-all duration:300 transform -translate-y-1">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-full ${assignment.isTeachingFaculty ? 'bg-blue-100 text-blue-500' : 'bg-gray-100 text-gray-500'}`}>
                                {assignment.isTeachingFaculty ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-gray-800">{assignment.newInvigilator}</p>
                                <div className="mt-1 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600 text-xs">ตำแหน่ง:</span>
                                    <span className="font-medium text-gray-800">{assignment.invigilatorType}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600 text-xs">ภาควิชา:</span>
                                    <span className="font-medium text-gray-800">{assignment.invigilatorDepartment}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600 text-xs">โควต้า:</span>
                                    <div className="flex items-center">
                                      {/* แสดงโควต้าที่จะเป็นหลังจากมอบหมาย (บวก 1) */}
                                      <span className="font-medium text-gray-800">{assignment.quotaUsed + 1}/{assignment.quotaTotal}</span>
                                      <div className="ml-2 w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full ${
                                            (assignment.quotaUsed + 1) / assignment.quotaTotal > 0.8 
                                              ? 'bg-red-500' 
                                              : (assignment.quotaUsed + 1) / assignment.quotaTotal > 0.5 
                                                ? 'bg-yellow-500' 
                                                : 'bg-green-500'
                                          }`} 
                                          style={{ width: `${((assignment.quotaUsed + 1) / assignment.quotaTotal) * 100}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {assignment.isTeachingFaculty && (
                                  <div className="mt-3 bg-blue-50/70 p-2 rounded-lg border border-blue-200/70 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    <p className="text-sm font-medium text-blue-700">อาจารย์ผู้สอนวิชานี้</p>
                                  </div>
                                )}

                                {assignment.otherAssignments && (
                                  <div className="mt-2 text-xs text-gray-500">
                                    <p className="font-medium">ตารางสอนอื่น:</p>
                                    <p className="mt-0.5">{assignment.otherAssignments}</p>
                                  </div>
                                )}
                                {/* เพิ่มข้อมูลเกี่ยวกับตารางสอบที่ได้รับมอบหมายในส่วน tooltip */}
                                {assignment.timeConflicts && (
                                  <div className="mt-2 text-xs text-red-500 bg-red-50 p-2 rounded border border-red-200">
                                    <p className="font-medium">ความขัดแย้งด้านเวลา:</p>
                                    <ul className="list-disc pl-4 mt-1">
                                      {assignment.timeConflicts.map((conflict, idx) => (
                                        <li key={idx}>
                                          {conflict.date} - {conflict.timeSlot}: {conflict.subjectCode}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {assignment.otherAssignments && (
                                  <div className="mt-2 text-xs text-gray-500">
                                    <p className="font-medium">ตารางสอนอื่น:</p>
                                    <p className="mt-0.5">{assignment.otherAssignments}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {/* แสดงโควต้าในตารางให้บวก 1 ไปด้วย */}
                        <div className="flex items-center">
                          <span className="font-medium">{assignment.quotaUsed + 1}/{assignment.quotaTotal}</span>
                          <div className="ml-2 w-10 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                (assignment.quotaUsed + 1) / assignment.quotaTotal > 0.8 
                                  ? 'bg-red-500' 
                                  : (assignment.quotaUsed + 1) / assignment.quotaTotal > 0.5 
                                    ? 'bg-yellow-500' 
                                    : 'bg-green-500'
                              }`} 
                              style={{ width: `${((assignment.quotaUsed + 1) / assignment.quotaTotal) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <button 
                          onClick={() => handleChangeAssignedInvigilator(index)}
                          className="flex items-center gap-1 px-2 py-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          title="เปลี่ยนผู้คุมสอบ"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" /> 
                          <span className="text-xs">เปลี่ยน</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <button 
                onClick={() => setPreviewAssignments([])}
                className="flex items-center gap-2 text-blue-600"
              >
                <FiArrowLeft className="w-4 h-4" /> ปรับแต่งเงื่อนไขใหม่
              </button>
              <span className="text-gray-600">จำนวนรายการทั้งหมด: <strong>{previewAssignments.length}</strong> รายการ</span>
            </div>
          </div>
        )}
      </PopupModal>
    )}
    {/* Modal สำหรับเปลี่ยนผู้คุมสอบในการมอบหมายแบบสุ่ม */}
{showEditInvigilatorModal && currentEditIndex !== null && (
  <PopupModal
    title="แก้ไขผู้คุมสอบ"
    onClose={() => {
      setShowEditInvigilatorModal(false);
      setSelectedInvForEdit(null);
    }}
    onConfirm={handleEditConfirm}
    confirmText="บันทึกการเปลี่ยนแปลง"
    confirmDisabled={!selectedInvForEdit}
  >
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-md">
        <p className="font-medium text-gray-700">กำลังแก้ไขผู้คุมสอบสำหรับ:</p>
        <p className="mt-1 text-base">
          {`${previewAssignments[currentEditIndex].subjectCode} - ${previewAssignments[currentEditIndex].subjectName}`}
        </p>
        <p className="text-sm text-gray-500">
          {formatThaiDate(new Date(previewAssignments[currentEditIndex].date))}, 
          {previewAssignments[currentEditIndex].timeSlot}
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          เลือกผู้คุมสอบใหม่
        </label>
        <SearchableInvigilatorSelect
          invigilators={invigilators}
          selectedInvigilator={selectedInvForEdit}
          onChange={(inv) => { setSelectedInvForEdit(inv as ExtendedInvigilator | null); }}
          placeholder="ค้นหาและเลือกผู้คุมสอบ..."
        />
      </div>
    </div>
  </PopupModal>
)}

  {/* Modal สำหรับเพิ่มผู้คุมสอบในตารางสอบที่มีอยู่ */}
  {showQuickAssignModal && currentScheduleId && (
    <PopupModal
      title="เพิ่มผู้คุมสอบ"
      onClose={() => {
        setShowQuickAssignModal(false);
        setSelectedInvForQuickAssign(null);
      }}
      onConfirm={async () => {
        if (!selectedInvForQuickAssign || !currentScheduleId) return;
        const currentSchedule = schedules.find(s => s.id === currentScheduleId);
        if (!currentSchedule) return;
        
        try {
          const response = await fetch(`/api/schedules/${currentScheduleId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subjectGroupId: currentSchedule.subjectGroup.id,
              date: currentSchedule.date,
              startTime: currentSchedule.startTime,
              endTime: currentSchedule.endTime,
              roomId: currentSchedule.room.id,
              invigilatorId: selectedInvForQuickAssign.id,
              updateQuota: true,
            }),
          });
          
          if (response.ok) {
            setShowQuickAssignModal(false);
            toast.success("เพิ่มผู้คุมสอบสำเร็จ");
            await Promise.all([fetchSchedules(), fetchInvigilators()]);
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || "ไม่สามารถเพิ่มผู้คุมสอบได้");
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
        }
      }}
      confirmText="บันทึก"
      confirmDisabled={!selectedInvForQuickAssign}
    >
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="font-medium text-gray-800">รายละเอียดตารางสอบ</h4>
          {(() => {
            const schedule = schedules.find(s => s.id === currentScheduleId);
            if (!schedule) return <p>ไม่พบข้อมูล</p>;
            
            return (
              <>
                <p className="mt-1">{`${schedule.subjectGroup.subject.code} - ${schedule.subjectGroup.subject.name}`}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatThaiDate(new Date(schedule.date))}, {schedule.scheduleDateOption}
                </p>
              </>
            );
          })()}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            เลือกผู้คุมสอบ
          </label>
          <SearchableInvigilatorSelect
            invigilators={invigilators}
            selectedInvigilator={selectedInvForQuickAssign}
            onChange={(inv) => { setSelectedInvForQuickAssign(inv as ExtendedInvigilator | null); }}
            placeholder="ค้นหาและเลือกผู้คุมสอบ..."
          />
        </div>
      </div>
    </PopupModal>
  )}
    </div>
  );
}