import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { prisma } from '../src/utils/prisma';
import { env } from '../src/config/env';

const token = () => jwt.sign({ id: '10', role: 'STUDENT', email: 'test@test.local' }, env.JWT_SECRET);
const payload = { classroomId: '3', purpose: 'API test', startAt: '2099-01-01T09:00:00.000Z', endAt: '2099-01-01T10:00:00.000Z' };

describe('Booking API', () => {
  beforeEach(() => {
    jest.spyOn(prisma, '$transaction').mockImplementation((async (callback: (client: typeof prisma) => unknown) => callback(prisma)) as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it('creates a pending booking', async () => {
    jest.spyOn(prisma.classroom, 'findUnique').mockResolvedValue({ id: 3n, status: 'AVAILABLE' } as never);
    jest.spyOn(prisma.booking, 'findFirst').mockResolvedValue(null);
    jest.spyOn(prisma.booking, 'create').mockResolvedValue({ id: 201n, bookingCode: 'BK-test', userId: 10n, classroomId: 3n, purpose: payload.purpose, description: null, startAt: new Date(payload.startAt), endAt: new Date(payload.endAt), status: 'PENDING', adminNote: null, approvedBy: null, approvedAt: null, createdAt: new Date(), updatedAt: new Date() } as never);
    const response = await request(app).post('/api/bookings').set('Authorization', 'Bearer ' + token()).send(payload);
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('PENDING');
  });
  it('returns 409 for a conflicting time', async () => {
    jest.spyOn(prisma.classroom, 'findUnique').mockResolvedValue({ id: 3n, status: 'AVAILABLE' } as never);
    jest.spyOn(prisma.booking, 'findFirst').mockResolvedValue({ id: 200n } as never);
    const response = await request(app).post('/api/bookings').set('Authorization', 'Bearer ' + token()).send(payload);
    expect(response.status).toBe(409);
  });
  it('returns 400 for an inactive classroom', async () => {
    jest.spyOn(prisma.classroom, 'findUnique').mockResolvedValue({ id: 3n, status: 'INACTIVE' } as never);
    const response = await request(app).post('/api/bookings').set('Authorization', 'Bearer ' + token()).send(payload);
    expect(response.status).toBe(400);
  });
  it('returns 400 for an invalid time range', async () => {
    const response = await request(app).post('/api/bookings').set('Authorization', 'Bearer ' + token()).send({ ...payload, startAt: '2099-01-01T10:00:00.000Z', endAt: '2099-01-01T09:00:00.000Z' });
    expect(response.status).toBe(400);
  });
});
