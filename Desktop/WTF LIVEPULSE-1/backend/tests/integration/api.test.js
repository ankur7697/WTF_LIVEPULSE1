const request = require('supertest');
const { createApp } = require('../../src/createApp');
const { createMemoryStore } = require('../../src/store/memoryStore');

function createTestHarness() {
  const store = createMemoryStore({
    seed: 9,
    gymCount: 10,
    memberCount: 120,
    days: 20,
    baseCheckins: 90,
    basePayments: 16,
  });

  const app = createApp({ store });
  return { app, store };
}

describe('API routes', () => {
  test('GET /api/gyms returns 10 gyms', async () => {
    const { app } = createTestHarness();
    const response = await request(app).get('/api/gyms').expect(200);

    expect(response.body).toHaveLength(10);
    expect(response.body[0]).toEqual(expect.objectContaining({
      id: expect.any(String),
      name: expect.any(String),
      current_occupancy: expect.any(Number),
      today_revenue: expect.any(Number),
    }));
  });

  test('GET /api/members requires a gym_id filter', async () => {
    const { app } = createTestHarness();
    await request(app).get('/api/members').expect(400);
  });

  test('GET /api/members?gym_id returns gym members', async () => {
    const { app, store } = createTestHarness();
    const [gym] = await store.listGyms();

    const response = await request(app).get(`/api/members?gym_id=${gym.id}`).expect(200);

    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toEqual(expect.objectContaining({
      id: expect.any(String),
      gym_id: gym.id,
      name: expect.any(String),
      plan_type: expect.any(String),
      status: expect.any(String),
    }));
  });

  test('GET /api/gyms/:id/live returns a live snapshot', async () => {
    const { app, store } = createTestHarness();
    const [gym] = await store.listGyms();

    const response = await request(app).get(`/api/gyms/${gym.id}/live`).expect(200);

    expect(response.body).toEqual(expect.objectContaining({
      gym: expect.objectContaining({ id: gym.id, name: gym.name }),
      current_occupancy: expect.any(Number),
      today_revenue: expect.any(Number),
      recent_events: expect.any(Array),
      active_anomalies: expect.any(Array),
    }));
  });

  test('GET /api/gyms/:id/live returns 400 on malformed ids', async () => {
    const { app } = createTestHarness();
    await request(app).get('/api/gyms/not-a-uuid/live').expect(400);
  });

  test('GET /api/gyms/:id/live returns 404 for missing gyms', async () => {
    const { app } = createTestHarness();
    await request(app).get('/api/gyms/00000000-0000-4000-8000-ffffffffffff/live').expect(404);
  });

  test('GET /api/anomalies returns an empty array when no anomalies exist', async () => {
    const { app } = createTestHarness();
    const response = await request(app).get('/api/anomalies').expect(200);

    expect(response.body).toEqual([]);
  });

  test('GET /api/anomalies rejects invalid severity filters', async () => {
    const { app } = createTestHarness();
    await request(app).get('/api/anomalies?severity=urgent').expect(400);
  });

  test('PATCH /api/anomalies/:id/dismiss rejects critical anomalies', async () => {
    const { app, store } = createTestHarness();
    const anomaly = await store.insertAnomaly({
      gym_id: (await store.listGyms())[0].id,
      type: 'capacity_breach',
      severity: 'critical',
      message: 'Critical anomaly',
    });

    await request(app).patch(`/api/anomalies/${anomaly.id}/dismiss`).expect(403);
  });

  test('PATCH /api/anomalies/:id/dismiss resolves warning anomalies', async () => {
    const { app, store } = createTestHarness();
    const anomaly = await store.insertAnomaly({
      gym_id: (await store.listGyms())[0].id,
      type: 'zero_checkins',
      severity: 'warning',
      message: 'Warning anomaly',
    });

    const response = await request(app).patch(`/api/anomalies/${anomaly.id}/dismiss`).expect(200);

    expect(response.body).toEqual(expect.objectContaining({
      id: anomaly.id,
      dismissed: true,
      resolved: true,
    }));
  });

  test('GET /api/gyms/:id/analytics returns analytics payload', async () => {
    const { app, store } = createTestHarness();
    const [gym] = await store.listGyms();

    const response = await request(app).get(`/api/gyms/${gym.id}/analytics?dateRange=30d`).expect(200);

    expect(response.body).toEqual(expect.objectContaining({
      gym: expect.objectContaining({ id: gym.id }),
      date_range: '30d',
      heatmap: expect.any(Array),
      revenue_by_plan: expect.any(Array),
      churn_risk: expect.any(Array),
      new_renewal_ratio: expect.any(Object),
    }));
  });

  test('GET /api/gyms/:id/analytics rejects invalid ranges', async () => {
    const { app, store } = createTestHarness();
    const [gym] = await store.listGyms();
    await request(app).get(`/api/gyms/${gym.id}/analytics?dateRange=15d`).expect(400);
  });

  test('GET /api/analytics/cross-gym returns revenue ranking', async () => {
    const { app } = createTestHarness();
    const response = await request(app).get('/api/analytics/cross-gym').expect(200);

    expect(response.body).toHaveLength(10);
    expect(response.body[0].total_revenue).toBeGreaterThanOrEqual(response.body[1].total_revenue);
  });

  test('POST /api/simulator/start starts the simulator', async () => {
    const { app } = createTestHarness();
    const response = await request(app).post('/api/simulator/start').send({ speed: 5 }).expect(200);

    expect(response.body).toEqual({
      status: 'running',
      speed: 5,
    });
  });

  test('POST /api/simulator/start rejects invalid speeds', async () => {
    const { app } = createTestHarness();
    await request(app).post('/api/simulator/start').send({ speed: 2 }).expect(400);
  });

  test('POST /api/simulator/stop pauses the simulator', async () => {
    const { app } = createTestHarness();
    const response = await request(app).post('/api/simulator/stop').expect(200);

    expect(response.body).toEqual({ status: 'paused' });
  });

  test('POST /api/simulator/reset restores the baseline', async () => {
    const { app } = createTestHarness();
    const response = await request(app).post('/api/simulator/reset').expect(200);

    expect(response.body).toEqual({ status: 'reset' });
  });
});
