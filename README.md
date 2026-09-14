# Classroom Reservation Backend

Node.js + TypeScript + Express + MySQL + Prisma REST API สำหรับระบบจองห้องเรียน

## เริ่มใช้งานด้วย SQLite (Local)
SQLite ใช้ workflow แยกสำหรับ local โดยไม่กระทบ schema MySQL:

1. คัดลอก `.env.sqlite.example` เป็น `.env`
2. รัน `npm install`
3. รัน `npm run prisma:generate:sqlite`
4. รัน `npm run prisma:push:sqlite`
5. รัน `npm run prisma:seed:sqlite`
6. ใช้ `npm run dev`

ฐานข้อมูลจะถูกสร้างที่ `prisma/dev.db`

## เริ่มใช้งานด้วย MySQL
1. คัดลอก `.env.example` เป็น `.env` และตั้งค่า secrets/credentials
2. รัน `npm install`
3. รัน MySQL แล้วใช้ `npm run prisma:migrate` และ `npm run prisma:seed`
4. ใช้ `npm run dev` หรือ `npm run build && npm start`

Swagger เปิดที่ `http://localhost:3000/api-docs` และ health ของ API อยู่ภายใต้ `/api` ตามรายการใน source modules
ดู Database ER Diagram แบบ Mermaid ได้ที่ `docs/db-erd.md`

## Docker
`docker compose up --build`

ทุก response ใช้ `{ success, message, data, meta }`; error ใช้ `{ success:false, message, errors }`. Booking ที่ชนกันคืน 409 และใช้ transaction ตอนอนุมัติพร้อม audit/notification.

## Frontend API Path Guide

Base URL: http://localhost:3000/api

หลัง Login ให้เก็บ data.token และส่ง Header: Authorization: Bearer <token>

### 1. หน้าเข้าสู่ระบบ (Login)

    POST /api/auth/login
    Content-Type: application/json

Request: email และ password ระบบจะคืน data.token และ data.user

### 2. หน้าสมัครสมาชิก

    POST /api/auth/register
    Content-Type: application/json

Request:

    {
      "name": "สมชาย ใจดี",
      "email": "student@example.com",
      "password": "Student12345",
      "role": "STUDENT"
    }

Role ที่รองรับคือ STUDENT (นักศึกษา) และ TEACHER (อาจารย์)

### 3. หน้ารายการห้องเรียน

    GET /api/classrooms?page=1&limit=20
    GET /api/classrooms?search=A101&building=Building%20A&minCapacity=30&page=1&limit=20

ใช้ data แสดงชื่อห้อง อาคาร ชั้น จำนวนที่นั่ง และอุปกรณ์

### 4. หน้าตารางการใช้ห้อง

    GET /api/classrooms/{classroomId}/availability?startAt=2099-01-01T09:00:00.000Z&endAt=2099-01-01T10:00:00.000Z

ตรวจสอบ data.available หากเป็น false แปลว่าช่วงเวลานี้ถูกจองแล้ว

### 5. หน้าจองห้องเรียน

    POST /api/bookings

Request ต้องมี classroomId, purpose, startAt และ endAt โดย startAt ต้องน้อยกว่า endAt และต้องไม่ซ้ำกับรายการเดิม หากซ้ำคืน HTTP 409

### 6. หน้ายืนยันการจอง

ใช้ข้อมูลจาก response ของ POST /api/bookings เพื่อแสดง bookingCode, ชื่อห้อง, วัตถุประสงค์, ช่วงเวลา และสถานะ PENDING

โหลดรายละเอียดซ้ำได้ด้วย:

    GET /api/bookings/{bookingId}

### 7. หน้าประวัติการจอง

    GET /api/users/me/bookings?page=1&limit=20
    GET /api/bookings?page=1&limit=20&status=PENDING

ยกเลิกการจอง:

    PATCH /api/bookings/{bookingId}/cancel

สถานะที่ควรแสดงคือ PENDING, CONFIRMED, REJECTED, CANCELLED และ COMPLETED

## Admin Frontend API Path Guide

ทุกหน้าส่วน Admin ต้องส่ง Header:

    Authorization: Bearer <admin-token>

