"use client";

import { useEffect, useState } from "react";
import { FiEdit2, FiTrash2, FiDownload, FiFilter, FiEye, FiShuffle, FiArrowLeft } from "react-icons/fi";
import toast, { Toaster } from "react-hot-toast";
import PopupModal from "@/app/components/ui/popup-modal";
import { Invigilator } from "@prisma/client";
import Highlight from "@/app/components/ui/highlight";
import { ImSpinner8 } from "react-icons/im";
import { FiDatabase } from "react-icons/fi";
import { utils as XLSXUtils, write } from "xlsx";
import  SearchableInvigilatorSelect from "@/app/components/ui/search-dropdown";

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

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/schedules");
      const data = await response.json();

      // เรียงลำดับข้อมูลก่อนเก็บใน state
      const sortedData = data.sort((a: Schedule, b: Schedule) => {
        const yearCompare = b.academicYear - a.academicYear;
        if (yearCompare !== 0) return yearCompare;

        const semesterCompare = b.semester - a.semester;
        if (semesterCompare !== 0) return semesterCompare;

        const dateCompare =
          new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;

        const timeSlotOrder = { ช่วงเช้า: 1, ช่วงบ่าย: 2 };
        return (
          timeSlotOrder[a.scheduleDateOption] -
          timeSlotOrder[b.scheduleDateOption]
        );
      });

      setSchedules(sortedData);
    } catch (error) {
      console.error("Failed to fetch exam schedules:", error);
      toast.error("ไม่สามารถโหลดข้อมูลตารางสอบได้");
    } finally {
      setIsLoading(false);
    }
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
        const invigilatorType = schedule.invigilator?.type || "-";
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
    respectTimeConstraints: true
  });
  const [previewAssignments, setPreviewAssignments] = useState<any[]>([]);

  // ฟังก์ชันสำหรับสุ่มและจัดสรรผู้คุมสอบ
