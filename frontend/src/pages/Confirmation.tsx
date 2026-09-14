import { bookingStatusLabel, formatDateTime, statusClass } from "../format";
import type { Booking } from "../types";

export function ConfirmationPage({
  booking,
  onBack,
  onNew,
}: {
  booking: Booking;
  onBack: () => void;
  onNew: () => void;
}) {
  return (
    <div className="confirmation-wrap">
      <section className="card confirmation">
        <div className="success-icon">✓</div>
        <p className="eyebrow">REQUEST RECEIVED</p>
        <h1>ส่งคำขอจองสำเร็จ</h1>
        <p className="muted">
          ระบบบันทึกคำขอแล้ว กรุณารอผู้ดูแลอนุมัติและติดตามผลผ่านการแจ้งเตือน
        </p>
        <div className="confirmation-code">
          <span>รหัสการจอง</span>
          <strong>{booking.bookingCode}</strong>
        </div>
        <div className="detail-grid">
          <div>
            <span>ห้องเรียน</span>
            <strong>{booking.classroom?.name || booking.classroomId}</strong>
          </div>
          <div>
            <span>สถานะ</span>
            <strong>
              <span className={statusClass(booking.status)}>
                {bookingStatusLabel[booking.status]}
              </span>
            </strong>
          </div>
          <div>
            <span>วันและเวลา</span>
            <strong>
              {formatDateTime(booking.startAt)} –{" "}
              {formatDateTime(booking.endAt)}
            </strong>
          </div>
          <div>
            <span>จำนวนผู้ใช้งาน</span>
            <strong>{booking.attendeeCount} คน</strong>
          </div>
          <div>
            <span>วัตถุประสงค์</span>
            <strong>{booking.purpose}</strong>
          </div>
          <div>
            <span>อุปกรณ์</span>
            <strong>
              {booking.requestedEquipment?.join(", ") || "ไม่ระบุ"}
            </strong>
          </div>
        </div>
        {booking.description && <p className="note">{booking.description}</p>}
        <div className="confirmation-actions">
          <button onClick={onNew}>จองห้องอื่น</button>
          <button className="primary" onClick={onBack}>
            ดูประวัติการจอง
          </button>
        </div>
      </section>
    </div>
  );
}
