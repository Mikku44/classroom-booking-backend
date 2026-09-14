import { useEffect, useState } from "react";
import { get, patch } from "../api";
import { bookingStatusLabel, formatDateTime, statusClass } from "../format";
import type { Notification } from "../types";

export function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      setItems(
        await get<Notification[]>(
          `/notifications?limit=100${filter === "unread" ? "&isRead=false" : ""}`,
        ),
      );
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [filter]);
  const mark = async (path: string) => {
    try {
      await patch(path);
      window.dispatchEvent(new Event("notifications-changed"));
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">IN-APP NOTIFICATIONS</p>
          <h1>การแจ้งเตือน</h1>
          <p className="muted">
            รับทราบการสร้าง แก้ไข อนุมัติ ยกเลิก และการเตือนก่อนใช้งานห้อง
          </p>
        </div>
        <button
          className="primary"
          disabled={!items.some((item) => !item.isRead)}
          onClick={() => void mark("/notifications/read-all")}
        >
          อ่านทั้งหมด
        </button>
      </div>
      <div className="tabs">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          ทั้งหมด
        </button>
        <button
          className={filter === "unread" ? "active" : ""}
          onClick={() => setFilter("unread")}
        >
          ยังไม่อ่าน
        </button>
      </div>
      {message && <p className="alert error">{message}</p>}
      {loading ? (
        <div className="empty">กำลังโหลดการแจ้งเตือน...</div>
      ) : items.length === 0 ? (
        <div className="empty">ไม่มีการแจ้งเตือนในขณะนี้</div>
      ) : (
        <div className="notification-list">
          {items.map((item) => (
            <article
              className={`card notification ${item.isRead ? "" : "unread"}`}
              key={item.id}
            >
              <div className="notification-dot" />
              <div>
                <div className="section-heading">
                  <h3>{item.title}</h3>
                  <time>{formatDateTime(item.createdAt)}</time>
                </div>
                <p>{item.message}</p>
                {item.booking && (
                  <div className="notification-booking">
                    <strong>{item.booking.bookingCode}</strong>
                    <span>
                      {item.booking.classroom?.name} ·{" "}
                      {formatDateTime(item.booking.startAt)}
                    </span>
                    <span className={statusClass(item.booking.status)}>
                      {bookingStatusLabel[item.booking.status]}
                    </span>
                  </div>
                )}
                {!item.isRead && (
                  <button
                    className="link"
                    onClick={() => void mark(`/notifications/${item.id}/read`)}
                  >
                    ทำเครื่องหมายว่าอ่านแล้ว
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
