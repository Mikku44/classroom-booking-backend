import type { BookingStatus, UserRole } from "./types";

export const bookingStatusLabel: Record<BookingStatus, string> = {
  PENDING: "รออนุมัติ",
  CONFIRMED: "อนุมัติแล้ว",
  IN_USE: "กำลังใช้งาน",
  COMPLETED: "เสร็จสิ้น",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิก",
  NO_SHOW: "ไม่มาใช้งาน",
};

export const roleLabel: Record<UserRole, string> = {
  USER: "ผู้ใช้งาน",
  STUDENT: "นักศึกษา",
  TEACHER: "อาจารย์",
  ADMIN: "ผู้ดูแลระบบ",
};

export const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

export const statusClass = (status: BookingStatus) =>
  `status status-${status.toLowerCase().replace("_", "-")}`;
