import { Router } from "express";
import bcrypt from "bcryptjs";
import { BookingStatus } from "@prisma/client";
import { z } from "zod";
import { authenticate, requireAnyRole } from "../../middlewares/auth";
import { AppError } from "../../middlewares/error";
import { prisma, jsonSafe } from "../../utils/prisma";
import { ok } from "../../utils/response";

const r = Router();
r.use(authenticate);
const publicUser = {
  id: true,
  userCode: true,
  name: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} as const;
r.get(
  "/directory",
  requireAnyRole("STAFF", "ADMIN"),
  async (req, res, next) => {
    try {
      const query = z
        .object({
          search: z.string().trim().max(150).optional(),
          limit: z.coerce.number().int().min(1).max(100).default(100),
        })
        .parse(req.query);
      const users = await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          ...(query.search
            ? {
                OR: [
                  { name: { contains: query.search } },
                  { userCode: { contains: query.search } },
                  { email: { contains: query.search } },
                ],
              }
            : {}),
        },
        take: query.limit,
        orderBy: { name: "asc" },
        select: publicUser,
      });
      ok(res, jsonSafe(users));
    } catch (error) {
      next(error);
    }
  },
);
r.get("/me", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: publicUser,
    });
    if (!user) throw new AppError(404, "User not found");
    ok(res, jsonSafe(user));
  } catch (error) {
    next(error);
  }
});
r.patch("/me", async (req, res, next) => {
  try {
    const input = z
      .object({
        name: z.string().min(1).max(150),
        firstName: z.string().trim().min(1).max(100).nullable(),
        lastName: z.string().trim().min(1).max(100).nullable(),
        phone: z.string().regex(/^0[0-9]{8,9}$/).nullable(),
        email: z.string().email(),
      })
      .partial()
      .parse(req.body);
    ok(
      res,
      jsonSafe(
        await prisma.user.update({
          where: { id: req.user!.id },
          data: input,
          select: publicUser,
        }),
      ),
      "Profile updated",
    );
  } catch (error) {
    next(error);
  }
});
r.patch("/me/password", async (req, res, next) => {
  try {
    const input = z
      .object({ currentPassword: z.string(), newPassword: z.string().min(8) })
      .parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (
      !user ||
      !(await bcrypt.compare(input.currentPassword, user.passwordHash))
    )
      throw new AppError(400, "Current password is incorrect");
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(input.newPassword, 12) },
    });
    ok(res, null, "Password changed");
  } catch (error) {
    next(error);
  }
});
r.get("/me/bookings", async (req, res, next) => {
  try {
    const q = z
      .object({
        status: z.nativeEnum(BookingStatus).optional(),
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(req.query);
    const where = {
      userId: req.user!.id,
      ...(q.status ? { status: q.status } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: { createdAt: "desc" },
        include: { classroom: true },
      }),
      prisma.booking.count({ where }),
    ]);
    ok(res, jsonSafe(data), "Success", { page: q.page, limit: q.limit, total });
  } catch (error) {
    next(error);
  }
});
export default r;
