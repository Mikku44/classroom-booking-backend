import { useState } from "react";
import { patch } from "../api";
import { roleLabel } from "../format";
import type { User } from "../types";

export function ProfilePage({
  user,
  onUpdate,
}: {
  user: User;
  onUpdate: (user: User) => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileLoading(true);
    setProfileMessage("");
    try {
      const updated = await patch<User>("/users/me", {
        name: name.trim(),
        email: email.trim(),
      });
      localStorage.setItem("user", JSON.stringify(updated));
      onUpdate(updated);
      setProfileMessage("บันทึกข้อมูลส่วนตัวแล้ว");
    } catch (error) {
      setProfileMessage((error as Error).message);
    } finally {
      setProfileLoading(false);
    }
  };
  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordMessage("");
    if (newPassword !== confirmPassword)
      return setPasswordMessage("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
    setPasswordLoading(true);
    try {
      await patch("/users/me/password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("เปลี่ยนรหัสผ่านแล้ว");
    } catch (error) {
      setPasswordMessage((error as Error).message);
    } finally {
      setPasswordLoading(false);
    }
  };
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">ACCOUNT</p>
          <h1>โปรไฟล์ของฉัน</h1>
          <p className="muted">
            Role: {roleLabel[user.role]} · สถานะ {user.status}
          </p>
        </div>
      </div>
      <div className="two-columns">
        <form className="card" onSubmit={saveProfile}>
          <h2>ข้อมูลส่วนตัว</h2>
          <label>
            ชื่อ
            <input
              required
              maxLength={150}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            อีเมล
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {profileMessage && (
            <p
              className={`alert ${profileMessage.includes("แล้ว") ? "success" : "error"}`}
            >
              {profileMessage}
            </p>
          )}
          <button className="primary" disabled={profileLoading}>
            {profileLoading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </button>
        </form>
        <form className="card" onSubmit={changePassword}>
          <h2>เปลี่ยนรหัสผ่าน</h2>
          <label>
            รหัสผ่านปัจจุบัน
            <input
              required
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>
          <label>
            รหัสผ่านใหม่
            <input
              required
              minLength={8}
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <small>อย่างน้อย 8 ตัวอักษร</small>
          </label>
          <label>
            ยืนยันรหัสผ่านใหม่
            <input
              required
              minLength={8}
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          {passwordMessage && (
            <p
              className={`alert ${passwordMessage.includes("แล้ว") ? "success" : "error"}`}
            >
              {passwordMessage}
            </p>
          )}
          <button className="primary" disabled={passwordLoading}>
            {passwordLoading ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
          </button>
        </form>
      </div>
    </>
  );
}
