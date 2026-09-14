import { useEffect, useState } from 'react';
import { downloadReport, get, patch, post, remove, uploadImage } from '../api';
import type { Booking, Classroom, User } from '../types';

type Tab = 'dashboard' | 'classrooms' | 'bookings' | 'users' | 'reports';
export function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  return <>
    <h1>Admin panel</h1>
    <div className="admin-tabs">
      {(['dashboard', 'classrooms', 'bookings', 'users', 'reports'] as Tab[]).map((item) =>
        <button className={tab === item ? 'primary' : ''} key={item} onClick={() => setTab(item)}>{item}</button>)}
    </div>
    {tab === 'dashboard' && <AdminDashboard />}
    {tab === 'classrooms' && <AdminClassrooms />}
    {tab === 'bookings' && <AdminBookings />}
    {tab === 'users' && <AdminUsers />}
    {tab === 'reports' && <AdminReports />}
  </>;
}

function AdminDashboard() {
  const [summary, setSummary] = useState<Record<string, number>>({});
  useEffect(() => { get<Record<string, number>>('/admin/dashboard/summary').then(setSummary); }, []);
  return <div className="grid">{Object.entries(summary).filter(([, value]) => typeof value === 'number').map(([key, value]) => <div className="stat" key={key}><span>{key}</span><strong>{value}</strong></div>)}</div>;
}

function AdminClassrooms() {
  const [rooms, setRooms] = useState<Classroom[]>([]);
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [capacity, setCapacity] = useState(30);
  const [file, setFile] = useState<File | null>(null);
  const [roomId, setRoomId] = useState('');
  const [message, setMessage] = useState('');
  const load = () => { get<Classroom[]>('/admin/classrooms?limit=100').then(setRooms); };
  useEffect(load, []);
  const addRoom = async () => {
    await post('/admin/classrooms', { name, building, floor, capacity, equipment: [] });
    setName(''); setBuilding(''); setFloor(''); load();
  };
  const upload = async () => {
    if (!file || !roomId) return;
    try {
      const image = await uploadImage(file);
      await patch('/admin/classrooms/' + roomId, { imageUrl: image.url });
      setMessage('อัปโหลดและผูกรูปกับห้องสำเร็จ');
      load();
    } catch (error) { setMessage((error as Error).message); }
  };
  return <>
    <section className="card">
      <h2>เพิ่มห้องเรียน</h2>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อห้อง" />
      <input value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="อาคาร" />
      <input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="ชั้น" />
      <input value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} type="number" placeholder="ความจุ" />
      <button className="primary" onClick={addRoom}>เพิ่มห้อง</button>
    </section>
    <section className="card">
      <h2>อัปโหลดรูปห้องเรียน</h2>
      <select value={roomId} onChange={(e) => setRoomId(e.target.value)}><option value="">เลือกห้อง</option>{rooms.map((room) => <option value={room.id} key={room.id}>{room.name}</option>)}</select>
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button className="primary" disabled={!file || !roomId} onClick={upload}>Upload</button>
      <p>{message}</p>
    </section>
    <div className="cards">{rooms.map((room) => <article className="card" key={room.id}>{room.imageUrl && <img className="room-image" src={room.imageUrl} alt={room.name} />}<h3>{room.name}</h3><p>{room.building} / {room.status}</p><button onClick={() => patch('/admin/classrooms/' + room.id + '/status', { status: room.status === 'AVAILABLE' ? 'INACTIVE' : 'AVAILABLE' }).then(load)}>เปลี่ยนสถานะ</button><button onClick={() => remove('/admin/classrooms/' + room.id).then(load)}>ปิดใช้งาน</button></article>)}</div>
  </>;
}

function AdminBookings() {
  const [items, setItems] = useState<Booking[]>([]);
  const load = () => { get<Booking[]>('/admin/bookings?limit=100').then(setItems); };
  useEffect(load, []);
  return <section className="card"><h2>จัดการการจอง</h2>{items.map((booking) => <p key={booking.id}><b>{booking.bookingCode}</b> — {booking.status} {booking.status === 'PENDING' && <><button onClick={() => patch('/admin/bookings/' + booking.id + '/approve', {}).then(load)}>Approve</button><button onClick={() => patch('/admin/bookings/' + booking.id + '/reject', { adminNote: 'ไม่อนุมัติ' }).then(load)}>Reject</button></>}</p>)}</section>;
}

function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const load = () => { get<User[]>('/admin/users?limit=100').then(setUsers); };
  useEffect(load, []);
  return <section className="card"><h2>จัดการผู้ใช้งาน</h2>{users.map((user) => <p key={user.id}>{user.name} — {user.email} — {user.role}/{user.status}<button onClick={() => patch('/admin/users/' + user.id + '/status', { status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }).then(load)}>เปลี่ยนสถานะ</button></p>)}</section>;
}

function AdminReports() {
  const [report, setReport] = useState<unknown>(null);
  useEffect(() => { get('/admin/reports/summary').then(setReport); }, []);
  return <section className="card"><h2>รายงานและสถิติ</h2><pre>{JSON.stringify(report, null, 2)}</pre><button className="primary" onClick={() => downloadReport()}>Export CSV</button></section>;
}
