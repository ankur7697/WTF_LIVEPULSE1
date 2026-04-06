import { createMockDataset } from './mockData.js';

const BASE_DATA = createMockDataset();

let state = cloneState(BASE_DATA);
const listeners = new Set();
let timer = null;

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

function emitChange(event) {
  listeners.forEach((listener) => listener(event));
}

function recalculateSummary() {
  const summary = {
    total_members_checked_in: 0,
    total_today_revenue: 0,
    active_anomalies: state.anomalies.filter((anomaly) => !anomaly.resolved).length,
  };

  state.gyms.forEach((gym) => {
    const live = state.liveByGymId[gym.id];
    summary.total_members_checked_in += live.current_occupancy;
    summary.total_today_revenue += live.today_revenue;
  });

  state.summary = summary;
}

function updateGymListFromLive() {
  state.gyms = state.gyms.map((gym) => {
    const live = state.liveByGymId[gym.id];
    return {
      ...gym,
      current_occupancy: live.current_occupancy,
      today_revenue: live.today_revenue,
      occupancy_pct: live.capacity_pct,
      occupancy_tone: live.occupancy_tone,
    };
  });
}

function ensureLiveShape(gymId) {
  if (!state.liveByGymId[gymId]) {
    throw new Error('Gym not found');
  }

  return state.liveByGymId[gymId];
}

function applyEvent(event) {
  const live = ensureLiveShape(event.gym_id);
  const gym = live.gym;
  const capacityPct = (occupancy) => Math.round((occupancy / gym.capacity) * 100);

  if (event.type === 'CHECKIN_EVENT') {
    live.current_occupancy += 1;
    live.capacity_pct = capacityPct(live.current_occupancy);
    live.occupancy_tone = live.capacity_pct > 85 ? 'critical' : live.capacity_pct >= 60 ? 'warning' : 'ok';
    live.last_checkin_at = event.timestamp;
    live.recent_events.unshift({
      type: 'CHECKIN_EVENT',
      member_name: event.member_name,
      gym: gym.name,
      timestamp: event.timestamp,
    });
  }

  if (event.type === 'CHECKOUT_EVENT') {
    live.current_occupancy = Math.max(0, live.current_occupancy - 1);
    live.capacity_pct = capacityPct(live.current_occupancy);
    live.occupancy_tone = live.capacity_pct > 85 ? 'critical' : live.capacity_pct >= 60 ? 'warning' : 'ok';
    live.recent_events.unshift({
      type: 'CHECKOUT_EVENT',
      member_name: event.member_name,
      gym: gym.name,
      timestamp: event.timestamp,
    });
  }

  if (event.type === 'PAYMENT_EVENT') {
    live.today_revenue += Number(event.amount || 0);
    live.recent_events.unshift({
      type: 'PAYMENT_EVENT',
      member_name: event.member_name,
      gym: gym.name,
      timestamp: event.timestamp,
      amount: Number(event.amount || 0),
      plan_type: event.plan_type,
    });
  }

  if (event.type === 'ANOMALY_DETECTED') {
    state.anomalies.unshift({
      id: event.anomaly_id,
      gym_id: event.gym_id,
      gym_name: event.gym_name,
      type: event.anomaly_type,
      severity: event.severity,
      message: event.message,
      resolved: false,
      dismissed: false,
      detected_at: event.timestamp || new Date().toISOString(),
      resolved_at: null,
    });
  }

  if (event.type === 'ANOMALY_RESOLVED') {
    const anomaly = state.anomalies.find((item) => item.id === event.anomaly_id);
    if (anomaly) {
      anomaly.resolved = true;
      anomaly.resolved_at = event.resolved_at;
    }
  }

  if (event.type === 'CHECKIN_EVENT' || event.type === 'CHECKOUT_EVENT' || event.type === 'PAYMENT_EVENT') {
    state.feed.unshift({
      type: event.type,
      member_name: event.member_name,
      gym: gym.name,
      timestamp: event.timestamp,
      amount: event.amount || null,
      plan_type: event.plan_type || null,
    });
    state.feed = state.feed.slice(0, 20);
  }

  if (state.selectedGymId === event.gym_id) {
    state.selectedGym.recent_events = live.recent_events.slice(0, 20);
    state.selectedGym.current_occupancy = live.current_occupancy;
    state.selectedGym.capacity_pct = live.capacity_pct;
    state.selectedGym.occupancy_tone = live.occupancy_tone;
    state.selectedGym.today_revenue = live.today_revenue;
    state.selectedGym.last_checkin_at = live.last_checkin_at;
    state.selectedGym.active_anomalies = state.anomalies.filter((anomaly) => anomaly.gym_id === event.gym_id && !anomaly.resolved);
  }

  recalculateSummary();
  updateGymListFromLive();
  emitChange(event);
}

