import { useEffect, useState } from "react";
import { get } from "../api";
import type { Booking, BusinessRules, User } from "../types";

export function DashboardPage({
  user,
  navigate,
}: {
  user: User;
  navigate: (page: string) => void;
}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rules, setRules] = useState<BusinessRules | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const scope = user.role === "ADMIN" ? "?scope=all&limit=100" : "?limit=100";
    Promise.all([
      get<Booking[]>("/bookings" + scope),
      get<BusinessRules>("/config/business-rules"),
    ])
      .then(([items, businessRules]) => {
        setBookings(items);
        setRules(businessRules);
      })
      .catch((caught) => setError(caught.message));
  }, [user.role]);
  const count = (status: string) =>
    bookings.filter((booking) => booking.status === status).length;
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>สวัสดี, {user.name}</h1>
          <p className="muted">
            ติดตามสถานะการจองและเริ่มต้นใช้งานได้จากที่นี่
          </p>
        </div>
        <button className="primary" onClick={() => navigate("classrooms")}>
          + จองห้องเรียน
        </button>
      </div>
      {error && <p className="alert error">{error}</p>}
      <div className="stats-grid">
        <div className="stat">
          <span>การจองทั้งหมด</span>
          <strong>{bookings.length}</strong>
        </div>
        <div className="stat pending">
          <span>รออนุมัติ</span>
          <strong>{count("PENDING")}</strong>
        </div>
        <div className="stat confirmed">
          <span>อนุมัติแล้ว</span>
          <strong>{count("CONFIRMED")}</strong>
        </div>
        <div className="stat in-use">
          <span>กำลังใช้งาน</span>
          <strong>{count("IN_USE")}</strong>
        </div>
      </div>
      <div className="two-column">
        <section className="card">
          <div className="section-heading">
            <h2>รายการล่าสุด</h2>
            <button className="link" onClick={() => navigate("bookings")}>
              ดูทั้งหมด
            </button>
          </div>
          {bookings.length === 0 ? (
            <div className="empty">ยังไม่มีรายการจอง</div>
          ) : (
            bookings.slice(0, 5).map((booking) => (
              <div className="list-row" key={booking.id}>
                <div>
                  <strong>{booking.bookingCode}</strong>
                  <small>
                    {booking.classroom?.name || booking.classroomId} ·{" "}
                    {new Date(booking.startAt).toLocaleString("th-TH")}
                  </small>
                </div>
                <span
                  className={`status status-${booking.status.toLowerCase()}`}
                >
                  {booking.status}
                </span>
              </div>
            ))
          )}
        </section>
        <section className="card">
          <h2>กฎการจอง</h2>
          {rules && (
            <div className="rule-list">
              <p>
                <strong>{rules.bookingMaxAdvanceDays} วัน</strong>
                <span>จองล่วงหน้าได้สูงสุด</span>
              </p>
              <p>
                <strong>{rules.bookingMaxDurationHours} ชม.</strong>
                <span>ระยะเวลาต่อครั้ง</span>
              </p>
              <p>
                <strong>{rules.bookingCancelMinutes} นาที</strong>
                <span>ยกเลิกล่วงหน้าอย่างน้อย</span>
              </p>
              <p>
                <strong>{rules.bookingReminderMinutes} นาที</strong>
                <span>แจ้งเตือนก่อนใช้งาน</span>
              </p>
            </div>
          )}
          <button onClick={() => navigate("schedule")}>
            ดูตารางการใช้ห้อง
          </button>
        </section>
      </div>
    </>
  );
}
