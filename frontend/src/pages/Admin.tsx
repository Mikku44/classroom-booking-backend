import { useEffect, useMemo, useState } from "react";
import { downloadReport, get, patch, post, remove, uploadImage } from "../api";
import {
  bookingStatusLabel,
  formatDateTime,
  roleLabel,
  statusClass,
} from "../format";
import type {
  Booking,
  BookingStatus,
  Classroom,
  User,
  UserRole,
} from "../types";

type Tab = "dashboard" | "classrooms" | "bookings" | "users" | "reports";
const tabLabels: Record<Tab, string> = {
  dashboard: "Dashboard",
  classrooms: "จัดการห้องเรียน",
  bookings: "จัดการการจอง",
  users: "จัดการผู้ใช้งาน",
  reports: "รายงานและสถิติ",
};

export function AdminPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>จัดการระบบ</h1>
          <p className="muted">
            ควบคุมข้อมูลหลักและ business flow ทั้งหมดจากส่วนกลาง
          </p>
        </div>
      </div>
      <div className="admin-tabs">
        {(Object.keys(tabLabels) as Tab[]).map((item) => (
          <button
            className={tab === item ? "active" : ""}
            key={item}
            onClick={() => setTab(item)}
          >
            {tabLabels[item]}
          </button>
        ))}
      </div>
      {tab === "dashboard" && <AdminDashboard />}
      {tab === "classrooms" && <AdminClassrooms />}
      {tab === "bookings" && <AdminBookings />}
      {tab === "users" && <AdminUsers />}
      {tab === "reports" && <AdminReports />}
    </>
  );
}

