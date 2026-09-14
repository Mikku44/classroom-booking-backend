import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/utils/prisma';
describe('Authentication API', () => {
  afterEach(() => jest.restoreAllMocks());
  it('registers a student without returning password data', async () => {
    jest.spyOn(prisma.user, 'create').mockResolvedValue({ id: 101n, name: 'Test Student', email: 'student@test.local', role: 'STUDENT', status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() } as never);
    const response = await request(app).post('/api/auth/register').send({ name: 'Test Student', email: 'student@test.local', password: 'Test12345', role: 'STUDENT' });
    expect(response.status).toBe(201); expect(response.body.data).not.toHaveProperty('password'); expect(response.body.data).not.toHaveProperty('passwordHash'); expect(response.body.data.role).toBe('STUDENT');
  });
  it('returns 409 for a duplicate email', async () => {
    jest.spyOn(prisma.user, 'create').mockRejectedValue(new Error('Unique constraint failed on email'));
    const response = await request(app).post('/api/auth/register').send({ name: 'Duplicate', email: 'duplicate@test.local', password: 'Test12345' });
    expect(response.status).toBe(409);
  });
  it('logs in with valid credentials', async () => {
    const bcrypt = await import('bcryptjs');
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 102n, name: 'Test Student', email: 'login@test.local', passwordHash: await bcrypt.hash('Test12345', 4), role: 'STUDENT', status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() } as never);
    const response = await request(app).post('/api/auth/login').send({ email: 'login@test.local', password: 'Test12345' });
    expect(response.status).toBe(200); expect(response.body.data.token).toEqual(expect.any(String)); expect(response.body.data.user).not.toHaveProperty('passwordHash');
  });
  it('rejects an invalid login', async () => { jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null); const response = await request(app).post('/api/auth/login').send({ email: 'missing@test.local', password: 'Wrong12345' }); expect(response.status).toBe(401); });
  it('rejects invalid registration input', async () => { const response = await request(app).post('/api/auth/register').send({ name: '', email: 'not-an-email', password: 'short' }); expect(response.status).toBe(400); expect(response.body.errors).toEqual(expect.any(Array)); });
});
