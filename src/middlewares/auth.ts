import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "../config/env";
import { AppError } from "./error";
import { prisma } from "../utils/prisma";

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new AppError(401, "Unauthorized");
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as {
      id: string;
      tokenVersion?: number;
    };
    const user = await prisma.user.findUnique({
      where: { id: BigInt(payload.id) },
      select: {
        id: true,
        role: true,
        email: true,
        status: true,
        tokenVersion: true,
      },
    });
    if (
      !user ||
      user.status !== "ACTIVE" ||
      (user.tokenVersion ?? 0) !== (payload.tokenVersion ?? 0)
    )
      throw new AppError(401, "User is inactive or no longer exists");
    req.user = { id: user.id, role: user.role, email: user.email };
    next();
  } catch (error) {
    next(
      error instanceof AppError ? error : new AppError(401, "Invalid token"),
    );
  }
};

export const requireRole = (role: Role) => requireAnyRole(role);
export const requireAnyRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) =>
    req.user && roles.includes(req.user.role)
      ? next()
      : next(new AppError(403, "Forbidden"));
