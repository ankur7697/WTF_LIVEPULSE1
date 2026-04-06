const crypto = require('crypto');
const { generateSeedData } = require('../db/seeds/generateSeedData');
const {
  buildChurnRiskMembers,
  buildCrossGymRevenue,
  buildHeatmapFromCheckins,
  buildLiveSummary,
  buildNewRenewalRatio,
  buildRecentEvents,
  buildRevenueByPlan,
  calculateCapacityPct,
  getDateRangeStart,
  getOccupancyTone,
} = require('../services/statsService');
const { canDismissAnomaly } = require('../services/anomalyService');
const { startOfDay, toDate } = require('../utils/time');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeMaps(state) {
  const gymsById = new Map(state.gyms.map((gym) => [gym.id, gym]));
  const membersById = new Map(state.members.map((member) => [member.id, member]));
  return { gymsById, membersById };
}

function createMemoryStore(options = {}) {
  const seed = options.seedData
    || generateSeedData({
      seed: options.seed || 42,
      gymCount: options.gymCount || 10,
      memberCount: options.memberCount || 500,
      days: options.days || 30,
      baseCheckins: options.baseCheckins || 120,
      basePayments: options.basePayments || 20,
      now: options.now || new Date(),
    });

  const state = {
    gyms: clone(seed.gyms),
    members: clone(seed.members),
    checkins: clone(seed.checkins),
    payments: clone(seed.payments),
    anomalies: clone(seed.anomalies || []),
  };

  let maps = makeMaps(state);

  function refreshMaps() {
    maps = makeMaps(state);
  }

  function getGymOrThrow(gymId) {
    const gym = maps.gymsById.get(gymId);

    if (!gym) {
      const error = new Error('Gym not found');
      error.status = 404;
      throw error;
    }

    return gym;
  }

  function getCurrentOccupancy(gymId) {
    return state.checkins.filter((row) => row.gym_id === gymId && !row.checked_out).length;
  }

  function getTodayRevenue(gymId, now = new Date()) {
    const todayStart = startOfDay(now);
    return state.payments
      .filter((row) => row.gym_id === gymId && toDate(row.paid_at) >= todayStart)
      .reduce((sum, row) => sum + Number(row.amount), 0);
  }

  function getLastWeekRevenue(gymId, now = new Date()) {
    const start = startOfDay(now);
    const lower = new Date(start);
    lower.setDate(lower.getDate() - 7);
    const upper = new Date(start);
    upper.setDate(upper.getDate() - 6);

    return state.payments
      .filter((row) => row.gym_id === gymId && toDate(row.paid_at) >= lower && toDate(row.paid_at) < upper)
      .reduce((sum, row) => sum + Number(row.amount), 0);
  }

  function getLastCheckinAt(gymId) {
    const timestamps = state.checkins
      .filter((row) => row.gym_id === gymId)
      .map((row) => toDate(row.checked_in).getTime());

    if (!timestamps.length) {
      return null;
    }

    return new Date(Math.max(...timestamps)).toISOString();
  }

  function createEventRowsForGym(gymId = null, limit = 20) {
    return buildRecentEvents({
      checkins: state.checkins,
      payments: state.payments,
      membersById: maps.membersById,
      gymsById: maps.gymsById,
      gymId,
      limit,
    });
  }

  function getSnapshotForGym(gymId) {
    const gym = getGymOrThrow(gymId);
    const currentOccupancy = getCurrentOccupancy(gymId);
    const todayRevenue = getTodayRevenue(gymId);
    const lastWeekRevenue = getLastWeekRevenue(gymId);
    const lastCheckinAt = getLastCheckinAt(gymId);
    const activeAnomalies = state.anomalies.filter(
      (anomaly) => anomaly.gym_id === gymId && (!anomaly.resolved || toDate(anomaly.resolved_at) >= new Date(Date.now() - 86400000)),
    );

    return {
      gym,
      current_occupancy: currentOccupancy,
      capacity_pct: calculateCapacityPct(currentOccupancy, gym.capacity),
      occupancy_tone: getOccupancyTone(calculateCapacityPct(currentOccupancy, gym.capacity)),
      today_revenue: Number(todayRevenue.toFixed(2)),
      last_week_revenue: Number(lastWeekRevenue.toFixed(2)),
      last_checkin_at: lastCheckinAt,
      recent_events: createEventRowsForGym(gymId, 20),
      active_anomalies: activeAnomalies
        .filter((anomaly) => !anomaly.resolved || toDate(anomaly.resolved_at) >= new Date(Date.now() - 86400000))
        .sort((left, right) => new Date(right.detected_at) - new Date(left.detected_at)),
    };
  }

  function listGymsWithStats() {
    return state.gyms
      .map((gym) => {
        const occupancy = getCurrentOccupancy(gym.id);
        const todayRevenue = getTodayRevenue(gym.id);
        return {
          id: gym.id,
          name: gym.name,
          city: gym.city,
          capacity: gym.capacity,
          status: gym.status,
          current_occupancy: occupancy,
          today_revenue: Number(todayRevenue.toFixed(2)),
          occupancy_pct: calculateCapacityPct(occupancy, gym.capacity),
          occupancy_tone: getOccupancyTone(calculateCapacityPct(occupancy, gym.capacity)),
        };
      })
      .sort((left, right) => right.current_occupancy - left.current_occupancy || left.name.localeCompare(right.name));
  }

  function getGymAnalytics(gymId, dateRange = '30d') {
    const gym = getGymOrThrow(gymId);
    const dateRangeStart = getDateRangeStart(dateRange);
    const heatmap = buildHeatmapFromCheckins(state.checkins, gym.id);
    const revenueByPlan = buildRevenueByPlan(state.payments, gym.id, dateRangeStart);
    const churnRisk = buildChurnRiskMembers(
      state.members.filter((member) => member.gym_id === gym.id),
    );
    const newRenewalRatio = buildNewRenewalRatio(state.payments, gym.id, dateRangeStart);

    return {
      gym,
      date_range: dateRange,
      heatmap,
      revenue_by_plan: revenueByPlan,
      churn_risk: churnRisk,
      new_renewal_ratio: newRenewalRatio,
    };
  }

  function getCrossGymRevenue(dateRange = '30d') {
    const gyms = state.gyms;
    const dateRangeStart = getDateRangeStart(dateRange);
    return buildCrossGymRevenue(state.payments, gyms, dateRangeStart);
  }

  function listAnomalies(filters = {}) {
    const gymId = filters.gym_id || null;
    const severity = filters.severity || null;
    const now = new Date();

    return state.anomalies
      .filter((anomaly) => {
        if (gymId && anomaly.gym_id !== gymId) {
          return false;
        }

        if (severity && anomaly.severity !== severity) {
          return false;
        }

        return !anomaly.resolved || !anomaly.resolved_at || toDate(anomaly.resolved_at) >= new Date(now.getTime() - 86400000);
      })
      .map((anomaly) => ({
        ...anomaly,
        gym_name: maps.gymsById.get(anomaly.gym_id)?.name || 'Unknown gym',
      }))
      .sort((left, right) => new Date(right.detected_at) - new Date(left.detected_at));
  }

  function getUnreadAnomalyCount() {
    return state.anomalies.filter((anomaly) => !anomaly.resolved && !anomaly.dismissed).length;
  }

  function insertAnomaly(anomaly) {
    const record = {
      id: anomaly.id || crypto.randomUUID(),
      gym_id: anomaly.gym_id,
      type: anomaly.type,
      severity: anomaly.severity,
      message: anomaly.message,
      resolved: Boolean(anomaly.resolved),
      dismissed: Boolean(anomaly.dismissed),
      detected_at: anomaly.detected_at || new Date().toISOString(),
      resolved_at: anomaly.resolved_at || null,
    };

    state.anomalies.push(record);
    return record;
  }

  function resolveAnomaly(id) {
    const anomaly = state.anomalies.find((row) => row.id === id);

    if (!anomaly) {
      return null;
    }

    anomaly.resolved = true;
    anomaly.resolved_at = new Date().toISOString();
    return anomaly;
  }

  function dismissAnomaly(id) {
    const anomaly = state.anomalies.find((row) => row.id === id);

    if (!anomaly) {
      const error = new Error('Anomaly not found');
      error.status = 404;
      throw error;
    }

    if (!canDismissAnomaly(anomaly)) {
      const error = new Error('Critical anomalies cannot be dismissed');
      error.status = 403;
      throw error;
    }

    anomaly.dismissed = true;
    anomaly.resolved = true;
    anomaly.resolved_at = new Date().toISOString();
    return anomaly;
  }

  function getMembersForGym(gymId) {
    return state.members.filter((member) => member.gym_id === gymId);
  }

  function getOpenCheckinsForGym(gymId) {
    return state.checkins.filter((row) => row.gym_id === gymId && !row.checked_out);
  }

  function recordCheckin({ gym_id, member_id, checked_in = new Date().toISOString(), member_name = null }) {
    const row = {
      id: state.checkins.length + 1,
      member_id,
      gym_id,
      checked_in,
      checked_out: null,
    };
    state.checkins.push(row);

    const member = maps.membersById.get(member_id);
    if (member) {
      member.last_checkin_at = checked_in;
    }

    return {
      ...row,
      member_name: member_name || member?.name || 'Unknown member',
      gym_name: maps.gymsById.get(gym_id)?.name || 'Unknown gym',
    };
  }

  function recordCheckout({ gym_id, member_id = null, checked_out = new Date().toISOString() }) {
    const candidate = [...state.checkins]
      .reverse()
      .find((row) => row.gym_id === gym_id && !row.checked_out && (!member_id || row.member_id === member_id));

    if (!candidate) {
      return null;
    }

    candidate.checked_out = checked_out;
    return {
      ...candidate,
      gym_name: maps.gymsById.get(gym_id)?.name || 'Unknown gym',
      member_name: maps.membersById.get(candidate.member_id)?.name || 'Unknown member',
    };
  }

  function recordPayment({
    gym_id,
    member_id,
    amount,
    plan_type,
    payment_type = 'new',
    paid_at = new Date().toISOString(),
    notes = null,
  }) {
    const row = {
      id: crypto.randomUUID(),
      member_id,
      gym_id,
      amount,
      plan_type,
      payment_type,
      paid_at,
      notes,
    };

    state.payments.push(row);
    return {
      ...row,
      member_name: maps.membersById.get(member_id)?.name || 'Unknown member',
      gym_name: maps.gymsById.get(gym_id)?.name || 'Unknown gym',
    };
  }

  function resetLiveState() {
    const now = new Date().toISOString();
    let closed = 0;

    state.checkins.forEach((row) => {
      if (!row.checked_out) {
        row.checked_out = now;
        closed += 1;
      }
    });

    return { closed };
  }

  function upsertCheckinFromEvent(event) {
    return recordCheckin(event);
  }

  function upsertCheckoutFromEvent(event) {
    return recordCheckout(event);
  }

  async function refreshMaterializedViews() {
    return {
      ok: true,
    };
  }

  return {
    type: 'memory',
    state,
    refreshMaps,
    listGymsWithStats,
    getGymById: async (gymId) => getGymOrThrow(gymId),
    getGymLiveSnapshot: async (gymId) => getSnapshotForGym(gymId),
    getGymAnalytics: async (gymId, dateRange) => getGymAnalytics(gymId, dateRange),
    getCrossGymRevenue: async (dateRange) => getCrossGymRevenue(dateRange),
    listAnomalies: async (filters) => listAnomalies(filters),
    getUnreadAnomalyCount: async () => getUnreadAnomalyCount(),
    insertAnomaly: async (anomaly) => insertAnomaly(anomaly),
    resolveAnomaly: async (id) => resolveAnomaly(id),
    dismissAnomaly: async (id) => dismissAnomaly(id),
    getMembersForGym: async (gymId) => getMembersForGym(gymId),
    getOpenCheckinsForGym: async (gymId) => getOpenCheckinsForGym(gymId),
    recordCheckin: async (event) => upsertCheckinFromEvent(event),
    recordCheckout: async (event) => upsertCheckoutFromEvent(event),
    recordPayment: async (event) => recordPayment(event),
    resetLiveState: async () => resetLiveState(),
    refreshMaterializedViews,
    listGyms: async () => listGymsWithStats(),
    getCurrentOccupancy: async (gymId) => getCurrentOccupancy(gymId),
    getTodayRevenue: async (gymId) => getTodayRevenue(gymId),
    getLastWeekRevenue: async (gymId) => getLastWeekRevenue(gymId),
    getLastCheckinAt: async (gymId) => getLastCheckinAt(gymId),
    createEventRowsForGym: async (gymId, limit) => createEventRowsForGym(gymId, limit),
    buildLiveSummary: async () => buildLiveSummary({
      gyms: state.gyms,
      checkins: state.checkins,
      payments: state.payments,
      anomalies: state.anomalies,
    }),
  };
}

module.exports = {
  createMemoryStore,
};

