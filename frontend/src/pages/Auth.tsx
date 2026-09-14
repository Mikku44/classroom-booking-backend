import { useState } from "react";
import { post } from "../api";
import type { User } from "../types";

export function LoginPage({
  onLogin,
  onRegister,
}: {
  onLogin: (user: User) => void;
  onRegister: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <div className="auth">
      <form
        className="card auth-card"
        onSubmit={async (event) => {
          event.preventDefault();
          setLoading(true);
          setError("");
          try {
            const result = await post<{ token: string; user: User }>(
              "/auth/login",
              { email, password },
            );
            localStorage.setItem("token", result.token);
            onLogin(result.user);
          } catch (caught) {
            setError((caught as Error).message);
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="auth-logo">CR</div>
        <p className="eyebrow">CLASSROOM RESERVATION</p>
        <h1>เข้าสู่ระบบ</h1>
        <p className="muted">เข้าสู่ระบบเพื่อค้นหาและจองห้องเรียน</p>
        <label>
          อีเมล
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
          />
        </label>
        <label>
          รหัสผ่าน
          <input
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="อย่างน้อย 8 ตัวอักษร"
            autoComplete="current-password"
          />
        </label>
        {error && <p className="alert error">{error}</p>}
        <button className="primary full" disabled={loading}>
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
        <button type="button" className="link full" onClick={onRegister}>
          ยังไม่มีบัญชี? สมัครสมาชิก
        </button>
      </form>
    </div>
  );
}

export function RegisterPage({ onLogin }: { onLogin: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <div className="auth">
      <form
        className="card auth-card"
        onSubmit={async (event) => {
          event.preventDefault();
          setLoading(true);
          setMessage("");
          try {
            await post("/auth/register", { name, email, password, role });
            setMessage("สมัครสมาชิกสำเร็จ กำลังกลับไปหน้าเข้าสู่ระบบ...");
            window.setTimeout(onLogin, 800);
          } catch (caught) {
            setMessage((caught as Error).message);
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="auth-logo">CR</div>
        <p className="eyebrow">CREATE ACCOUNT</p>
        <h1>สมัครสมาชิก</h1>
        <label>
          ชื่อ-นามสกุล
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          ประเภทผู้ใช้งาน
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value as "STUDENT" | "TEACHER")
            }
          >
            <option value="STUDENT">นักศึกษา</option>
            <option value="TEACHER">อาจารย์</option>
          </select>
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
        <label>
          รหัสผ่าน
          <input
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
          />
        </label>
        {message && <p className="alert">{message}</p>}
        <button className="primary full" disabled={loading}>
          {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
        </button>
        <button type="button" className="link full" onClick={onLogin}>
          กลับไปหน้าเข้าสู่ระบบ
        </button>
      </form>
    </div>
  );
}