type DashboardSummary = {
  users: number;
  activeUsers: number;
  classrooms: number;
  bookings: number;
  pending: number;
  confirmed: number;
  inUse: number;
  completed: number;
  noShow: number;
  cancelled: number;
  mostBookedClassroom?: Classroom & { bookingCount: number };
};
function AdminDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recent, setRecent] = useState<Booking[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    Promise.all([
      get<DashboardSummary>("/admin/dashboard/summary"),
      get<Booking[]>("/admin/dashboard/recent-bookings?limit=8"),
    ])
      .then(([data, bookings]) => {
        setSummary(data);
        setRecent(bookings);
      })
      .catch((error) => setMessage(error.message));
  }, []);
  if (message) return <p className="alert error">{message}</p>;
  if (!summary) return <div className="empty">กำลังโหลด Dashboard...</div>;
  return (
    <>
      <div className="stats-grid">
        <div className="stat">
          <span>ผู้ใช้งานทั้งหมด</span>
          <strong>{summary.users}</strong>
          <small>Active {summary.activeUsers}</small>
        </div>
        <div className="stat">
          <span>ห้องเรียน</span>
          <strong>{summary.classrooms}</strong>
        </div>
        <div className="stat pending">
          <span>รออนุมัติ</span>
          <strong>{summary.pending}</strong>
        </div>
        <div className="stat in-use">
          <span>กำลังใช้งาน</span>
          <strong>{summary.inUse}</strong>
        </div>
      </div>
      <div className="two-column">
        <section className="card">
          <div className="section-heading">
            <h2>การจองล่าสุด</h2>
            <span>{summary.bookings} รายการ</span>
          </div>
          {recent.length === 0 ? (
            <div className="empty">ยังไม่มีรายการจอง</div>
          ) : (
            recent.map((booking) => (
              <div className="list-row" key={booking.id}>
                <div>
                  <strong>
                    {booking.bookingCode} · {booking.classroom?.name}
                  </strong>
                  <small>
                    {booking.user?.name} · {formatDateTime(booking.startAt)}
                  </small>
                </div>
                <span className={statusClass(booking.status)}>
                  {bookingStatusLabel[booking.status]}
                </span>
              </div>
            ))
          )}
        </section>
        <section className="card">
          <h2>สรุปสถานะ</h2>
          <div className="rule-list">
            <p>
              <strong>{summary.confirmed}</strong>
              <span>อนุมัติแล้ว</span>
            </p>
            <p>
              <strong>{summary.completed}</strong>
              <span>เสร็จสิ้น</span>
            </p>
            <p>
              <strong>{summary.noShow}</strong>
              <span>ไม่มาใช้งาน</span>
            </p>
            <p>
              <strong>{summary.cancelled}</strong>
              <span>ยกเลิก</span>
            </p>
          </div>
          {summary.mostBookedClassroom && (
            <div className="highlight">
              <span>ห้องยอดนิยม</span>
              <strong>{summary.mostBookedClassroom.name}</strong>
              <small>{summary.mostBookedClassroom.bookingCount} ครั้ง</small>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

type RoomDraft = {
  name: string;
  building: string;
  floor: string;
  capacity: number;
  equipment: string;
  imageUrl: string;
};
const emptyRoom: RoomDraft = {
  name: "",
  building: "",
  floor: "",
  capacity: 30,
  equipment: "",
  imageUrl: "",
};
function AdminClassrooms() {
  const [rooms, setRooms] = useState<Classroom[]>([]);
  const [draft, setDraft] = useState<RoomDraft>(emptyRoom);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const load = async () => {
    try {
      setRooms(await get<Classroom[]>("/admin/classrooms?limit=100"));
    } catch (error) {
      setMessage((error as Error).message);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const openEdit = (room: Classroom) => {
    setEditing(room);
    setDraft({
      name: room.name,
      building: room.building,
      floor: room.floor,
      capacity: room.capacity,
      equipment: (room.equipment || []).join(", "),
      imageUrl: room.imageUrl || "",
    });
    setFile(null);
    setMessage("");
  };
  const close = () => {
    setEditing(null);
    setDraft(emptyRoom);
    setFile(null);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      let imageUrl = draft.imageUrl || null;
      if (file) imageUrl = (await uploadImage(file)).url;
      const data = {
        name: draft.name.trim(),
        building: draft.building.trim(),
        floor: draft.floor.trim(),
        capacity: draft.capacity,
        equipment: draft.equipment
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        imageUrl,
      };
      if (editing) await patch(`/admin/classrooms/${editing.id}`, data);
      else await post("/admin/classrooms", data);
      setMessage(editing ? "แก้ไขห้องเรียนแล้ว" : "เพิ่มห้องเรียนแล้ว");
      close();
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const changeStatus = async (room: Classroom) => {
    try {
      await patch(`/admin/classrooms/${room.id}/status`, {
        status: room.status === "AVAILABLE" ? "INACTIVE" : "AVAILABLE",
      });
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };
  const deactivate = async (room: Classroom) => {
    if (
      !window.confirm(`ปิดใช้งานห้อง ${room.name}? ข้อมูลการจองเดิมจะยังอยู่`)
    )
      return;
    try {
      await remove(`/admin/classrooms/${room.id}`);
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };
  const visible = rooms.filter((room) =>
    `${room.name} ${room.building}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="toolbar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ค้นหาชื่อห้องหรืออาคาร"
        />
        <button
          className="primary"
          onClick={() => {
            close();
            setEditing({
              id: "",
              ...emptyRoom,
              equipment: [],
              status: "AVAILABLE",
            });
          }}
        >
          + เพิ่มห้องเรียน
        </button>
      </div>
      {message && (
        <p
          className={`alert ${message.includes("แล้ว") ? "success" : "error"}`}
        >
          {message}
        </p>
      )}
      <div className="room-grid">
        {visible.map((room) => (
          <article className="card room-card admin-room" key={room.id}>
            {room.imageUrl ? (
              <img className="room-image" src={room.imageUrl} alt={room.name} />
            ) : (
              <div className="room-placeholder">ไม่มีรูปภาพ</div>
            )}
            <div className="room-content">
              <div className="section-heading">
                <h2>{room.name}</h2>
                <span
                  className={`status ${room.status === "AVAILABLE" ? "status-available" : "status-inactive"}`}
                >
                  {room.status}
                </span>
              </div>
              <p>
                {room.building} · ชั้น {room.floor} · {room.capacity} คน
              </p>
              <div className="chips">
                {(room.equipment || []).map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              <div className="card-actions">
                <button onClick={() => openEdit(room)}>แก้ไข / รูปภาพ</button>
                <button onClick={() => void changeStatus(room)}>
                  {room.status === "AVAILABLE" ? "ปิดชั่วคราว" : "เปิดใช้งาน"}
                </button>
                {room.status === "AVAILABLE" && (
                  <button
                    className="danger-outline"
                    onClick={() => void deactivate(room)}
                  >
                    ปิดใช้งาน
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      {editing && (
        <div className="modal" role="dialog" aria-modal="true">
          <form className="card booking-modal" onSubmit={save}>
            <div className="section-heading">
              <h2>{editing.id ? "แก้ไขห้องเรียน" : "เพิ่มห้องเรียน"}</h2>
              <button type="button" className="icon-button" onClick={close}>
                ×
              </button>
            </div>
            <div className="form-grid">
              <label>
                ชื่อห้อง
                <input
                  required
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                />
              </label>
              <label>
                อาคาร
                <input
                  required
                  value={draft.building}
                  onChange={(event) =>
                    setDraft({ ...draft, building: event.target.value })
                  }
                />
              </label>
              <label>
                ชั้น
                <input
                  required
                  value={draft.floor}
                  onChange={(event) =>
                    setDraft({ ...draft, floor: event.target.value })
                  }
                />
              </label>
              <label>
                ความจุ
                <input
                  required
                  min="1"
                  type="number"
                  value={draft.capacity}
                  onChange={(event) =>
                    setDraft({ ...draft, capacity: Number(event.target.value) })
                  }
                />
              </label>
              <label className="span-2">
                อุปกรณ์ (คั่นด้วย comma)
                <input
                  value={draft.equipment}
                  onChange={(event) =>
                    setDraft({ ...draft, equipment: event.target.value })
                  }
                  placeholder="Projector, Microphone"
                />
              </label>
              <label className="span-2">
                รูปห้อง (JPG, PNG, WebP, GIF)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
              </label>
              {draft.imageUrl && (
                <img
                  className="image-preview span-2"
                  src={draft.imageUrl}
                  alt="รูปปัจจุบัน"
                />
              )}
            </div>
            <div className="modal-actions">
              <button type="button" onClick={close}>
                ยกเลิก
              </button>
              <button className="primary" disabled={loading}>
                {loading ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

const allBookingStatuses: Array<BookingStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "IN_USE",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
  "NO_SHOW",
];
function AdminBookings() {
  const [items, setItems] = useState<Booking[]>([]);
  const [status, setStatus] = useState<BookingStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    const query = new URLSearchParams({ limit: "100" });
    if (status !== "ALL") query.set("status", status);
    if (search.trim()) query.set("search", search.trim());
    try {
      setItems(await get<Booking[]>(`/admin/bookings?${query}`));
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [status]);
  const action = async (
    booking: Booking,
    kind: "approve" | "reject" | "cancel" | "start" | "complete" | "no-show",
  ) => {
    let data: Record<string, string> = {};
    if (["reject", "cancel", "no-show"].includes(kind)) {
      const reason = window.prompt(
        kind === "reject"
          ? "เหตุผลที่ไม่อนุมัติ"
          : kind === "cancel"
            ? "เหตุผลการยกเลิก"
            : "หมายเหตุ no-show",
        kind === "no-show" ? "ผู้จองไม่มาใช้งาน" : "",
      );
      if (reason === null) return;
      if (kind !== "no-show" && !reason.trim())
        return setMessage("กรุณาระบุเหตุผล");
      data =
        kind === "reject"
          ? { adminNote: reason.trim() }
          : { reason: reason.trim() };
    }
    try {
      await patch(`/admin/bookings/${booking.id}/${kind}`, data);
      setMessage("อัปเดตสถานะการจองแล้ว");
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };
  return (
    <>
      <section className="card filters">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ค้นหารหัส ผู้จอง ห้อง หรือวัตถุประสงค์"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
        >
          {allBookingStatuses.map((item) => (
            <option value={item} key={item}>
              {item === "ALL" ? "ทุกสถานะ" : bookingStatusLabel[item]}
            </option>
          ))}
        </select>
        <button className="primary" onClick={load}>
          ค้นหา
        </button>
      </section>
      {message && (
        <p
          className={`alert ${message.includes("แล้ว") ? "success" : "error"}`}
        >
          {message}
        </p>
      )}
      {loading ? (
        <div className="empty">กำลังโหลด...</div>
      ) : (
        <div className="booking-list">
          {items.map((booking) => (
            <article className="card booking-item compact" key={booking.id}>
              <div className="booking-main">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">{booking.bookingCode}</p>
                    <h2>{booking.classroom?.name}</h2>
                  </div>
                  <span className={statusClass(booking.status)}>
                    {bookingStatusLabel[booking.status]}
                  </span>
                </div>
                <p>
                  {booking.user?.name} · {booking.user?.email}
                </p>
                <p className="booking-time">
                  {formatDateTime(booking.startAt)} –{" "}
                  {formatDateTime(booking.endAt)}
                </p>
                <p>
                  <strong>{booking.purpose}</strong> · {booking.attendeeCount}{" "}
                  คน
                </p>
                {booking.adminNote && (
                  <p className="alert">หมายเหตุ: {booking.adminNote}</p>
                )}
                {booking.cancelReason && (
                  <p className="alert error">เหตุผล: {booking.cancelReason}</p>
                )}
              </div>
              <div className="booking-actions">
                {booking.status === "PENDING" && (
                  <>
                    <button
                      className="primary"
                      onClick={() => void action(booking, "approve")}
                    >
                      อนุมัติ
                    </button>
                    <button
                      className="danger-outline"
                      onClick={() => void action(booking, "reject")}
                    >
                      ไม่อนุมัติ
                    </button>
                  </>
                )}
                {booking.status === "CONFIRMED" && (
                  <>
                    <button
                      className="primary"
                      onClick={() => void action(booking, "start")}
                    >
                      เริ่มใช้งาน
                    </button>
                    <button onClick={() => void action(booking, "no-show")}>
                      No-show
                    </button>
                  </>
                )}
                {booking.status === "IN_USE" && (
                  <button
                    className="primary"
                    onClick={() => void action(booking, "complete")}
                  >
                    จบการใช้งาน
                  </button>
                )}
                {["PENDING", "CONFIRMED"].includes(booking.status) && (
                  <button
                    className="danger-outline"
                    onClick={() => void action(booking, "cancel")}
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

type UserDraft = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE";
};
const emptyUser: UserDraft = {
  name: "",
  email: "",
  password: "",
  role: "STUDENT",
  status: "ACTIVE",
};
function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [draft, setDraft] = useState<UserDraft>(emptyUser);
  const [editing, setEditing] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "ALL">("ALL");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const load = async () => {
    const query = new URLSearchParams({ limit: "100" });
    if (search.trim()) query.set("search", search.trim());
    if (role !== "ALL") query.set("role", role);
    try {
      setUsers(await get<User[]>(`/admin/users?${query}`));
    } catch (error) {
      setMessage((error as Error).message);
    }
  };
  useEffect(() => {
    void load();
  }, [role]);
  const openNew = () => {
    setEditing({
      id: "",
      name: "",
      email: "",
      role: "STUDENT",
      status: "ACTIVE",
    });
    setDraft(emptyUser);
  };
  const openEdit = (user: User) => {
    setEditing(user);
    setDraft({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      status: user.status,
    });
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (!editing?.id) await post("/admin/users", draft);
      else {
        await patch(`/admin/users/${editing.id}`, {
          name: draft.name,
          email: draft.email,
        });
        if (draft.role !== editing.role)
          await patch(`/admin/users/${editing.id}/role`, { role: draft.role });
        if (draft.status !== editing.status)
          await patch(`/admin/users/${editing.id}/status`, {
            status: draft.status,
          });
        if (draft.password)
          await patch(`/admin/users/${editing.id}/reset-password`, {
            newPassword: draft.password,
          });
      }
      setEditing(null);
      setMessage("บันทึกผู้ใช้งานแล้ว");
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const deactivate = async (user: User) => {
    if (!window.confirm(`ปิดใช้งาน ${user.name}?`)) return;
    try {
      await remove(`/admin/users/${user.id}`);
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };
  return (
    <>
      <section className="card filters">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ค้นหาชื่อหรืออีเมล"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as typeof role)}
        >
          <option value="ALL">ทุก Role</option>
          {(["USER", "STUDENT", "TEACHER", "STAFF", "ADMIN"] as UserRole[]).map(
            (item) => (
              <option value={item} key={item}>
                {roleLabel[item]}
              </option>
            ),
          )}
        </select>
        <button onClick={load}>ค้นหา</button>
        <button className="primary" onClick={openNew}>
          + เพิ่มผู้ใช้งาน
        </button>
      </section>
      {message && (
        <p
          className={`alert ${message.includes("แล้ว") ? "success" : "error"}`}
        >
          {message}
        </p>
      )}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>ผู้ใช้งาน</th>
              <th>Role</th>
              <th>สถานะ</th>
              <th>สร้างเมื่อ</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </td>
                <td>{roleLabel[user.role]}</td>
                <td>
                  <span
                    className={`status ${user.status === "ACTIVE" ? "status-available" : "status-inactive"}`}
                  >
                    {user.status}
                  </span>
                </td>
                <td>{user.createdAt ? formatDateTime(user.createdAt) : "-"}</td>
                <td className="table-actions">
                  <button onClick={() => openEdit(user)}>แก้ไข</button>
                  {user.status === "ACTIVE" && (
                    <button
                      className="danger-outline"
                      onClick={() => void deactivate(user)}
                    >
                      ปิดใช้งาน
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="modal">
          <form className="card booking-modal" onSubmit={save}>
            <div className="section-heading">
              <h2>{editing.id ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งาน"}</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setEditing(null)}
              >
                ×
              </button>
            </div>
            <div className="form-grid">
              <label>
                ชื่อ
                <input
                  required
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                />
              </label>
              <label>
                อีเมล
                <input
                  required
                  type="email"
                  value={draft.email}
                  onChange={(event) =>
                    setDraft({ ...draft, email: event.target.value })
                  }
                />
              </label>
              <label>
                Role
                <select
                  value={draft.role}
                  onChange={(event) =>
                    setDraft({ ...draft, role: event.target.value as UserRole })
                  }
                >
                  {(
                    [
                      "USER",
                      "STUDENT",
                      "TEACHER",
                      "STAFF",
                      "ADMIN",
                    ] as UserRole[]
                  ).map((item) => (
                    <option value={item} key={item}>
                      {roleLabel[item]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                สถานะ
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      status: event.target.value as UserDraft["status"],
                    })
                  }
                >
                  <option>ACTIVE</option>
                  <option>INACTIVE</option>
                </select>
              </label>
              <label className="span-2">
                {editing.id
                  ? "ตั้งรหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)"
                  : "รหัสผ่าน"}
                <input
                  required={!editing.id}
                  minLength={8}
                  type="password"
                  value={draft.password}
                  onChange={(event) =>
                    setDraft({ ...draft, password: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setEditing(null)}>
                ยกเลิก
              </button>
              <button className="primary" disabled={loading}>
                {loading ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

type BookingReport = {
  total: number;
  byStatus: Array<{ status: BookingStatus; _count: { _all: number } }>;
  rows: Booking[];
};
type RoomReport = Array<{
  classroom: Classroom;
  bookingCount: number;
  totalHours: number;
}>;
type UserReport = Array<{ user: User; bookingCount: number }>;
function AdminReports() {
  const [kind, setKind] = useState<"bookings" | "classrooms" | "users">(
    "bookings",
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<BookingStatus | "ALL">("ALL");
  const [report, setReport] = useState<
    BookingReport | RoomReport | UserReport | null
  >(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (startDate)
      params.set("startDate", new Date(`${startDate}T00:00:00`).toISOString());
    if (endDate)
      params.set("endDate", new Date(`${endDate}T23:59:59`).toISOString());
    if (status !== "ALL") params.set("status", status);
    const value = params.toString();
    return value ? `?${value}` : "";
  }, [startDate, endDate, status]);
  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      setReport(await get(`/admin/reports/${kind}${query}`));
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [kind]);
  return (
    <>
      <section className="card filters report-filter">
        <select
          value={kind}
          onChange={(event) => {
            setKind(event.target.value as typeof kind);
            setReport(null);
          }}
        >
          <option value="bookings">รายงานการจอง</option>
          <option value="classrooms">สถิติห้องเรียน</option>
          <option value="users">สถิติผู้ใช้งาน</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
        <input
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
        >
          {allBookingStatuses.map((item) => (
            <option value={item} key={item}>
              {item === "ALL" ? "ทุกสถานะ" : bookingStatusLabel[item]}
            </option>
          ))}
        </select>
        <button onClick={load}>สร้างรายงาน</button>
        <button className="primary" onClick={() => void downloadReport(query)}>
          Export CSV
        </button>
      </section>
      {message && <p className="alert error">{message}</p>}
      {loading ? (
        <div className="empty">กำลังประมวลผลรายงาน...</div>
      ) : (
        report && <ReportResult kind={kind} report={report} />
      )}
    </>
  );
}
function ReportResult({
  kind,
  report,
}: {
  kind: "bookings" | "classrooms" | "users";
  report: BookingReport | RoomReport | UserReport;
}) {
  if (kind === "bookings") {
    const data = report as BookingReport;
    return (
      <>
        <div className="stats-grid">
          <div className="stat">
            <span>การจองตามเงื่อนไข</span>
            <strong>{data.total}</strong>
          </div>
          {data.byStatus.map((item) => (
            <div className="stat" key={item.status}>
              <span>{bookingStatusLabel[item.status]}</span>
              <strong>{item._count._all}</strong>
            </div>
          ))}
        </div>
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>รหัส</th>
                <th>ผู้จอง</th>
                <th>ห้อง</th>
                <th>เวลา</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.bookingCode}</td>
                  <td>{row.user?.name}</td>
                  <td>{row.classroom?.name}</td>
                  <td>{formatDateTime(row.startAt)}</td>
                  <td>
                    <span className={statusClass(row.status)}>
                      {bookingStatusLabel[row.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }
  if (kind === "classrooms")
    return (
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>ห้องเรียน</th>
              <th>อาคาร</th>
              <th>จำนวนการจอง</th>
              <th>ชั่วโมงใช้งาน</th>
            </tr>
          </thead>
          <tbody>
            {(report as RoomReport).map((item) => (
              <tr key={item.classroom.id}>
                <td>{item.classroom.name}</td>
                <td>{item.classroom.building}</td>
                <td>{item.bookingCount}</td>
                <td>{item.totalHours.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <div className="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>ผู้ใช้งาน</th>
            <th>อีเมล</th>
            <th>Role</th>
            <th>จำนวนการจอง</th>
          </tr>
        </thead>
        <tbody>
          {(report as UserReport).map((item) => (
            <tr key={item.user.id}>
              <td>{item.user.name}</td>
              <td>{item.user.email}</td>
              <td>{roleLabel[item.user.role]}</td>
              <td>{item.bookingCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
