import { useEffect, useState } from "react";
import { get, post } from "../api";
import type { Booking, BusinessRules, Classroom, User } from "../types";

export function ClassroomsPage({
  onBooked,
}: {
  onBooked: (booking: Booking) => void;
}) {
  const [rooms, setRooms] = useState<Classroom[]>([]);
  const [selected, setSelected] = useState<Classroom | null>(null);
  const [search, setSearch] = useState("");
  const [building, setBuilding] = useState("");
  const [minCapacity, setMinCapacity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ page: "1", limit: "100" });
    if (search) query.set("search", search);
    if (building) query.set("building", building);
    if (minCapacity) query.set("minCapacity", minCapacity);
    try {
      setRooms(await get<Classroom[]>("/classrooms?" + query));
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">ROOM DIRECTORY</p>
          <h1>รายการห้องเรียน</h1>
          <p className="muted">
            ค้นหาห้องที่เหมาะกับจำนวนผู้ใช้และอุปกรณ์ที่ต้องการ
          </p>
        </div>
      </div>
      <section className="card filters">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ค้นหาชื่อห้อง"
        />
        <input
          value={building}
          onChange={(event) => setBuilding(event.target.value)}
          placeholder="อาคาร"
        />
        <input
          type="number"
          min="1"
          value={minCapacity}
          onChange={(event) => setMinCapacity(event.target.value)}
          placeholder="ความจุขั้นต่ำ"
        />
        <button className="primary" onClick={load}>
          ค้นหา
        </button>
      </section>
      {error && <p className="alert error">{error}</p>}
      {loading ? (
        <div className="empty">กำลังโหลดห้องเรียน...</div>
      ) : rooms.length === 0 ? (
        <div className="empty">ไม่พบห้องเรียนตามเงื่อนไข</div>
      ) : (
        <div className="room-grid">
          {rooms.map((room) => (
            <article className="card room-card" key={room.id}>
              {room.imageUrl ? (
                <img
                  className="room-image"
                  src={room.imageUrl}
                  alt={room.name}
                />
              ) : (
                <div className="room-placeholder">{room.name}</div>
              )}
              <div className="room-content">
                <div className="section-heading">
                  <h2>{room.name}</h2>
                  <span className="status status-available">AVAILABLE</span>
                </div>
                <p>
                  {room.building} · ชั้น {room.floor}
                </p>
                <p>
                  รองรับสูงสุด <strong>{room.capacity}</strong> คน
                </p>
                <div className="chips">
                  {(room.equipment || []).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <button
                  className="primary full"
                  onClick={() => setSelected(room)}
                >
                  จองห้องนี้
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {selected && (
        <BookingForm
          room={selected}
          close={() => setSelected(null)}
          onBooked={onBooked}
        />
      )}
    </>
  );
}

export function BookingForm({
  room,
  close,
  onBooked,
  initialStartAt = "",
  initialEndAt = "",
}: {
  room: Classroom;
  close: () => void;
  onBooked: (booking: Booking) => void;
  initialStartAt?: string;
  initialEndAt?: string;
}) {
  const [purpose, setPurpose] = useState("");
  const [attendeeCount, setAttendeeCount] = useState(1);
  const [requestedEquipment, setRequestedEquipment] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [userId, setUserId] = useState("");
  const [directory, setDirectory] = useState<User[]>([]);
  const [startAt, setStartAt] = useState(initialStartAt);
  const [endAt, setEndAt] = useState(initialEndAt);
  const [rules, setRules] = useState<BusinessRules | null>(null);
  const [review, setReview] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const currentUser = JSON.parse(
    localStorage.getItem("user") || "null",
  ) as User | null;
  const canBookForOthers =
    !!currentUser && ["STAFF", "ADMIN"].includes(currentUser.role);
  useEffect(() => {
    get<BusinessRules>("/config/business-rules")
      .then(setRules)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (canBookForOthers)
      get<User[]>("/users/directory?limit=100")
        .then(setDirectory)
        .catch((error) => setMessage(error.message));
  }, [canBookForOthers]);
  const toggleEquipment = (item: string) =>
    setRequestedEquipment((current) =>
      current.includes(item)
        ? current.filter((value) => value !== item)
        : [...current, item],
    );
  const iso = (value: string) => new Date(value).toISOString();
  const reviewBooking = async () => {
    setMessage("");
    if (!purpose.trim() || !startAt || !endAt || attendeeCount < 1)
      return setMessage("กรุณากรอกข้อมูลที่จำเป็นให้ครบ");
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (end <= start || start <= new Date())
      return setMessage("ช่วงเวลาจองไม่ถูกต้อง");
    if (
      rules &&
      end.getTime() - start.getTime() >
        rules.bookingMaxDurationHours * 3_600_000
    )
      return setMessage(
        `จองได้สูงสุด ${rules.bookingMaxDurationHours} ชั่วโมงต่อครั้ง`,
      );
    setLoading(true);
    try {
      const result = await get<{ available: boolean }>(
        `/classrooms/${room.id}/availability?startAt=${encodeURIComponent(iso(startAt))}&endAt=${encodeURIComponent(iso(endAt))}`,
      );
      if (!result.available)
        return setMessage(
          "ห้องนี้ไม่ว่างในช่วงเวลาที่เลือก กรุณาเลือกเวลาใหม่",
        );
      setReview(true);
    } catch (caught) {
      setMessage((caught as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const confirmBooking = async () => {
    setLoading(true);
    setMessage("");
    try {
      const booking = await post<Booking>("/bookings", {
        classroomId: room.id,
        purpose: purpose.trim(),
        attendeeCount,
        requestedEquipment,
        description: description.trim() || undefined,
        startAt: iso(startAt),
        endAt: iso(endAt),
        ...(userId ? { userId } : {}),
      });
      onBooked(booking);
    } catch (caught) {
      setReview(false);
      setMessage((caught as Error).message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="card booking-modal">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {review ? "CONFIRM BOOKING" : "NEW BOOKING"}
            </p>
            <h2>{review ? "ตรวจสอบข้อมูลก่อนยืนยัน" : `จอง ${room.name}`}</h2>
          </div>
          <button className="icon-button" onClick={close}>
            ×
          </button>
        </div>
        {!review ? (
          <div className="form-grid">
            <label>
              วัตถุประสงค์ *
              <input
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                maxLength={255}
              />
            </label>
            <label>
              จำนวนผู้ใช้งาน *
              <input
                min="1"
                max={room.capacity}
                type="number"
                value={attendeeCount}
                onChange={(event) =>
                  setAttendeeCount(Number(event.target.value))
                }
              />
              <small>ไม่เกิน {room.capacity} คน</small>
            </label>
            {canBookForOthers && (
              <label className="span-2">
                จองให้ผู้ใช้งาน
                <select
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                >
                  <option value="">จองให้ตัวเอง ({currentUser?.name})</option>
                  {directory
                    .filter((person) => person.id !== currentUser?.id)
                    .map((person) => (
                      <option value={person.id} key={person.id}>
                        {person.name} · {person.email}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <label>
              เวลาเริ่ม *
              <input
                type="datetime-local"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
              />
            </label>
            <label>
              เวลาสิ้นสุด *
              <input
                type="datetime-local"
                value={endAt}
                onChange={(event) => setEndAt(event.target.value)}
              />
            </label>
            <label className="span-2">
              รายละเอียดเพิ่มเติม
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={5000}
              />
            </label>
            <fieldset className="span-2">
              <legend>อุปกรณ์ที่ต้องการ</legend>
              {(room.equipment || []).length === 0 ? (
                <span className="muted">ห้องนี้ไม่ได้ระบุอุปกรณ์</span>
              ) : (
                (room.equipment || []).map((item) => (
                  <label className="check" key={item}>
                    <input
                      type="checkbox"
                      checked={requestedEquipment.includes(item)}
                      onChange={() => toggleEquipment(item)}
                    />
                    {item}
                  </label>
                ))
              )}
            </fieldset>
          </div>
        ) : (
          <div className="review">
            <div>
              <span>ห้องเรียน</span>
              <strong>
                {room.name} · {room.building}
              </strong>
            </div>
            <div>
              <span>วันและเวลา</span>
              <strong>
                {new Date(startAt).toLocaleString("th-TH")} –{" "}
                {new Date(endAt).toLocaleString("th-TH")}
              </strong>
            </div>
            <div>
              <span>จำนวนผู้ใช้งาน</span>
              <strong>{attendeeCount} คน</strong>
            </div>
            <div>
              <span>วัตถุประสงค์</span>
              <strong>{purpose}</strong>
            </div>
            <div>
              <span>อุปกรณ์</span>
              <strong>{requestedEquipment.join(", ") || "ไม่ระบุ"}</strong>
            </div>
            {userId && (
              <div>
                <span>จองแทน</span>
                <strong>
                  {directory.find((person) => person.id === userId)?.name ||
                    userId}
                </strong>
              </div>
            )}
            <p className="alert">
              ระบบจะตรวจสอบห้องว่างอีกครั้งเมื่อกดยืนยัน และสร้างสถานะ PENDING
            </p>
          </div>
        )}
        {message && <p className="alert error">{message}</p>}
        <div className="modal-actions">
          {review ? (
            <>
              <button onClick={() => setReview(false)}>ย้อนกลับ</button>
              <button
                className="primary"
                disabled={loading}
                onClick={confirmBooking}
              >
                {loading ? "กำลังยืนยัน..." : "ยืนยันการจอง"}
              </button>
            </>
          ) : (
            <>
              <button onClick={close}>ยกเลิก</button>
              <button
                className="primary"
                disabled={loading}
                onClick={reviewBooking}
              >
                {loading ? "กำลังตรวจสอบ..." : "ตรวจสอบข้อมูล"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
