const {
  evaluateCapacityBreachAnomaly,
  evaluateRevenueDropAnomaly,
  evaluateZeroCheckinAnomaly,
  shouldResolveCapacityBreach,
  shouldResolveRevenueDrop,
  shouldResolveZeroCheckins,
} = require('../../src/services/anomalyService');
const {
  buildChurnRiskMembers,
  calculateCapacityPct,
} = require('../../src/services/statsService');
const {
  calculateTickInterval,
  getEventWeightsForHour,
  getSimulationBatchSize,
  getTrafficWeightForHour,
} = require('../../src/services/simulatorService');

describe('anomaly and simulator rules', () => {
  test('detects zero-checkin anomalies during operating hours', () => {
    const gym = { name: 'WTF Test', status: 'active', opens_at: '06:00', closes_at: '22:00' };
    const now = new Date('2026-04-06T10:00:00.000Z');
    const anomaly = evaluateZeroCheckinAnomaly({
      gym,
      lastCheckinAt: new Date('2026-04-06T07:00:00.000Z'),
      now,
    });

    expect(anomaly).toMatchObject({
      type: 'zero_checkins',
      severity: 'warning',
    });
  });

  test('does not flag zero-checkins outside operating hours', () => {
    const gym = { name: 'WTF Test', status: 'active', opens_at: '06:00', closes_at: '22:00' };
    const now = new Date('2026-04-06T02:00:00.000Z');
    const anomaly = evaluateZeroCheckinAnomaly({
      gym,
      lastCheckinAt: new Date('2026-04-05T21:00:00.000Z'),
      now,
    });

    expect(anomaly).toBeNull();
  });

  test('detects capacity breaches above 90 percent', () => {
    const anomaly = evaluateCapacityBreachAnomaly({
      gym: { name: 'WTF Test', capacity: 100 },
      occupancy: 91,
    });

    expect(anomaly).toMatchObject({
      type: 'capacity_breach',
      severity: 'critical',
    });
  });

  test('resolves capacity breaches below 85 percent', () => {
    expect(shouldResolveCapacityBreach({
      gym: { name: 'WTF Test', capacity: 100 },
      occupancy: 84,
    })).toBe(true);
  });

  test('detects revenue drops at 30 percent or more', () => {
    const anomaly = evaluateRevenueDropAnomaly({
      gym: { name: 'WTF Test' },
      todayRevenue: 6800,
      lastWeekRevenue: 10000,
    });

    expect(anomaly).toMatchObject({
      type: 'revenue_drop',
      severity: 'warning',
    });
  });

  test('resolves revenue drops when revenue recovers within 20 percent', () => {
    expect(shouldResolveRevenueDrop({
      todayRevenue: 8100,
      lastWeekRevenue: 10000,
    })).toBe(true);
  });

  test('builds churn risk rows for 45 day inactivity', () => {
    const rows = buildChurnRiskMembers([
      { id: '1', name: 'High Risk', status: 'active', last_checkin_at: new Date('2026-02-20T00:00:00.000Z') },
      { id: '2', name: 'Recent', status: 'active', last_checkin_at: new Date('2026-03-20T00:00:00.000Z') },
    ], new Date('2026-04-06T00:00:00.000Z'));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: 'High Risk',
      risk_level: 'High',
    });
  });

  test('classifies critical churn risk at 60 days or more', () => {
    const rows = buildChurnRiskMembers([
      { id: '1', name: 'Critical', status: 'active', last_checkin_at: new Date('2026-01-01T00:00:00.000Z') },
    ], new Date('2026-04-06T00:00:00.000Z'));

    expect(rows[0].risk_level).toBe('Critical');
  });

  test('traffic weights favor peak hours', () => {
    expect(getTrafficWeightForHour(7)).toBeGreaterThan(getTrafficWeightForHour(2));
    expect(getEventWeightsForHour(18).checkin).toBeGreaterThan(getEventWeightsForHour(13).checkin);
  });

  test('simulation cadence scales by speed', () => {
    expect(getSimulationBatchSize(10)).toBeGreaterThan(getSimulationBatchSize(1));
    expect(calculateTickInterval(10)).toBeLessThan(calculateTickInterval(1));
  });

  test('capacity percentage rounds correctly', () => {
    expect(calculateCapacityPct(47, 80)).toBe(59);
  });
});