ผู้ใช้ต้องมี role เป็น ADMIN มิฉะนั้น API จะคืน HTTP 403

### 8. หน้า Dashboard

สรุปข้อมูลหลัก:

    GET /api/admin/dashboard/summary

ข้อมูลที่ใช้แสดง:

- จำนวนผู้ใช้งานทั้งหมด
- จำนวนห้องเรียนทั้งหมด
- จำนวนการจองทั้งหมด
- จำนวนรายการรออนุมัติ
- จำนวนรายการ CONFIRMED
- จำนวนรายการ CANCELLED
- ห้องที่ถูกจองบ่อยที่สุด

รายการจองล่าสุด:

    GET /api/admin/dashboard/recent-bookings?limit=10

### 9. หน้าจัดการห้องเรียน

ดูห้องเรียนทั้งหมด รวม INACTIVE:

    GET /api/admin/classrooms

เพิ่มห้องเรียน:

    POST /api/admin/classrooms
    Content-Type: application/json

Request:

    {
      "name": "A101",
      "building": "Building A",
      "floor": "1",
      "capacity": 40,
      "equipment": ["Projector", "Whiteboard"]
    }

เปลี่ยนสถานะห้องเรียน:

    PATCH /api/admin/classrooms/{classroomId}/status

Request:

    {
      "status": "INACTIVE"
    }

### 10. หน้าจัดการการจอง

ดูรายการจองทั้งหมด:

    GET /api/admin/bookings

อนุมัติการจอง:

    PATCH /api/admin/bookings/{bookingId}/approve

ปฏิเสธการจอง:

    PATCH /api/admin/bookings/{bookingId}/reject
    Content-Type: application/json

Request:

    {
      "adminNote": "ช่วงเวลานี้ไม่ว่าง"
    }

เมื่ออนุมัติ ระบบจะตรวจสอบเวลาชน, บันทึกผู้อนุมัติ, สร้าง Notification และ Audit Log

### 11. หน้าจัดการผู้ใช้งาน

ดูผู้ใช้งานทั้งหมด:

    GET /api/admin/users

เปลี่ยนสถานะผู้ใช้งาน:

    PATCH /api/admin/users/{userId}/status
    Content-Type: application/json

Request:

    {
      "status": "INACTIVE"
    }

Role และ Status ที่รองรับ:

- Role: USER, STUDENT, TEACHER, ADMIN
- Status: ACTIVE, INACTIVE

### 12. หน้ารายงานและสถิติ

รายงานสรุป:

    GET /api/admin/reports/summary

ข้อมูลที่ใช้แสดง:

- จำนวนผู้ใช้งาน
- จำนวนห้องเรียน
- จำนวนการจองทั้งหมด
- จำนวนการจองแยกตามสถานะ

Audit Logs สำหรับตรวจสอบการเปลี่ยนแปลง:

    GET /api/admin/audit-logs

หน้า Admin ควรแสดง Loading, Empty State และ Error State และ refresh ข้อมูลหลัง Approve, Reject หรือเปลี่ยนสถานะสำเร็จ

## Image Upload

ปัจจุบันระบบเก็บรูปภาพไว้ที่ public/assets และเปิดอ่านผ่าน /assets/{filename}

อัปโหลดรูปภาพ (Admin):

    POST /api/admin/uploads/images
    Authorization: Bearer <admin-token>
    Content-Type: multipart/form-data
    Field name: image

รองรับ JPEG, PNG, WebP และ GIF ขนาดสูงสุด 5 MB ระบบจะคืน key และ url จากนั้นนำ url ไปบันทึกกับห้อง:

    PATCH /api/admin/classrooms/{classroomId}
    {
      "imageUrl": "http://localhost:3000/assets/example.webp"
    }

ลบรูป local:

    DELETE /api/admin/uploads/images/{key}

Storage abstraction อยู่ที่ src/services/image-storage.ts เมื่อต้องการใช้ Cloudflare R2 ให้สร้าง R2ImageStorage ที่ implements ImageStorage แล้วเลือก provider จาก STORAGE_DRIVER โดยไม่ต้องเปลี่ยน Upload Route