const handleRandomAssign = async () => {
  if (previewAssignments.length > 0) {
    // ถ้ามีการ preview แล้ว ให้บันทึกการมอบหมาย
    try {
      // เริ่มแสดง loading
      toast.loading("กำลังบันทึกข้อมูล...");
      
      // ส่งข้อมูลไปบันทึกที่ API
      const response = await fetch("/api/schedules/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: previewAssignments }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "ไม่สามารถบันทึกข้อมูลได้");
      }
      
      // แสดง toast success และรีเฟรชข้อมูล
      toast.dismiss();
      toast.success(`บันทึกข้อมูลสำเร็จ ${previewAssignments.length} รายการ`);
      setShowRandomAssignModal(false);
      setPreviewAssignments([]);
      
      // รีเฟรชข้อมูลตาราง
      await Promise.all([fetchSchedules(), fetchInvigilators()]);
    } catch (error) {
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  } else {
    // ถ้ายังไม่มี preview ให้ดึงข้อมูลเพื่อแสดงตัวอย่าง
    try {
      toast.loading("กำลังประมวลผล...");
      
      // ส่งเงื่อนไขการกรองไปยัง API
      const response = await fetch("/api/schedules/random-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(randomAssignConfig),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "ไม่สามารถดึงข้อมูลได้");
      }
      
      const data = await response.json();
      
      // ตั้งค่าข้อมูลสำหรับ preview
      setPreviewAssignments(data.assignments);
      toast.dismiss();
    } catch (error) {
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการดึงข้อมูล");
    }
  }
};

// ฟังก์ชันสำหรับเปลี่ยนผู้คุมสอบที่ถูกมอบหมาย
const handleChangeAssignedInvigilator = (index: number) => {
  const assignment = previewAssignments[index];
  let selectedInvigilator: ExtendedInvigilator | null = null;
  
  // สร้าง content สำหรับ PopupModal โดยใช้ SearchableInvigilatorSelect แทน select ธรรมดา
  const content = (
    <div className="space-y-4">
      <div className="bg-gray-50 p-3 rounded-md">
        <p className="font-medium text-gray-700">กำลังแก้ไขผู้คุมสอบสำหรับ:</p>
        <p className="mt-1">{`${assignment.subjectCode} - ${assignment.subjectName}`}</p>
        <p className="text-sm text-gray-500">{formatThaiDate(new Date(assignment.date))}, {assignment.timeSlot}</p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          เลือกผู้คุมสอบใหม่
        </label>
        <SearchableInvigilatorSelect
          invigilators={invigilators}
          selectedInvigilator={null}
          onChange={(inv) => { 
            // Cast the Invigilator to ExtendedInvigilator
            selectedInvigilator = inv as ExtendedInvigilator | null; 
          }}
          placeholder="ค้นหาและเลือกผู้คุมสอบ..."
        />
      </div>
    </div>
  );
  
  // สร้าง Modal และแสดงผล
  toast((t) => (
    <div className="p-3">
      {content}
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md"
        >
          ยกเลิก
        </button>
        <button 
          onClick={() => {
            if (selectedInvigilator) {
              const updatedAssignments = [...previewAssignments];
              updatedAssignments[index] = {
                ...updatedAssignments[index],
                newInvigilatorId: selectedInvigilator.id,
                newInvigilator: selectedInvigilator.displayName || selectedInvigilator.name,
                invigilatorType: selectedInvigilator.type,
                invigilatorDepartment: selectedInvigilator.department?.name || "-",
                quotaUsed: selectedInvigilator.assignedQuota,
                quotaTotal: selectedInvigilator.quota,
                isTeachingFaculty: false // อาจต้องตรวจสอบเพิ่มเติม
              };
              
              setPreviewAssignments(updatedAssignments);
              toast.dismiss(t.id);
              toast.success("อัพเดทผู้คุมสอบเรียบร้อย");
            } else {
              toast.error("กรุณาเลือกผู้คุมสอบ");
            }
          }}
          disabled={!selectedInvigilator}
          className={`px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md ${
            selectedInvigilator ? 'hover:bg-blue-600' : 'opacity-50 cursor-not-allowed'
          }`}
        >
          บันทึก
        </button>
      </div>
    </div>
  ), { duration: Infinity });
};

// เพิ่มฟังก์ชันสำหรับมอบหมายผู้คุมสอบโดยตรงจากตาราง
const handleQuickAssignInvigilator = (scheduleId: string) => {
  // หา schedule ที่ต้องการแก้ไข
  const schedule = schedules.find(s => s.id === scheduleId);
  if (!schedule) return;

  let selectedInvigilator: ExtendedInvigilator | null = null;
  
  toast((t) => (
    <div className="p-3 max-w-md">
      <div className="space-y-4">
        <div className="bg-gray-50 p-3 rounded-md">
          <h4 className="font-medium text-gray-800">เพิ่มผู้คุมสอบ</h4>
          <p className="mt-1 text-sm">{`${schedule.subjectGroup.subject.code} - ${schedule.subjectGroup.subject.name}`}</p>
          <p className="text-xs text-gray-500">{formatThaiDate(new Date(schedule.date))}, {schedule.scheduleDateOption}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            เลือกผู้คุมสอบ
          </label>
          <SearchableInvigilatorSelect
            invigilators={invigilators}
            selectedInvigilator={null}
            onChange={(inv) => { selectedInvigilator = inv; }}
            placeholder="ค้นหาและเลือกผู้คุมสอบ..."
          />
        </div>
      </div>
      
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md"
        >
          ยกเลิก
        </button>
        <button 
          onClick={async () => {
            if (!selectedInvigilator) {
              toast.error("กรุณาเลือกผู้คุมสอบ");
              return;
            }
            
            try {
              const response = await fetch(`/api/schedules/${schedule.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  subjectGroupId: schedule.subjectGroup.id,
                  date: schedule.date,
                  startTime: schedule.startTime,
                  endTime: schedule.endTime,
                  roomId: schedule.room.id,
                  invigilatorId: selectedInvigilator.id,
                  updateQuota: true,
                }),
              });
              
              if (response.ok) {
                toast.dismiss(t.id);
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
          disabled={!selectedInvigilator}
          className={`px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md ${
            selectedInvigilator ? 'hover:bg-blue-600' : 'opacity-50 cursor-not-allowed'
          }`}
        >
          บันทึก
        </button>
      </div>
    </div>
  ), { duration: Infinity });
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
                  setFilters({ ...filters, academicYear: e.target.value })
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
                  setFilters({ ...filters, examType: e.target.value })
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
                  setFilters({ ...filters, semester: e.target.value })
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
                  setFilters({ ...filters, department: e.target.value })
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
                  setFilters({ ...filters, date: e.target.value })
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
                  setFilters({ ...filters, timeSlot: e.target.value })
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
                  value={filters.searchQuery}
                  onChange={(e) =>
                    setFilters({ ...filters, searchQuery: e.target.value })
                  }
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
                      onClick={() =>
                        setSortConfig({
                          key: "date",
                          direction:
                            sortConfig.direction === "asc" ? "desc" : "asc",
                        })
                      }
                      className="px-6 py-4 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50"
                    >
                      วันที่{" "}
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
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                      Actions
                    </th>
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
                        {new Date(schedule.startTime).toLocaleTimeString(
                          "th-TH",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}{" "}
                        -{" "}
                        {new Date(schedule.endTime).toLocaleTimeString(
                          "th-TH",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Highlight
                          text={`${schedule.subjectGroup.subject.code} - ${schedule.subjectGroup.subject.name}`}
                          search={filters.searchQuery}
                        />
                      </td>
                      <td className="px-6 py-4">
                        {schedule.subjectGroup.groupNumber}
                      </td>
                      <td className="px-6 py-4">
                        {schedule.subjectGroup.year || "-"}
                      </td>
                      <td className="px-6 py-4">
                        {schedule.subjectGroup.studentCount || "-"}
                      </td>
                      <td className="px-6 py-4">
                        {getAllProfessors(schedule)}
                      </td>
                      <td className="px-6 py-4">{schedule.room.building}</td>
                      <td className="px-6 py-4">{schedule.room.roomNumber}</td>
                      <td className="px-6 py-4">
                        {`${schedule.subjectGroup.studentCount || "0"}/${
                          schedule.room.capacity || "0"
                        }`}
                      </td>
                      <td className="px-6 py-4">
                        {schedule.subjectGroup.subject.department.name || "-"}
                      </td>
                      {/* Update invigilator columns with null checks */}
                      <td className="px-6 py-4">
                        {schedule.invigilator?.type || "-"}
                      </td>
                      <td className="px-6 py-4">
                        {/* Show professor name if available, otherwise show invigilator name */}
                        {(() => {
                          // If schedule has invigilator
                          if (schedule.invigilator) {
                            // Find matching invigilator in state
                            const matchedInvigilator = invigilators.find(
                              (inv) => inv.id === schedule.invigilator?.id
                            );

                            // If matched and has displayName (from professor), use that
                            if (matchedInvigilator?.displayName) {
                              return matchedInvigilator.displayName;
                            }

                            // Otherwise use the name we have
                            return schedule.invigilator.name || "-";
                          }
                          return "-";
                        })()}
                      </td>
                      <td className="px-6 py-4">{schedule.notes || "-"}</td>
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
                          <button
                            onClick={() => handleQuickAssignInvigilator(schedule.id)}
                            className="flex items-center gap-1 px-3 py-1 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                          >
                            <FiEdit2 className="w-4 h-4" />
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
                            name: selectedInv.displayName || selectedInv.name,
                            type: selectedInv.type,
                          } : null,
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
        onClose={() => setShowRandomAssignModal(false)}
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
              <div className="space-y-2">
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
                          <div className="hidden group-hover:block absolute z-10 bg-white/80 backdrop-blur-lg p-4 rounded-xl shadow-lg border border-gray-200/50 w-72 text-sm transition-all duration-300 transform -translate-y-1">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-full ${assignment.isTeachingFaculty ? 'bg-blue-100 text-blue-500' : 'bg-gray-100 text-gray-500'}`}>
                                {assignment.isTeachingFaculty ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.666c-.29.12-.5.41-.5.732V13a.5.5 0 00.5.5h2a.5.5 0 00.5-.5v-.25a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v.25a.5.5 0 00.5.5h2a.5.5 0 00.5-.5v-2.5a.5.5 0 00-.5-.5h-2a.5.5 0 01-.5-.5v-.5a.5.5 0 01.146-.354l2.5-2.5a.5.5 0 00.146-.354V8a.5.5 0 00-.5-.5H14a.5.5 0 01-.5-.5v-.5a.5.5 0 01.5-.5h1.5a1 1 0 001-1V4a1 1 0 00-1-1h-11z" />
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
                                      <span className="font-medium text-gray-800">{assignment.quotaUsed}/{assignment.quotaTotal}</span>
                                      <div className="ml-2 w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full ${
                                            assignment.quotaUsed / assignment.quotaTotal > 0.8 
                                              ? 'bg-red-500' 
                                              : assignment.quotaUsed / assignment.quotaTotal > 0.5 
                                                ? 'bg-yellow-500' 
                                                : 'bg-green-500'
                                          }`} 
                                          style={{ width: `${(assignment.quotaUsed / assignment.quotaTotal) * 100}%` }}
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
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2">{`${assignment.quotaUsed}/${assignment.quotaTotal}`}</td>
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
    </div>
  );
}
