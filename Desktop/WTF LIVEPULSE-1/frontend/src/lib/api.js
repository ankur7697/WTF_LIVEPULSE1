import { api as mockApi } from '../mocks/mockRuntime';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error || response.statusText || 'Request failed');
    error.status = response.status;
    error.details = body.details || null;
    throw error;
  }

  return response.json();
}

function createApi() {
  if (USE_MOCKS) {
    return {
      listGyms: () => mockApi.listGyms(),
      getGymLive: (gymId) => mockApi.getGymLive(gymId),
      getGymAnalytics: (gymId, dateRange) => mockApi.getGymAnalytics(gymId, dateRange),
      listAnomalies: () => mockApi.listAnomalies(),
      getCrossGymRevenue: () => mockApi.getCrossGymRevenue(),
      dismissAnomaly: (anomalyId) => mockApi.dismissAnomaly(anomalyId),
      startSimulator: (speed) => mockApi.startSimulator(speed),
      stopSimulator: () => mockApi.stopSimulator(),
      resetSimulator: () => mockApi.resetSimulator(),
      getSummary: () => mockApi.getSummary(),
    };
  }

  return {
    listGyms: () => request('/gyms'),
    getGymLive: (gymId) => request(`/gyms/${gymId}/live`),
    getGymAnalytics: (gymId, dateRange) => request(`/gyms/${gymId}/analytics?dateRange=${dateRange}`),
    listAnomalies: () => request('/anomalies'),
    getCrossGymRevenue: () => request('/analytics/cross-gym'),
    dismissAnomaly: (anomalyId) => request(`/anomalies/${anomalyId}/dismiss`, { method: 'PATCH', body: JSON.stringify({ confirm: true }) }),
    startSimulator: (speed) => request('/simulator/start', { method: 'POST', body: JSON.stringify({ speed }) }),
    stopSimulator: () => request('/simulator/stop', { method: 'POST' }),
    resetSimulator: () => request('/simulator/reset', { method: 'POST' }),
    getSummary: async () => {
      const gyms = await request('/gyms');
      const first = gyms[0];
      if (!first) {
        return { total_members_checked_in: 0, total_today_revenue: 0, active_anomalies: 0 };
      }
      const live = await request(`/gyms/${first.id}/live`);
      return live.summary || { total_members_checked_in: 0, total_today_revenue: 0, active_anomalies: 0 };
    },
  };
}

export { API_BASE, USE_MOCKS, createApi, request };

