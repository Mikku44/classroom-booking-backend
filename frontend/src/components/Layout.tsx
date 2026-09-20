import { useEffect, useState, type ReactNode } from "react";
import { get } from "../api";
import type { User } from "../types";

const roleLabel = {
  USER: "ผู้ใช้งาน",
  STUDENT: "นักศึกษา",
  TEACHER: "อาจารย์",
  ADMIN: "ผู้ดูแลระบบ",
};

export function Layout({
  user,
  page,
  navigate,
  signOut,
  children,
}: {
  user: User;
  page: string;
  navigate: (page: string) => void;
  signOut: () => void;
  children: ReactNode;
}) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const load = () =>
      get<{ count: number }>("/notifications/unread-count")
        .then((data) => setUnread(data.count))
        .catch(() => undefined);
    load();
    const timer = window.setInterval(load, 30_000);
    window.addEventListener("notifications-changed", load);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("notifications-changed", load);
    };
  }, [page]);
  const links = [
    ["dashboard", "ภาพรวม"],
    ["classrooms", "รายการห้องเรียน"],
    ["schedule", "ตารางการใช้ห้อง"],
    ["bookings", user.role === "ADMIN" ? "รายการจองทั้งหมด" : "ประวัติการจอง"],
    ["notifications", `การแจ้งเตือน${unread ? ` (${unread})` : ""}`],
    ["profile", "โปรไฟล์"],
    ...(user.role === "ADMIN" ? [["admin", "จัดการระบบ"]] : []),
  ];
  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <span className="brand-mark">CR</span>
          <div>
            <h2>Classroom</h2>
            <small>Reservation System</small>
          </div>
        </div>
        <div className="account">
          <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{user.name}</strong>
            <small>{roleLabel[user.role]}</small>
          </div>
        </div>
        <nav>
          {links.map(([target, label]) => (
            <button
              className={
                page === target ||
                (page === "confirmation" && target === "bookings")
                  ? "nav active"
                  : "nav"
              }
              onClick={() => navigate(target)}
              key={target}
            >
              {label}
            </button>
          ))}
        </nav>
        <button className="nav logout" onClick={signOut}>
          ออกจากระบบ
        </button>
      </aside>
      <main>
        <header>
          <div>
            <small>ระบบจองห้องเรียน</small>
            <strong>{roleLabel[user.role]}</strong>
          </div>
          <span className={`badge role-${user.role.toLowerCase()}`}>
            {user.role}
          </span>
        </header>
        {children}
      </main>
    </div>
  );
}
