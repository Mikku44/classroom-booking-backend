import { useEffect, useState } from 'react';
import { get, patch } from '../api';
import type { Booking } from '../types';
export function BookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const load = () => { get<Booking[]>('/bookings').then(setItems).catch(() => setItems([])); };
  useEffect(() => { load(); }, []);
  return <><h1>My bookings</h1><div className="card">{items.map(b => <p key={b.id}><b>{b.bookingCode}</b> — {b.classroom?.name || b.classroomId} — <span className="badge">{b.status}</span> {!['CANCELLED','COMPLETED'].includes(b.status) && <button onClick={() => patch('/bookings/' + b.id + '/cancel', {}).then(load)}>Cancel</button>}</p>)}</div></>;
}
