export type User = { id: string; name: string; email: string; role: 'USER'|'STUDENT'|'TEACHER'|'ADMIN'; status: string };
export type Classroom = { id: string; name: string; building: string; floor: string; capacity: number; equipment?: string[]; imageUrl?: string | null; status: string };
export type Booking = { id: string; bookingCode: string; purpose: string; startAt: string; endAt: string; status: string; classroomId: string; classroom?: Classroom; user?: User };
export type Notification = { id: string; title: string; message: string; type: string; isRead: boolean };