function generateAutoEvent() {
  const gym = state.gyms[Math.floor(Math.random() * state.gyms.length)];
  const live = ensureLiveShape(gym.id);
  const member = state.membersByGym[gym.id][Math.floor(Math.random() * state.membersByGym[gym.id].length)];
  const types = ['CHECKIN_EVENT', 'CHECKOUT_EVENT', 'PAYMENT_EVENT'];
  const type = types[Math.floor(Math.random() * types.length)];

  if (type === 'CHECKOUT_EVENT' && live.current_occupancy === 0) {
    return {
      type: 'CHECKIN_EVENT',
      gym_id: gym.id,
      member_name: member.name,
      timestamp: new Date().toISOString(),
      current_occupancy: live.current_occupancy + 1,
      capacity_pct: Math.round(((live.current_occupancy + 1) / gym.capacity) * 100),
    };
  }

  if (type === 'PAYMENT_EVENT') {
    return {
      type,
      gym_id: gym.id,
      member_name: member.name,
      amount: member.plan_type === 'annual' ? 11999 : member.plan_type === 'quarterly' ? 3999 : 1499,
      plan_type: member.plan_type,
      timestamp: new Date().toISOString(),
      today_total: live.today_revenue + 1499,
    };
  }

  const nextOccupancy = type === 'CHECKIN_EVENT' ? live.current_occupancy + 1 : Math.max(0, live.current_occupancy - 1);
  return {
    type,
    gym_id: gym.id,
    member_name: member.name,
    timestamp: new Date().toISOString(),
    current_occupancy: nextOccupancy,
    capacity_pct: Math.round((nextOccupancy / gym.capacity) * 100),
  };
}

function startTimer(speed = 1) {
  stopTimer();
  const interval = Math.max(250, Math.round(2000 / speed));
  timer = setInterval(() => {
    applyEvent(generateAutoEvent());
  }, interval);
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function resetState() {
  stopTimer();
  state = cloneState(BASE_DATA);
  recalculateSummary();
  updateGymListFromLive();
}

recalculateSummary();
updateGymListFromLive();

const api = {
  async listGyms() {
    return cloneState(state.gyms);
  },
  async getGymLive(id) {
    const live = ensureLiveShape(id);
    return cloneState({
      ...live,
      summary: state.summary,
      active_anomalies: state.anomalies.filter((anomaly) => anomaly.gym_id === id && !anomaly.resolved),
    });
  },
  async getGymAnalytics(id, dateRange = '30d') {
    const analytics = state.analyticsByGymId[id];
    if (!analytics) {
      throw new Error('Gym not found');
    }

    return cloneState({
      ...analytics,
      date_range: dateRange,
    });
  },
  async listAnomalies() {
    return cloneState(state.anomalies.filter((anomaly) => !anomaly.resolved || anomaly.resolved_at));
  },
  async getCrossGymRevenue() {
    return cloneState(state.crossGymRevenue);
  },
  async dismissAnomaly(id) {
    const anomaly = state.anomalies.find((item) => item.id === id);
    if (!anomaly) {
      const error = new Error('Anomaly not found');
      error.status = 404;
      throw error;
    }

    if (anomaly.severity === 'critical') {
      const error = new Error('Critical anomalies cannot be dismissed');
      error.status = 403;
      throw error;
    }

    anomaly.resolved = true;
    anomaly.dismissed = true;
    anomaly.resolved_at = new Date().toISOString();
    recalculateSummary();
    return cloneState(anomaly);
  },
  async startSimulator(speed = 1) {
    state.simulator = { status: 'running', speed };
    startTimer(speed);
    return cloneState(state.simulator);
  },
  async stopSimulator() {
    state.simulator = { ...state.simulator, status: 'paused' };
    stopTimer();
    return cloneState(state.simulator);
  },
  async resetSimulator() {
    resetState();
    return { status: 'reset' };
  },
  async getSummary() {
    return cloneState(state.summary);
  },
  emit(event) {
    applyEvent(event);
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getState() {
    return cloneState(state);
  },
};

if (typeof window !== 'undefined') {
  window.__WTF_LIVEPULSE__ = {
    emit: api.emit,
    start: (speed) => api.startSimulator(speed),
    stop: () => api.stopSimulator(),
    reset: () => api.resetSimulator(),
    getState: () => api.getState(),
    subscribe: (listener) => api.subscribe(listener),
  };
}

export { api, cloneState };
