import { Request, Router } from 'express';
import { BookingStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma, jsonSafe, newId } from '../../utils/prisma';
import { authenticate } from '../../middlewares/auth';
import { AppError } from '../../middlewares/error';
import { created, ok } from '../../utils/response';

const r = Router();
r.use(authenticate);
const bookingInput = z.object({
  classroomId: z.coerce.bigint().positive(),
  purpose: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date()
});
const listQuery = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
const ensureTime = (startAt: Date, endAt: Date) => {
  if (endAt <= startAt || startAt < new Date()) throw new AppError(400, 'Invalid booking time');
};
const findConflict = (classroomId: bigint, startAt: Date, endAt: Date, excludeId?: bigint) =>
  prisma.booking.findFirst({ where: { ...(excludeId ? { id: { not: excludeId } } : {}), classroomId, status: { in: ['PENDING', 'CONFIRMED'] }, startAt: { lt: endAt }, endAt: { gt: startAt } } });

r.post('/', async (req, res, next) => {
  try {
    const input = bookingInput.parse(req.body);
    ensureTime(input.startAt, input.endAt);
    const booking = await prisma.$transaction(async (tx) => {
      const classroom = await tx.classroom.findUnique({ where: { id: input.classroomId } });
      if (!classroom || classroom.status === 'INACTIVE') throw new AppError(400, 'Classroom is unavailable');
      const conflict = await tx.booking.findFirst({ where: { classroomId: input.classroomId, status: { in: ['PENDING', 'CONFIRMED'] }, startAt: { lt: input.endAt }, endAt: { gt: input.startAt } } });
      if (conflict) throw new AppError(409, 'Booking time conflicts');
      return tx.booking.create({
        data: { id: newId(), ...input, userId: req.user!.id, bookingCode: 'BK-' + Date.now() + '-' + Math.floor(Math.random() * 1000) },
        include: { classroom: true }
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    created(res, jsonSafe(booking), 'Booking created');
  } catch (error) { next(error); }
});
r.get('/', async (req, res, next) => {
  try {
    const q = listQuery.parse(req.query);
    const where = {
      userId: req.user!.id,
      ...(q.status ? { status: q.status } : {}),
      ...((q.startDate || q.endDate) ? { startAt: { ...(q.startDate ? { gte: q.startDate } : {}), ...(q.endDate ? { lte: q.endDate } : {}) } } : {})
    };
    const [data, total] = await Promise.all([
      prisma.booking.findMany({ where, skip: (q.page - 1) * q.limit, take: q.limit, orderBy: { createdAt: 'desc' }, include: { classroom: true } }),
      prisma.booking.count({ where })
    ]);
    ok(res, jsonSafe(data), 'Success', { page: q.page, limit: q.limit, total });
  } catch (error) { next(error); }
});
r.get('/:id', async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: BigInt(req.params.id), ...(req.user!.role === 'ADMIN' ? {} : { userId: req.user!.id }) },
      include: { classroom: true, user: { select: { id: true, name: true, email: true, role: true, status: true } } }
    });
    if (!booking) throw new AppError(404, 'Booking not found');
    ok(res, jsonSafe(booking));
  } catch (error) { next(error); }
});
r.patch('/:id', async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const current = await prisma.booking.findFirst({ where: { id, userId: req.user!.id } });
    if (!current) throw new AppError(404, 'Booking not found');
    if (current.status !== 'PENDING') throw new AppError(409, 'Only pending bookings can be edited');
    const input = bookingInput.partial().parse(req.body);
    const classroomId = input.classroomId ?? current.classroomId;
    const startAt = input.startAt ?? current.startAt;
    const endAt = input.endAt ?? current.endAt;
    ensureTime(startAt, endAt);
    const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
    if (!classroom || classroom.status === 'INACTIVE') throw new AppError(400, 'Classroom is unavailable');
    if (await findConflict(classroomId, startAt, endAt, id)) throw new AppError(409, 'Booking time conflicts');
    const booking = await prisma.booking.update({ where: { id }, data: input, include: { classroom: true } });
    ok(res, jsonSafe(booking), 'Booking updated');
  } catch (error) { next(error); }
});
const cancelBooking = async (req: Request) => {
  const id = BigInt(String(req.params.id));
  const booking = await prisma.booking.findFirst({ where: { id, userId: req.user!.id } });
  if (!booking) throw new AppError(404, 'Booking not found');
  if (['CANCELLED', 'COMPLETED', 'REJECTED'].includes(booking.status)) throw new AppError(409, 'Booking cannot be cancelled');
  return prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' }, include: { classroom: true } });
};
r.patch('/:id/cancel', async (req, res, next) => { try { ok(res, jsonSafe(await cancelBooking(req)), 'Booking cancelled'); } catch (error) { next(error); } });
r.delete('/:id', async (req, res, next) => { try { ok(res, jsonSafe(await cancelBooking(req)), 'Booking cancelled'); } catch (error) { next(error); } });
export default r;
