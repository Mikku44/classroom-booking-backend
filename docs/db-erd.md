# Database Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ BOOKING : creates
    USER ||--o{ BOOKING : approves
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ AUDIT_LOG : performs
    CLASSROOM ||--o{ BOOKING : contains

    USER {
        BIGINT id PK
        VARCHAR name
        VARCHAR email UK
        VARCHAR passwordHash
        ENUM role
        ENUM status
        DATETIME createdAt
        DATETIME updatedAt
    }
    CLASSROOM {
        BIGINT id PK
        VARCHAR name
        VARCHAR building
        VARCHAR floor
        INT capacity
        JSON equipment
        VARCHAR imageUrl
        ENUM status
        DATETIME createdAt
        DATETIME updatedAt
    }
    BOOKING {
        BIGINT id PK
        VARCHAR bookingCode UK
        BIGINT userId FK
        BIGINT classroomId FK
        VARCHAR purpose
        INT attendeeCount
        JSON requestedEquipment
        TEXT description
        DATETIME startAt
        DATETIME endAt
        ENUM status
        TEXT adminNote
        BIGINT approvedBy FK
        DATETIME approvedAt
        DATETIME checkedInAt
        DATETIME completedAt
        DATETIME cancelledAt
        TEXT cancelReason
        DATETIME createdAt
        DATETIME updatedAt
    }
    AUDIT_LOG {
        BIGINT id PK
        BIGINT userId FK
        VARCHAR action
        VARCHAR entity
        BIGINT entityId
        JSON oldValue
        JSON newValue
        DATETIME createdAt
    }
    NOTIFICATION {
        BIGINT id PK
        BIGINT userId FK
        BIGINT bookingId FK
        VARCHAR title
        TEXT message
        VARCHAR type
        VARCHAR dedupeKey UK
        BOOLEAN isRead
        DATETIME createdAt
    }
```

## ความสัมพันธ์สำคัญ

- User หนึ่งคนสร้าง Booking ได้หลายรายการ
- Admin เป็น User เช่นกัน และสามารถอนุมัติ Booking ได้
- Classroom หนึ่งห้องมี Booking ได้หลายรายการ
- User หนึ่งคนได้รับ Notification ได้หลายรายการ
- User หนึ่งคนสร้าง Audit Log ได้หลายรายการ

Role: `USER`, `STUDENT`, `TEACHER`, `ADMIN`

Booking Status: `PENDING`, `CONFIRMED`, `IN_USE`, `COMPLETED`, `REJECTED`, `CANCELLED`, `NO_SHOW`
