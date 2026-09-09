import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './app.js';

describe('application server', () => {
  it('reports that the service is healthy', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('requires a session for application data', async () => {
    const response = await request(app).get('/api/applications');
    expect(response.status).toBe(401);
  });
});
