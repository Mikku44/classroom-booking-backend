export type UserRole = "USER" | "STUDENT" | "TEACHER" | "STAFF" | "ADMIN";
export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_USE"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "NO_SHOW";
export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  updatedAt?: string;
};
export type Classroom = {
  id: string;
  name: string;
  building: string;
  floor: string;
  capacity: number;
  equipment?: string[];
  imageUrl?: string | null;
  status: string;
};
export type Booking = {
  id: string;
  bookingCode: string;
  purpose: string;
  attendeeCount: number;
  requestedEquipment?: string[];
  description?: string | null;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  classroomId: string;
  classroom?: Classroom;
  user?: User;
  checkedInAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  adminNote?: string | null;
  approvedAt?: string | null;
  createdAt?: string;
  approver?: User | null;
};
export type Notification = {
  id: string;
  bookingId?: string | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  booking?: Pick<
    Booking,
    "id" | "bookingCode" | "startAt" | "endAt" | "status"
  > & { classroom?: Pick<Classroom, "id" | "name"> };
};

export type BusinessRules = {
  bookingCancelMinutes: number;
  bookingMaxDurationHours: number;
  bookingMaxAdvanceDays: number;
  bookingCheckinEarlyMinutes: number;
  bookingCheckinLateMinutes: number;
  bookingReminderMinutes: number;
  roles: UserRole[];
  bookingStatuses: BookingStatus[];
};

export type AvailabilityRoom = Classroom & {
  available: boolean;
  conflicts: Pick<
    Booking,
    "id" | "bookingCode" | "startAt" | "endAt" | "status"
  >[];
};
