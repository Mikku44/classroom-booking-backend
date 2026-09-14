import { useEffect, useState } from "react";
import { get, post } from "../api";
import type { Booking, Classroom, User } from "../types";

export function ClassroomsPage() {
  const [rooms, setRooms] = useState<Classroom[]>([]);
  const [selected, setSelected] = useState<Classroom | null>(null);
  const load = (query = "") =>
    get<Classroom[]>("/classrooms" + query)
      .then(setRooms)
      .catch(() => setRooms([]));
  useEffect(() => {
    load();
  }, []);
  return (
    <>
      <h1>Classrooms</h1>
      <input
        placeholder="ค้นหาชื่อห้อง"
        onChange={(event) =>
          load("?search=" + encodeURIComponent(event.target.value))
        }
      />
      <div className="cards">
        {rooms.map((room) => (
          <article className="card" key={room.id}>
            {room.imageUrl && (
              <img className="room-image" src={room.imageUrl} alt={room.name} />
            )}
            <h2>{room.name}</h2>
            <p>
              {room.building} ชั้น {room.floor}
            </p>
            <p>รองรับ {room.capacity} คน</p>
            <button className="primary" onClick={() => setSelected(room)}>
              จองห้องนี้
            </button>
          </article>
        ))}
      </div>
      {selected && (
        <BookingForm room={selected} close={() => setSelected(null)} />
      )}
    </>
  );
}

function BookingForm({ room, close }: { room: Classroom; close: () => void }) {
  const [purpose, setPurpose] = useState("");
  const [attendeeCount, setAttendeeCount] = useState(1);
  const [requestedEquipment, setRequestedEquipment] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [userId, setUserId] = useState("");
  const [startAt, setStart] = useState("");
  const [endAt, setEnd] = useState("");
  const [message, setMessage] = useState("");
  const currentUser = JSON.parse(
    localStorage.getItem("user") || "null",
  ) as User | null;
  const canBookForOthers =
    currentUser && ["STAFF", "ADMIN"].includes(currentUser.role);
  const toggleEquipment = (item: string) =>
    setRequestedEquipment((current) =>
      current.includes(item)
        ? current.filter((value) => value !== item)
        : [...current, item],
    );
  return (
    <div className="modal">
      <form
        className="card"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            const booking = await post<Booking>("/bookings", {
              classroomId: room.id,
              purpose,
              attendeeCount,
              requestedEquipment,
              description: description || undefined,
              startAt,
              endAt,
              ...(userId ? { userId } : {}),
            });
            localStorage.setItem("lastBooking", JSON.stringify(booking));
            setMessage("ส่งคำขอจองแล้ว รหัส " + booking.bookingCode);
            setTimeout(close, 900);
          } catch (error) {
            setMessage((error as Error).message);
          }
        }}
      >
        <h2>จอง {room.name}</h2>
        <input
          required
          placeholder="วัตถุประสงค์"
          value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
        />
        <input
          required
          min="1"
          max={room.capacity}
          type="number"
          value={attendeeCount}
          onChange={(event) => setAttendeeCount(Number(event.target.value))}
          placeholder="จำนวนผู้ใช้งาน"
        />
        {canBookForOthers && (
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="User ID ที่จองแทน (เว้นว่าง = ตัวเอง)"
          />
        )}
        <fieldset>
          <legend>อุปกรณ์ที่ต้องการ</legend>
          {(room.equipment || []).map((item) => (
            <label key={item}>
              <input
                type="checkbox"
                checked={requestedEquipment.includes(item)}
                onChange={() => toggleEquipment(item)}
              />{" "}
              {item}
            </label>
          ))}
        </fieldset>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="รายละเอียดเพิ่มเติม"
        />
        <input
          required
          type="datetime-local"
          value={startAt}
          onChange={(event) => setStart(event.target.value)}
        />
        <input
          required
          type="datetime-local"
          value={endAt}
          onChange={(event) => setEnd(event.target.value)}
        />
        <p>{message}</p>
        <button className="primary">Submit</button>
        <button type="button" onClick={close}>
          Cancel
        </button>
      </form>
    </div>
  );
}
