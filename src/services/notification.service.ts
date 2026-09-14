import { prisma, newId } from "../utils/prisma";

type NotificationInput = {
  userId: bigint;
  bookingId?: bigint;
  title: string;
  message: string;
  type: string;
  dedupeKey?: string;
};

export const createNotification = (input: NotificationInput) =>
  prisma.notification.create({ data: { id: newId(), ...input } });

export async function notifyActiveAdmins(
  input: Omit<NotificationInput, "userId">,
) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin) => createNotification({ ...input, userId: admin.id })),
  );
}

export async function notifyBookingCreated(booking: {
  id: bigint;
  userId: bigint;
  bookingCode: string;
}) {
  await Promise.all([
    createNotification({
      userId: booking.userId,
      bookingId: booking.id,
      title: "ส่งคำขอจองสำเร็จ",
      message: "Booking " + booking.bookingCode + " กำลังรอการอนุมัติ",
      type: "BOOKING_CREATED",
    }),
    notifyActiveAdmins({
      bookingId: booking.id,
      title: "มีรายการรออนุมัติ",
      message: "Booking " + booking.bookingCode + " รอการตรวจสอบ",
      type: "BOOKING_PENDING",
    }),
  ]);
}

export async function notifyBookingUpdated(booking: {
  id: bigint;
  userId: bigint;
  bookingCode: string;
}) {
  await Promise.all([
    createNotification({
      userId: booking.userId,
      bookingId: booking.id,
      title: "แก้ไขการจองสำเร็จ",
      message: "Booking " + booking.bookingCode + " ถูกแก้ไขและรอการอนุมัติ",
      type: "BOOKING_UPDATED",
    }),
    notifyActiveAdmins({
      bookingId: booking.id,
      title: "รายการจองถูกแก้ไข",
      message: "Booking " + booking.bookingCode + " ต้องตรวจสอบอีกครั้ง",
      type: "BOOKING_UPDATED",
    }),
  ]);
}

export async function notifyBookingCancelled(booking: {
  id: bigint;
  userId: bigint;
  bookingCode: string;
}) {
  await Promise.all([
    createNotification({
      userId: booking.userId,
      bookingId: booking.id,
      title: "ยกเลิกการจองแล้ว",
      message: "Booking " + booking.bookingCode + " ถูกยกเลิกเรียบร้อยแล้ว",
      type: "BOOKING_CANCELLED",
    }),
    notifyActiveAdmins({
      bookingId: booking.id,
      title: "ผู้ใช้ยกเลิกการจอง",
      message: "Booking " + booking.bookingCode + " ถูกยกเลิก",
      type: "BOOKING_CANCELLED",
    }),
  ]);
}
