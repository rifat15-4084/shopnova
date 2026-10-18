import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import { createApp } from '../app.js';
import { User } from '../models/User.js';

const app = createApp();

async function registerUser(overrides: Partial<{ name: string; email: string; password: string }> = {}) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: overrides.name ?? 'Test User',
      email: overrides.email ?? `user-${Math.random().toString(36).slice(2)}@test.dev`,
      password: overrides.password ?? 'Password123',
    })
    .expect(201);
  return res.body as { user: { id: string; role: string }; accessToken: string };
}

describe('auth', () => {
  it('registers a customer and returns an access token + refresh cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@test.dev', password: 'Password123' })
      .expect(201);

    expect(res.body.user.email).toBe('alice@test.dev');
    expect(res.body.user.role).toBe('customer');
    expect(res.body.accessToken).toBeTruthy();
    const cookies = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    expect(cookies.join(';')).toContain('sn_refresh=');
    expect(cookies.join(';')).toContain('HttpOnly');
    // passwordHash must never leak
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('rejects duplicate emails', async () => {
    await registerUser({ email: 'dupe@test.dev' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dupe', email: 'dupe@test.dev', password: 'Password123' })
      .expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects weak passwords with a validation error', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Weak', email: 'weak@test.dev', password: 'short' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    await registerUser({ email: 'login@test.dev', password: 'Password123' });

    const ok = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.dev', password: 'Password123' })
      .expect(200);
    expect(ok.body.accessToken).toBeTruthy();

    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.dev', password: 'WrongPass1' })
      .expect(401);
    expect(bad.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns /me for an authenticated user and 401 without a token', async () => {
    const { accessToken } = await registerUser();

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body.user.email).toBeTruthy();

    await request(app).get('/api/auth/me').expect(401);
  });

  it('rotates tokens via the refresh cookie', async () => {
    const agent = request.agent(app);
    const res = await agent
      .post('/api/auth/register')
      .send({ name: 'Refresher', email: 'refresh@test.dev', password: 'Password123' })
      .expect(201);
    const firstToken = res.body.accessToken;

    const refreshed = await agent.post('/api/auth/refresh').expect(200);
    expect(refreshed.body.accessToken).toBeTruthy();
    expect(refreshed.body.accessToken).not.toBe(firstToken);

    // The old access token still works until it expires (15m), but the refresh
    // cookie has been rotated — a second refresh with the old cookie fails.
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${refreshed.body.accessToken}`)
      .expect(200);
    expect(me.body.user.email).toBe('refresh@test.dev');
  });

  it('blocks deactivated accounts', async () => {
    const { user, accessToken } = await registerUser({ email: 'off@test.dev' });
    await User.updateOne({ _id: user.id }, { $set: { isActive: false } });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('resets a forgotten password end to end', async () => {
    await registerUser({ email: 'forgot@test.dev', password: 'Password123' });

    const captured: string[] = [];
    const { mailService } = await import('../services/mail.service.js');
    const spy = vi
      .spyOn(mailService, 'send')
      .mockImplementation(async (msg) => {
        captured.push(msg.text);
        return Promise.resolve();
      });

    await request(app).post('/api/auth/forgot-password').send({ email: 'forgot@test.dev' }).expect(200);
    expect(captured.length).toBe(1);
    const link = captured[0].match(/token=([A-Za-z0-9._-]+)/)?.[1];
    expect(link).toBeTruthy();
    spy.mockRestore();

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: link!, password: 'NewPass12345' })
      .expect(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'forgot@test.dev', password: 'NewPass12345' })
      .expect(200);
    expect(login.body.accessToken).toBeTruthy();

    // Old password no longer works
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'forgot@test.dev', password: 'Password123' })
      .expect(401);
  });
});
