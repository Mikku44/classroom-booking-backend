import { useEffect, useState } from "react";
import { get } from "../api";
import type { Classroom } from "../types";

type Conflict = {
  id: string;
  bookingCode: string;
  startAt: string;
  endAt: string;
  status: string;
};
type AvailabilityRoom = Classroom & {
  available: boolean;
  conflicts: Conflict[];
};
type AvailabilityResult = {
  room: Classroom;
  available: boolean;
  conflicts: Conflict[];
};

export function SchedulePage() {
  const [rooms, setRooms] = useState<Classroom[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [results, setResults] = useState<AvailabilityResult[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    get<Classroom[]>("/classrooms?page=1&limit=100")
      .then(setRooms)
      .catch((error) => setMessage(error.message));
  }, []);

  const toggleRoom = (roomId: string) => {
    setSelectedIds((current) =>
      current.includes(roomId)
        ? current.filter((id) => id !== roomId)
        : [...current, roomId],
    );
    setResults([]);
  };

  const checkAvailability = async () => {
    setLoading(true);
    setMessage("");
    setResults([]);
    try {
      const query =
        "?startAt=" +
        encodeURIComponent(new Date(startAt).toISOString()) +
        "&endAt=" +
        encodeURIComponent(new Date(endAt).toISOString()) +
        "&classroomIds=" +
        selectedIds.join(",");
      const data = await get<{ rooms: AvailabilityRoom[] }>(
        "/classrooms/availability" + query,
      );
      setResults(
        data.rooms.map((room) => ({
          room,
          available: room.available,
          conflicts: room.conflicts,
        })),
      );
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1>ตารางการใช้ห้อง</h1>
      <section className="card">
        <div className="schedule-heading">
          <h2>ห้องเรียนทั้งหมด ({rooms.length})</h2>
          <span>เลือกแล้ว {selectedIds.length} ห้อง</span>
        </div>
        <button onClick={() => setSelectedIds(rooms.map((room) => room.id))}>
          เลือกทั้งหมด
        </button>
        <button
          onClick={() => {
            setSelectedIds([]);
            setResults([]);
          }}
        >
          ล้างการเลือก
        </button>
        {rooms.length === 0 && <p>ไม่พบห้องเรียนที่เปิดใช้งาน</p>}
        <div className="cards">
          {rooms.map((room) => {
            const selected = selectedIds.includes(room.id);
            return (
              <button
                className={selected ? "card selected-room" : "card"}
                key={room.id}
                aria-pressed={selected}
                onClick={() => toggleRoom(room.id)}
              >
                <span className="room-check">
                  {selected ? "✓ เลือกแล้ว" : "เลือกห้อง"}
                </span>
                <br />
                <b>{room.name}</b>
                <br />
                {room.building} ชั้น {room.floor}
                <br />
                รองรับ {room.capacity} คน
                <br />
                <span className="badge">{room.status}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2>ตรวจสอบช่วงเวลาการใช้ห้อง</h2>
        <p>ระบบจะตรวจสอบพร้อมกันทั้ง {selectedIds.length} ห้องที่เลือก</p>
        <input
          type="datetime-local"
          value={startAt}
          onChange={(event) => setStartAt(event.target.value)}
        />
        <input
          type="datetime-local"
          value={endAt}
          onChange={(event) => setEndAt(event.target.value)}
        />
        <button
          className="primary"
          disabled={loading || selectedIds.length === 0 || !startAt || !endAt}
          onClick={checkAvailability}
        >
          {loading ? "กำลังตรวจสอบ..." : "ตรวจสอบห้องว่าง"}
        </button>
        {message && <p className="error">{message}</p>}
      </section>

      {results.length > 0 && (
        <section className="card">
          <h2>ผลการตรวจสอบ</h2>
          <div className="cards">
            {results.map((result) => (
              <article className="card" key={result.room.id}>
                <h3>{result.room.name}</h3>
                <p>
                  {result.room.building} ชั้น {result.room.floor}
                </p>
                <p className={result.available ? "available" : "unavailable"}>
                  {result.available
                    ? "ว่าง — สามารถจองได้"
                    : "ไม่ว่างในช่วงเวลานี้"}
                </p>
                {result.conflicts.map((booking) => (
                  <small key={booking.id}>
                    {booking.bookingCode}:{" "}
                    {new Date(booking.startAt).toLocaleString()}–
                    {new Date(booking.endAt).toLocaleTimeString()} (
                    {booking.status})<br />
                  </small>
                ))}
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
