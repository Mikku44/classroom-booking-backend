import { useEffect, useState } from "react";
import { get, getPage, patch, post, type PageMeta } from "../api";
import { Pagination } from "../components/Pagination";
import { bookingStatusLabel, formatDateTime, statusClass } from "../format";
import type {
  Booking,
  BookingStatus,
  BusinessRules,
  Classroom,
  User,
} from "../types";

const statuses: Array<BookingStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "IN_USE",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
  "NO_SHOW",
];
const toLocalInput = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};

export function BookingsPage({ user }: { user: User }) {
  const [items, setItems] = useState<Booking[]>([]);
  const [rules, setRules] = useState<BusinessRules | null>(null);
  const [status, setStatus] = useState<BookingStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, limit: 10, total: 0 });
  const [editing, setEditing] = useState<Booking | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const canViewAll = user.role === "ADMIN";

  const load = async (targetPage = page) => {
    setLoading(true);
    setMessage("");
    const query = new URLSearchParams({
      page: String(targetPage),
      limit: String(limit),
    });
    if (canViewAll) query.set("scope", "all");
    if (status !== "ALL") query.set("status", status);
    if (search.trim()) query.set("search", search.trim());
    try {
      const result = await getPage<Booking>(`/bookings?${query}`);
      setItems(result.data);
      setMeta(result.meta);
      setPage(result.meta.page);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page);
  }, [status, page, limit]);
  useEffect(() => {
    get<BusinessRules>("/config/business-rules")
      .then(setRules)
      .catch(() => undefined);
  }, []);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (page === 1) void load(1);
    else setPage(1);
  };

  const runAction = async (request: Promise<unknown>, success: string) => {
    setMessage("");
    try {
      await request;
      setMessage(success);
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };
  const cancel = (booking: Booking) => {
    const reason = window.prompt("เหตุผลการยกเลิก", "ยกเลิกโดยผู้จอง");
    if (reason === null) return;
    if (!reason.trim()) return setMessage("กรุณาระบุเหตุผลการยกเลิก");
    void runAction(
      patch(`/bookings/${booking.id}/cancel`, { reason: reason.trim() }),
      "ยกเลิกการจองแล้ว",
    );
  };
  const canCancel = (booking: Booking) => {
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) return false;
    if (user.role === "ADMIN" || !rules) return true;
    return (
      new Date(booking.startAt).getTime() - Date.now() >=
      rules.bookingCancelMinutes * 60_000
    );
  };
  const canCheckIn = (booking: Booking) => {
    if (booking.status !== "CONFIRMED" || !rules) return false;
    const now = Date.now();
    const start = new Date(booking.startAt).getTime();
    return (
      now >= start - rules.bookingCheckinEarlyMinutes * 60_000 &&
      now <= start + rules.bookingCheckinLateMinutes * 60_000 &&
      now < new Date(booking.endAt).getTime()
    );
  };

  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">BOOKING LIFECYCLE</p>
          <h1>{canViewAll ? "รายการจองทั้งหมด" : "ประวัติการจอง"}</h1>
          <p className="muted">
            ติดตามสถานะ แก้ไขรายการที่รออนุมัติ ยกเลิก และ check-in
            ตามช่วงเวลาที่กำหนด
          </p>
        </div>
      </div>
      <form className="card filters" onSubmit={submitSearch}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ค้นหารหัส ห้อง วัตถุประสงค์ หรือผู้จอง"
        />
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as typeof status);
            setPage(1);
          }}
        >
          {statuses.map((item) => (
            <option value={item} key={item}>
              {item === "ALL" ? "ทุกสถานะ" : bookingStatusLabel[item]}
            </option>
          ))}
        </select>
        <select
          value={limit}
          onChange={(event) => {
            setLimit(Number(event.target.value));
            setPage(1);
          }}
          aria-label="จำนวนการจองต่อหน้า"
        >
          <option value="10">10 / หน้า</option>
          <option value="20">20 / หน้า</option>
          <option value="50">50 / หน้า</option>
        </select>
        <button className="primary" type="submit">
          ค้นหา
        </button>
      </form>
      {message && (
        <p
          className={`alert ${message.includes("แล้ว") || message.includes("สำเร็จ") ? "success" : "error"}`}
        >
          {message}
        </p>
      )}
      {loading ? (
        <div className="empty">กำลังโหลดรายการจอง...</div>
      ) : items.length === 0 ? (
        <div className="empty">ไม่พบรายการจอง</div>
      ) : (
        <div className="booking-list">
          {items.map((booking) => (
            <article className="card booking-item" key={booking.id}>
              <div className="booking-main">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">{booking.bookingCode}</p>
                    <h2>
                      {booking.classroom?.name || `ห้อง ${booking.classroomId}`}
                    </h2>
                  </div>
                  <span className={statusClass(booking.status)}>
                    {bookingStatusLabel[booking.status]}
                  </span>
                </div>
                <p className="booking-time">
                  {formatDateTime(booking.startAt)} –{" "}
                  {formatDateTime(booking.endAt)}
                </p>
                <div className="detail-grid">
                  <div>
                    <span>วัตถุประสงค์</span>
                    <strong>{booking.purpose}</strong>
                  </div>
                  <div>
                    <span>จำนวนผู้ใช้งาน</span>
                    <strong>{booking.attendeeCount} คน</strong>
                  </div>
                  {canViewAll && booking.user && (
                    <div>
                      <span>ผู้จอง</span>
                      <strong>
                        {booking.user.name} · {booking.user.email}
                      </strong>
                    </div>
                  )}
                  <div>
                    <span>อุปกรณ์</span>
                    <strong>
                      {booking.requestedEquipment?.join(", ") || "ไม่ระบุ"}
                    </strong>
                  </div>
                </div>
                {booking.description && (
                  <p className="note">
                    <strong>รายละเอียด:</strong> {booking.description}
                  </p>
                )}
                {booking.cancelReason && (
                  <p className="alert error">
                    <strong>เหตุผล:</strong> {booking.cancelReason}
                  </p>
                )}
                {booking.checkedInAt && (
                  <p className="muted">
                    Check-in: {formatDateTime(booking.checkedInAt)}
                  </p>
                )}
              </div>
              <div className="booking-actions">
                {booking.status === "PENDING" && (
                  <button onClick={() => setEditing(booking)}>แก้ไข</button>
                )}
                {canCancel(booking) && (
                  <button
                    className="danger-outline"
                    onClick={() => cancel(booking)}
                  >
                    ยกเลิก
                  </button>
                )}
                {booking.status === "CONFIRMED" &&
                  !canCheckIn(booking) &&
                  rules && (
                    <small className="muted">
                      Check-in ได้ {rules.bookingCheckinEarlyMinutes} นาทีก่อน
                      ถึง {rules.bookingCheckinLateMinutes} นาทีหลังเวลาเริ่ม
                    </small>
                  )}
                {canCheckIn(booking) && (
                  <button
                    className="primary"
                    onClick={() =>
                      void runAction(
                        post(`/bookings/${booking.id}/check-in`),
                        "Check-in สำเร็จ",
                      )
                    }
                  >
                    Check-in
                  </button>
                )}
                {["PENDING", "CONFIRMED"].includes(booking.status) &&
                  !canCancel(booking) &&
                  rules && (
                    <small className="muted">
                      เลยกำหนดยกเลิก {rules.bookingCancelMinutes} นาทีก่อนเริ่ม
                    </small>
                  )}
              </div>
            </article>
          ))}
        </div>
      )}
      <Pagination meta={meta} onPage={setPage} />
      {editing && (
        <EditBooking
          booking={editing}
          close={() => setEditing(null)}
          saved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </>
  );
}

