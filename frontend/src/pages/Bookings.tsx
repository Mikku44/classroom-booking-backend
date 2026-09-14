import { useEffect, useState } from "react";
import { get, patch, post } from "../api";
import type { Booking } from "../types";

export function BookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [message, setMessage] = useState("");
  const load = () => {
    get<Booking[]>("/bookings")
      .then(setItems)
      .catch((error) => setMessage(error.message));
  };
  useEffect(() => {
    load();
  }, []);
  const action = async (request: Promise<unknown>) => {
    try {
      await request;
      setMessage("ดำเนินการสำเร็จ");
      load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };
  return (
    <>
      <h1>ประวัติการจอง</h1>
      {message && <p>{message}</p>}
      <div className="cards">
        {items.map((booking) => (
          <article className="card" key={booking.id}>
            <h3>{booking.bookingCode}</h3>
            <p>
              {booking.classroom?.name || booking.classroomId} —{" "}
              <span className="badge">{booking.status}</span>
            </p>
            <p>
              {new Date(booking.startAt).toLocaleString()}–
              {new Date(booking.endAt).toLocaleTimeString()}
            </p>
            <p>จำนวน {booking.attendeeCount} คน</p>
            {!!booking.requestedEquipment?.length && (
              <p>อุปกรณ์: {booking.requestedEquipment.join(", ")}</p>
            )}
            {booking.cancelReason && (
              <p>เหตุผลยกเลิก: {booking.cancelReason}</p>
            )}
            {["PENDING", "CONFIRMED"].includes(booking.status) && (
              <button
                onClick={() =>
                  action(
                    patch("/bookings/" + booking.id + "/cancel", {
                      reason: "ยกเลิกโดยผู้จอง",
                    }),
                  )
                }
              >
                Cancel
              </button>
            )}
            {booking.status === "CONFIRMED" && (
              <button
                className="primary"
                onClick={() =>
                  action(post("/bookings/" + booking.id + "/check-in", {}))
                }
              >
                Check-in
              </button>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
