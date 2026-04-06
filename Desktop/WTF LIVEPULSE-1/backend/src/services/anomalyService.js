const { calculateCapacityPct } = require('./statsService');
const {
  differenceInHours,
  isWithinOperatingHours,
  toDate,
} = require('../utils/time');

function evaluateZeroCheckinAnomaly({ gym, lastCheckinAt, now = new Date() }) {
  if (!gym || gym.status !== 'active') {
    return null;
  }

  if (!isWithinOperatingHours(now, gym)) {
    return null;
  }

  if (!lastCheckinAt) {
    return {
      type: 'zero_checkins',
      severity: 'warning',
      message: `${gym.name} has not recorded a check-in in the last 2 hours.`,
    };
  }

  const hoursSinceLastCheckin = differenceInHours(now, lastCheckinAt);

  if (hoursSinceLastCheckin >= 2) {
    return {
      type: 'zero_checkins',
      severity: 'warning',
      message: `${gym.name} has not recorded a check-in in the last 2 hours.`,
    };
  }

  return null;
}

function evaluateCapacityBreachAnomaly({ gym, occupancy }) {
  if (!gym) {
    return null;
  }

  const occupancyPct = calculateCapacityPct(occupancy, gym.capacity);

  if (occupancyPct > 90) {
    return {
      type: 'capacity_breach',
      severity: 'critical',
      message: `${gym.name} is at ${occupancyPct}% of capacity (${occupancy}/${gym.capacity}).`,
    };
  }

  return null;
}

function evaluateRevenueDropAnomaly({ gym, todayRevenue, lastWeekRevenue }) {
  if (!gym || lastWeekRevenue <= 0) {
    return null;
  }

  if (todayRevenue <= lastWeekRevenue * 0.7) {
    return {
      type: 'revenue_drop',
      severity: 'warning',
      message: `${gym.name} revenue is down ${Math.round(
        ((lastWeekRevenue - todayRevenue) / lastWeekRevenue) * 100,
      )}% versus the same day last week.`,
    };
  }

  return null;
}

function shouldResolveCapacityBreach({ gym, occupancy }) {
  return calculateCapacityPct(occupancy, gym.capacity) < 85;
}

function shouldResolveRevenueDrop({ todayRevenue, lastWeekRevenue }) {
  if (lastWeekRevenue <= 0) {
    return true;
  }

  return todayRevenue >= lastWeekRevenue * 0.8;
}

function shouldResolveZeroCheckins({ gym, lastCheckinAt, now = new Date() }) {
  if (!isWithinOperatingHours(now, gym)) {
    return true;
  }

  if (!lastCheckinAt) {
    return false;
  }

  return differenceInHours(now, lastCheckinAt) < 2;
}

function canDismissAnomaly(anomaly) {
  return anomaly && anomaly.severity === 'warning';
}

function evaluateAnomalyCycle({ gyms, liveSnapshotByGymId, activeAnomalies, now = new Date() }) {
  const created = [];
  const resolved = [];

  gyms.forEach((gym) => {
    const liveSnapshot = liveSnapshotByGymId.get(gym.id) || {};

    const zeroCheckinCandidate = evaluateZeroCheckinAnomaly({
      gym,
      lastCheckinAt: liveSnapshot.last_checkin_at,
      now,
    });

    const capacityCandidate = evaluateCapacityBreachAnomaly({
      gym,
      occupancy: liveSnapshot.current_occupancy || 0,
    });

    const revenueDropCandidate = evaluateRevenueDropAnomaly({
      gym,
      todayRevenue: Number(liveSnapshot.today_revenue || 0),
      lastWeekRevenue: Number(liveSnapshot.last_week_revenue || 0),
    });

    const candidates = [zeroCheckinCandidate, capacityCandidate, revenueDropCandidate].filter(Boolean);

    candidates.forEach((candidate) => {
      const existing = activeAnomalies.find(
        (anomaly) => anomaly.gym_id === gym.id && anomaly.type === candidate.type && !anomaly.resolved,
      );

      if (!existing) {
        created.push({
          gym_id: gym.id,
          ...candidate,
        });
      }
    });

    activeAnomalies
      .filter((anomaly) => anomaly.gym_id === gym.id && !anomaly.dismissed && !anomaly.resolved)
      .forEach((anomaly) => {
        if (anomaly.type === 'capacity_breach' && shouldResolveCapacityBreach({
          gym,
          occupancy: liveSnapshot.current_occupancy || 0,
        })) {
          resolved.push(anomaly);
          return;
        }

        if (anomaly.type === 'revenue_drop' && shouldResolveRevenueDrop({
          todayRevenue: Number(liveSnapshot.today_revenue || 0),
          lastWeekRevenue: Number(liveSnapshot.last_week_revenue || 0),
        })) {
          resolved.push(anomaly);
          return;
        }

        if (anomaly.type === 'zero_checkins' && shouldResolveZeroCheckins({
          gym,
          lastCheckinAt: liveSnapshot.last_checkin_at,
          now,
        })) {
          resolved.push(anomaly);
        }
      });
  });

  return { created, resolved };
}

module.exports = {
  canDismissAnomaly,
  evaluateAnomalyCycle,
  evaluateCapacityBreachAnomaly,
  evaluateRevenueDropAnomaly,
  evaluateZeroCheckinAnomaly,
  shouldResolveCapacityBreach,
  shouldResolveRevenueDrop,
  shouldResolveZeroCheckins,
};