function EditBooking({
  booking,
  close,
  saved,
}: {
  booking: Booking;
  close: () => void;
  saved: () => void;
}) {
  const [rooms, setRooms] = useState<Classroom[]>([]);
  const [classroomId, setClassroomId] = useState(booking.classroomId);
  const [purpose, setPurpose] = useState(booking.purpose);
  const [attendeeCount, setAttendeeCount] = useState(booking.attendeeCount);
  const [description, setDescription] = useState(booking.description || "");
  const [startAt, setStartAt] = useState(toLocalInput(booking.startAt));
  const [endAt, setEndAt] = useState(toLocalInput(booking.endAt));
  const [equipment, setEquipment] = useState<string[]>(
    booking.requestedEquipment || [],
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const room =
    rooms.find((item) => item.id === classroomId) || booking.classroom;
  useEffect(() => {
    get<Classroom[]>("/classrooms?page=1&limit=100")
      .then(setRooms)
      .catch((error) => setMessage(error.message));
  }, []);
  useEffect(() => {
    if (room)
      setEquipment((current) =>
        current.filter((item) => room.equipment?.includes(item)),
      );
  }, [classroomId]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await patch(`/bookings/${booking.id}`, {
        classroomId,
        purpose: purpose.trim(),
        attendeeCount,
        requestedEquipment: equipment,
        description: description.trim() || undefined,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
      });
      saved();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <form className="card booking-modal" onSubmit={submit}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">EDIT PENDING BOOKING</p>
            <h2>แก้ไข {booking.bookingCode}</h2>
          </div>
          <button type="button" className="icon-button" onClick={close}>
            ×
          </button>
        </div>
        <div className="form-grid">
          <label>
            ห้องเรียน
            <select
              value={classroomId}
              onChange={(event) => setClassroomId(event.target.value)}
            >
              {rooms.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name} · {item.building}
                </option>
              ))}
            </select>
          </label>
          <label>
            จำนวนผู้ใช้งาน
            <input
              type="number"
              min="1"
              max={room?.capacity}
              value={attendeeCount}
              onChange={(event) => setAttendeeCount(Number(event.target.value))}
            />
          </label>
          <label className="span-2">
            วัตถุประสงค์
            <input
              required
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
            />
          </label>
          <label>
            เวลาเริ่ม
            <input
              required
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
            />
          </label>
          <label>
            เวลาสิ้นสุด
            <input
              required
              type="datetime-local"
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
            />
          </label>
          <label className="span-2">
            รายละเอียด
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <fieldset className="span-2">
            <legend>อุปกรณ์ที่ต้องการ</legend>
            {(room?.equipment || []).map((item) => (
              <label className="check" key={item}>
                <input
                  type="checkbox"
                  checked={equipment.includes(item)}
                  onChange={() =>
                    setEquipment((current) =>
                      current.includes(item)
                        ? current.filter((value) => value !== item)
                        : [...current, item],
                    )
                  }
                />
                {item}
              </label>
            ))}
          </fieldset>
        </div>
        {message && <p className="alert error">{message}</p>}
        <div className="modal-actions">
          <button type="button" onClick={close}>
            ปิด
          </button>
          <button className="primary" disabled={loading}>
            {loading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </button>
        </div>
      </form>
    </div>
  );
}
