import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/app";
import { env } from "../src/config/env";
import { prisma } from "../src/utils/prisma";
describe("Authorization", () => {
  afterEach(() => jest.restoreAllMocks());
  it("rejects unauthenticated admin requests", async () => {
    expect((await request(app).get("/api/admin/users")).status).toBe(401);
  });
  it("rejects a student from admin APIs", async () => {
    jest
      .spyOn(prisma.user, "findUnique")
      .mockResolvedValue({
        id: 10n,
        role: "STUDENT",
        email: "student@test.local",
        status: "ACTIVE",
      } as never);
    const token = jwt.sign(
      { id: "10", role: "ADMIN", email: "student@test.local" },
      env.JWT_SECRET,
    );
    expect(
      (
        await request(app)
          .get("/api/admin/users")
          .set("Authorization", "Bearer " + token)
      ).status,
    ).toBe(403);
  });
  it("rejects a token for an inactive user", async () => {
    jest
      .spyOn(prisma.user, "findUnique")
      .mockResolvedValue({
        id: 10n,
        role: "ADMIN",
        email: "admin@test.local",
        status: "INACTIVE",
      } as never);
    const token = jwt.sign({ id: "10" }, env.JWT_SECRET);
    expect(
      (
        await request(app)
          .get("/api/admin/users")
          .set("Authorization", "Bearer " + token)
      ).status,
    ).toBe(401);
  });
  it("protects the image upload endpoint", async () => {
    expect((await request(app).post("/api/admin/uploads/images")).status).toBe(
      401,
    );
  });
});
