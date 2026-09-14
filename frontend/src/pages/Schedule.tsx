import { useEffect, useState } from "react";
import { get } from "../api";
import { BookingForm } from "./Classrooms";
import type { AvailabilityRoom, Booking, Classroom } from "../types";

type ScheduleRoom = Classroom & { bookings: Booking[] };
const localInput = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);

export function SchedulePage({
  onBooked,
}: {
  onBooked: (booking: Booking) => void;
}) {
  const initialStart = new Date();
  initialStart.setMinutes(0, 0, 0);
  initialStart.setHours(initialStart.getHours() + 1);
  const [rooms, setRooms] = useState<Classroom[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startAt, setStartAt] = useState(localInput(initialStart));
  const [endAt, setEndAt] = useState(
    localInput(new Date(initialStart.getTime() + 60 * 60 * 1000)),
  );
  const [availability, setAvailability] = useState<AvailabilityRoom[]>([]);
  const [schedule, setSchedule] = useState<ScheduleRoom[]>([]);
  const [bookingRoom, setBookingRoom] = useState<Classroom | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    get<Classroom[]>("/classrooms?page=1&limit=100")
      .then((items) => {
        setRooms(items);
        setSelectedIds(items.map((room) => room.id));
      })
      .catch((caught) => setMessage(caught.message));
  }, []);
  const query = () =>
    `startAt=${encodeURIComponent(new Date(startAt).toISOString())}&endAt=${encodeURIComponent(new Date(endAt).toISOString())}&classroomIds=${selectedIds.join(",")}`;
  const validate = () => {
    if (!startAt || !endAt || selectedIds.length === 0) {
      setMessage("กรุณาเลือกห้องและช่วงเวลา");
      return false;
    }
    if (new Date(endAt) <= new Date(startAt)) {
      setMessage("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม");
      return false;
    }
    return true;
  };
  const checkAvailability = async () => {
    if (!validate()) return;
    setLoading(true);
    setMessage("");
    try {
      const data = await get<{ rooms: AvailabilityRoom[] }>(
        "/classrooms/availability?" + query(),
      );
      setAvailability(data.rooms);
    } catch (caught) {
      setMessage((caught as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const loadSchedule = async () => {
    if (!validate()) return;
    setLoading(true);
    setMessage("");
    try {
      const data = await get<{ rooms: ScheduleRoom[] }>(
        "/classrooms/schedule?" + query(),
      );
      setSchedule(data.rooms);
    } catch (caught) {
      setMessage((caught as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const toggle = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
    setAvailability([]);
    setSchedule([]);
  };
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">ROOM SCHEDULE</p>
          <h1>ตารางการใช้ห้อง</h1>
          <p className="muted">
            เลือกได้หลายห้อง ตรวจสอบเวลาว่าง และดู Booking ที่ใช้งานห้องอยู่
          </p>
        </div>
      </div>
      <section className="card">
        <div className="section-heading">
          <h2>
            เลือกห้องเรียน ({selectedIds.length}/{rooms.length})
          </h2>
          <div>
            <button
              onClick={() => setSelectedIds(rooms.map((room) => room.id))}
            >
              เลือกทั้งหมด
            </button>
            <button
              onClick={() => {
                setSelectedIds([]);
                setAvailability([]);
                setSchedule([]);
              }}
            >
              ล้าง
            </button>
          </div>
        </div>
        <div className="room-selector">
          {rooms.map((room) => (
            <button
              className={
                selectedIds.includes(room.id)
                  ? "room-pill selected"
                  : "room-pill"
              }
              onClick={() => toggle(room.id)}
              key={room.id}
            >
              <strong>{room.name}</strong>
              <small>
                {room.building} · {room.capacity} คน
              </small>
            </button>
          ))}
        </div>
      </section>
      <section className="card schedule-controls">
        <label>
          เริ่ม
          <input
            type="datetime-local"
            value={startAt}
            onChange={(event) => setStartAt(event.target.value)}
          />
        </label>
        <label>
          สิ้นสุด
          <input
            type="datetime-local"
            value={endAt}
            onChange={(event) => setEndAt(event.target.value)}
          />
        </label>
        <button disabled={loading} onClick={loadSchedule}>
          ดูตาราง
        </button>
        <button
          className="primary"
          disabled={loading}
          onClick={checkAvailability}
        >
          {loading ? "กำลังโหลด..." : "ตรวจห้องว่าง"}
        </button>
      </section>
      {message && <p className="alert error">{message}</p>}
      {availability.length > 0 && (
        <section>
          <div className="section-heading">
            <h2>ผลการตรวจสอบ</h2>
            <span className="muted">
              ว่าง {availability.filter((room) => room.available).length} ห้อง
            </span>
          </div>
          <div className="room-grid">
            {availability.map((room) => (
              <article className="card" key={room.id}>
                <div className="section-heading">
                  <h3>{room.name}</h3>
                  <span
                    className={`status ${room.available ? "status-available" : "status-unavailable"}`}
                  >
                    {room.available ? "ว่าง" : "ไม่ว่าง"}
                  </span>
                </div>
                <p>
                  {room.building} · ชั้น {room.floor}
                </p>
                {room.conflicts.map((booking) => (
                  <div className="conflict" key={booking.id}>
                    {new Date(booking.startAt).toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    –
                    {new Date(booking.endAt).toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {booking.status}
                  </div>
                ))}
                {room.available && (
                  <button
                    className="primary full"
                    onClick={() => setBookingRoom(room)}
                  >
                    จองช่วงเวลานี้
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      {schedule.length > 0 && (
        <section>
          <h2>ตาราง Booking</h2>
          <div className="schedule-table">
            <div className="schedule-head">
              <span>ห้อง</span>
              <span>รายการใช้งาน</span>
            </div>
            {schedule.map((room) => (
              <div className="schedule-row" key={room.id}>
                <div>
                  <strong>{room.name}</strong>
                  <small>{room.building}</small>
                </div>
                <div>
                  {room.bookings.length === 0 ? (
                    <span className="available">ว่างตลอดช่วง</span>
                  ) : (
                    room.bookings.map((booking) => (
                      <div className="booking-slot" key={booking.id}>
                        <strong>{booking.purpose}</strong>
                        <span>
                          {new Date(booking.startAt).toLocaleString("th-TH")} –{" "}
                          {new Date(booking.endAt).toLocaleTimeString("th-TH")}{" "}
                          · {booking.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {bookingRoom && (
        <BookingForm
          room={bookingRoom}
          initialStartAt={startAt}
          initialEndAt={endAt}
          close={() => setBookingRoom(null)}
          onBooked={onBooked}
        />
      )}
    </>
  );
}
