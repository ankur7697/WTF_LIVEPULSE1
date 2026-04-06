import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { createApi, USE_MOCKS } from '../lib/api';
import {
  eventTypeLabel,
  formatCompactNumber,
  formatCurrency,
  formatDateTime,
  percentileToLevel,
  toneFromPct,
} from '../lib/format';

const DashboardContext = createContext(null);

function buildInitialState() {
  return {
    view: 'dashboard',
    gyms: [],
    selectedGymId: null,
    selectedGymSnapshot: null,
    analytics: null,
    anomalies: [],
    crossGymRevenue: [],
    activityFeed: [],
    summary: {
      total_members_checked_in: 0,
      total_today_revenue: 0,
      active_anomalies: 0,
    },
    wsConnected: false,
    simulator: {
      status: 'paused',
      speed: 1,
    },
    loading: {
      bootstrap: true,
      selectedGym: true,
      analytics: true,
      anomalies: true,
      crossGymRevenue: true,
    },
    errors: {
      bootstrap: null,
      selectedGym: null,
      analytics: null,
      anomalies: null,
      crossGymRevenue: null,
      simulator: null,
    },
    toasts: [],
    dateRange: '30d',
  };
}

function buildFeedEntry(event, gymName = null) {
  return {
    type: event.type,
    label: eventTypeLabel(event.type),
    member_name: event.member_name || 'Unknown member',
    gym: gymName || event.gym_name || event.gym || 'Unknown gym',
    timestamp: event.timestamp || new Date().toISOString(),
    amount: event.amount || null,
    plan_type: event.plan_type || null,
  };
}

function bumpHeatmap(heatmap, timestamp, delta = 1) {
  const date = new Date(timestamp);
  const dayOfWeek = date.getDay();
  const hourOfDay = date.getHours();

  return heatmap.map((row) => {
    if (row.day_of_week === dayOfWeek && row.hour_of_day === hourOfDay) {
      return {
        ...row,
        checkin_count: Math.max(0, Number(row.checkin_count || 0) + delta),
      };
    }

    return row;
  });
}

function updateRevenueRanking(ranking, gymId, gymName, delta) {
  const map = ranking.map((row) =>
    row.gym_id === gymId
      ? {
          ...row,
          gym_name: gymName || row.gym_name,
          total_revenue: Number(row.total_revenue || 0) + delta,
        }
      : row,
  );

  return map
    .sort((left, right) => Number(right.total_revenue || 0) - Number(left.total_revenue || 0))
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_VIEW':
      return {
        ...state,
        view: action.view,
      };

    case 'BOOTSTRAP_START':
      return {
        ...state,
        loading: {
          ...state.loading,
          bootstrap: true,
        },
        errors: {
          ...state.errors,
          bootstrap: null,
        },
      };

    case 'BOOTSTRAP_SUCCESS':
      return {
        ...state,
        gyms: action.gyms,
        selectedGymId: action.selectedGymId,
        anomalies: action.anomalies,
        crossGymRevenue: action.crossGymRevenue,
        summary: action.summary,
        loading: {
          bootstrap: false,
          selectedGym: false,
          analytics: false,
          anomalies: false,
          crossGymRevenue: false,
        },
        errors: {
          ...state.errors,
          bootstrap: null,
          anomalies: null,
          crossGymRevenue: null,
        },
        activityFeed: action.activityFeed,
        simulator: action.simulator || state.simulator,
      };

    case 'BOOTSTRAP_FAILURE':
      return {
        ...state,
        loading: {
          ...state.loading,
          bootstrap: false,
        },
        errors: {
          ...state.errors,
          bootstrap: action.error,
        },
      };

    case 'SELECT_GYM_START':
      return {
        ...state,
        selectedGymId: action.gymId,
        loading: {
          ...state.loading,
          selectedGym: true,
          analytics: true,
        },
        errors: {
          ...state.errors,
          selectedGym: null,
          analytics: null,
        },
      };

    case 'SELECT_GYM_SUCCESS':
      return {
        ...state,
        selectedGymSnapshot: action.snapshot,
        analytics: action.analytics,
        activityFeed: action.activityFeed || state.activityFeed,
        summary: action.snapshot?.summary || state.summary,
        loading: {
          ...state.loading,
          selectedGym: false,
          analytics: false,
        },
      };

    case 'SELECT_GYM_FAILURE':
      return {
        ...state,
        loading: {
          ...state.loading,
          selectedGym: false,
          analytics: false,
        },
        errors: {
          ...state.errors,
          selectedGym: action.error,
          analytics: action.error,
        },
      };

    case 'SET_ANOMALIES':
      return {
        ...state,
        anomalies: action.anomalies,
        loading: {
          ...state.loading,
          anomalies: false,
        },
      };

    case 'SET_CROSS_GYM_REVENUE':
      return {
        ...state,
        crossGymRevenue: action.crossGymRevenue,
        loading: {
          ...state.loading,
          crossGymRevenue: false,
        },
      };

    case 'SET_CONNECTION':
      return {
        ...state,
        wsConnected: action.connected,
      };

    case 'SET_SIMULATOR':
      return {
        ...state,
        simulator: action.simulator,
      };

    case 'SET_DATE_RANGE':
      return {
        ...state,
        dateRange: action.dateRange,
        loading: {
          ...state.loading,
          analytics: true,
        },
      };

    case 'PUSH_TOAST':
      return {
        ...state,
        toasts: [
          ...state.toasts,
          action.toast,
        ].slice(-4),
      };

    case 'DISMISS_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.toastId),
      };

    case 'LIVE_EVENT': {
      const event = action.event;
      const gymName = event.gym_name || state.gyms.find((gym) => gym.id === event.gym_id)?.name || 'Unknown gym';
      const feedEntry = buildFeedEntry(event, gymName);
      const feed = [feedEntry, ...state.activityFeed].slice(0, 20);
      let toasts = state.toasts;
      const gyms = state.gyms.map((gym) => {
        if (gym.id !== event.gym_id) {
          return gym;
        }

        if (event.type === 'CHECKIN_EVENT' || event.type === 'CHECKOUT_EVENT') {
          return {
            ...gym,
            current_occupancy: event.current_occupancy ?? gym.current_occupancy,
            occupancy_pct: event.capacity_pct ?? gym.occupancy_pct,
            occupancy_tone: toneFromPct(event.capacity_pct ?? gym.occupancy_pct),
          };
        }

        if (event.type === 'PAYMENT_EVENT') {
          return {
            ...gym,
            today_revenue: event.today_total ?? gym.today_revenue,
          };
        }

        return gym;
      });

      let snapshot = state.selectedGymSnapshot;
      if (snapshot && snapshot.gym && snapshot.gym.id === event.gym_id) {
        const recentEvents = [feedEntry, ...(snapshot.recent_events || [])].slice(0, 20);

        if (event.type === 'CHECKIN_EVENT' || event.type === 'CHECKOUT_EVENT') {
          snapshot = {
            ...snapshot,
            current_occupancy: event.current_occupancy ?? snapshot.current_occupancy,
            capacity_pct: event.capacity_pct ?? snapshot.capacity_pct,
            occupancy_tone: toneFromPct(event.capacity_pct ?? snapshot.capacity_pct),
            last_checkin_at: event.timestamp || snapshot.last_checkin_at,
            recent_events: recentEvents,
            active_anomalies: snapshot.active_anomalies || [],
          };
        }

        if (event.type === 'PAYMENT_EVENT') {
          snapshot = {
            ...snapshot,
            today_revenue: event.today_total ?? snapshot.today_revenue,
            recent_events: recentEvents,
          };
        }

        if (event.type === 'ANOMALY_DETECTED') {
          snapshot = {
            ...snapshot,
            active_anomalies: [
              {
                id: event.anomaly_id,
                gym_id: event.gym_id,
                gym_name: event.gym_name,
                type: event.anomaly_type,
                severity: event.severity,
                message: event.message,
                resolved: false,
                dismissed: false,
                detected_at: event.timestamp || new Date().toISOString(),
              },
              ...(snapshot.active_anomalies || []),
            ],
          };
        }

        if (event.type === 'ANOMALY_RESOLVED') {
          snapshot = {
            ...snapshot,
            active_anomalies: (snapshot.active_anomalies || []).map((item) =>
              item.id === event.anomaly_id
                ? { ...item, resolved: true, resolved_at: event.resolved_at }
                : item,
            ),
          };
        }
      }

      let anomalies = state.anomalies;
      if (event.type === 'ANOMALY_DETECTED') {
        const severityLabel = event.severity === 'critical' ? 'Critical' : 'Warning';
        toasts = [
          ...state.toasts,
          {
            id: `${event.anomaly_id || event.gym_id || event.timestamp}-toast`,
            title: `${severityLabel} anomaly detected`,
            body: `${gymName}: ${event.message}`,
            severity: event.severity === 'critical' ? 'critical' : 'warning',
          },
        ].slice(-4);

        anomalies = [
          {
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
          },
          ...state.anomalies,
        ];
      }

      if (event.type === 'ANOMALY_RESOLVED') {
        anomalies = state.anomalies.map((item) =>
          item.id === event.anomaly_id
            ? { ...item, resolved: true, resolved_at: event.resolved_at }
            : item,
        );
      }

      let summary = { ...state.summary };
      if (event.type === 'CHECKIN_EVENT') {
        summary = {
          ...summary,
          total_members_checked_in: summary.total_members_checked_in + 1,
        };
      }

      if (event.type === 'CHECKOUT_EVENT') {
        summary = {
          ...summary,
          total_members_checked_in: Math.max(0, summary.total_members_checked_in - 1),
        };
      }

      if (event.type === 'PAYMENT_EVENT') {
        summary = {
          ...summary,
          total_today_revenue: event.today_total ?? summary.total_today_revenue + Number(event.amount || 0),
        };
      }

      summary = {
        ...summary,
        active_anomalies: anomalies.filter((item) => !item.resolved).length,
      };

      let analytics = state.analytics;
      if (analytics && analytics.gym && analytics.gym.id === event.gym_id) {
        if (event.type === 'CHECKIN_EVENT') {
          analytics = {
            ...analytics,
            heatmap: bumpHeatmap(analytics.heatmap, event.timestamp, 1),
          };
        }

        if (event.type === 'PAYMENT_EVENT') {
          analytics = {
            ...analytics,
            revenue_by_plan: analytics.revenue_by_plan.map((row) =>
              row.plan_type === event.plan_type
                ? { ...row, total_revenue: Number(row.total_revenue || 0) + Number(event.amount || 0) }
                : row,
            ),
          };
        }
      }

      const crossGymRevenue = event.type === 'PAYMENT_EVENT'
        ? updateRevenueRanking(state.crossGymRevenue, event.gym_id, event.gym_name, Number(event.amount || 0))
        : state.crossGymRevenue;

      return {
        ...state,
        gyms,
        selectedGymSnapshot: snapshot,
        analytics,
        anomalies,
        activityFeed: feed,
        summary,
        crossGymRevenue,
        toasts,
      };
    }

    default:
      return state;
  }
}

function DashboardProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  const apiRef = useRef(createApi());

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      dispatch({ type: 'BOOTSTRAP_START' });

      try {
        const [gyms, anomalies, crossGymRevenue] = await Promise.all([
          apiRef.current.listGyms(),
          apiRef.current.listAnomalies(),
          apiRef.current.getCrossGymRevenue(),
        ]);

        if (!active) {
          return;
        }

        const selectedGymId = gyms[0]?.id || null;
        let snapshot = null;
        let analytics = null;
        let summary = state.summary;
        let activityFeed = [];

        if (selectedGymId) {
          [snapshot, analytics] = await Promise.all([
            apiRef.current.getGymLive(selectedGymId),
            apiRef.current.getGymAnalytics(selectedGymId, state.dateRange),
          ]);
          summary = snapshot.summary || summary;
          activityFeed = snapshot.recent_events || [];
        }

        if (!active) {
          return;
        }

        dispatch({
          type: 'BOOTSTRAP_SUCCESS',
          gyms,
          anomalies,
          crossGymRevenue,
          summary,
          activityFeed,
          selectedGymId,
          simulator: state.simulator,
        });

        if (selectedGymId) {
          dispatch({
            type: 'SELECT_GYM_SUCCESS',
            snapshot,
            analytics,
            activityFeed,
          });
        }
      } catch (error) {
        if (!active) {
          return;
        }

        dispatch({
          type: 'BOOTSTRAP_FAILURE',
          error: error.message || 'Failed to bootstrap dashboard',
        });
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (USE_MOCKS) {
      const runtime = window.__WTF_LIVEPULSE__;
      if (runtime) {
        const unsubscribe = runtime.subscribe ? runtime.subscribe((event) => {
          dispatch({ type: 'LIVE_EVENT', event });
        }) : null;
        dispatch({ type: 'SET_CONNECTION', connected: true });
        window.__WTF_LIVEPULSE__ = {
          ...runtime,
          emit: (event) => runtime.emit(event),
          start: (speed) => runtime.start(speed),
          stop: () => runtime.stop(),
          reset: () => runtime.reset(),
          getState: () => runtime.getState(),
        };

        return () => {
          unsubscribe?.();
        };
      }
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.addEventListener('open', () => {
      dispatch({ type: 'SET_CONNECTION', connected: true });
    });

    socket.addEventListener('close', () => {
      dispatch({ type: 'SET_CONNECTION', connected: false });
    });

    socket.addEventListener('error', () => {
      dispatch({ type: 'SET_CONNECTION', connected: false });
    });

    socket.addEventListener('message', (messageEvent) => {
      try {
        const event = JSON.parse(messageEvent.data);
        if (event.type !== 'CONNECTED') {
          dispatch({ type: 'LIVE_EVENT', event });
        }
      } catch (error) {
        dispatch({
          type: 'PUSH_TOAST',
          toast: {
            id: crypto.randomUUID(),
            title: 'Live feed error',
            body: 'A WebSocket message could not be parsed.',
            severity: 'critical',
          },
        });
      }
    });

    return () => {
      socket.close();
    };
  }, []);

  async function selectGym(gymId) {
    dispatch({ type: 'SELECT_GYM_START', gymId });

    try {
      const [snapshot, analytics] = await Promise.all([
        apiRef.current.getGymLive(gymId),
        apiRef.current.getGymAnalytics(gymId, state.dateRange),
      ]);

      dispatch({
        type: 'SELECT_GYM_SUCCESS',
        snapshot,
        analytics,
        activityFeed: snapshot.recent_events || state.activityFeed,
      });
    } catch (error) {
      dispatch({
        type: 'SELECT_GYM_FAILURE',
        error: error.message || 'Failed to load gym data',
      });
    }
  }

  async function changeDateRange(dateRange) {
    dispatch({ type: 'SET_DATE_RANGE', dateRange });

    if (!state.selectedGymId) {
      return;
    }

    try {
      const analytics = await apiRef.current.getGymAnalytics(state.selectedGymId, dateRange);
      dispatch({
        type: 'SELECT_GYM_SUCCESS',
        snapshot: state.selectedGymSnapshot,
        analytics,
      });
    } catch (error) {
      dispatch({
        type: 'SELECT_GYM_FAILURE',
        error: error.message || 'Failed to refresh analytics',
      });
    }
  }

  async function refreshAnomalies() {
    try {
      const anomalies = await apiRef.current.listAnomalies();
      dispatch({ type: 'SET_ANOMALIES', anomalies });
    } catch (error) {
      dispatch({
        type: 'PUSH_TOAST',
        toast: {
          id: crypto.randomUUID(),
          title: 'Anomalies failed to load',
          body: error.message || 'Could not refresh anomaly list.',
          severity: 'critical',
        },
      });
    }
  }

  async function refreshCrossGymRevenue() {
    try {
      const crossGymRevenue = await apiRef.current.getCrossGymRevenue();
      dispatch({ type: 'SET_CROSS_GYM_REVENUE', crossGymRevenue });
    } catch (error) {
      dispatch({
        type: 'PUSH_TOAST',
        toast: {
          id: crypto.randomUUID(),
          title: 'Revenue comparison failed',
          body: error.message || 'Could not refresh cross-gym rankings.',
          severity: 'warning',
        },
      });
    }
  }

  async function startSimulator(speed) {
    try {
      const simulator = await apiRef.current.startSimulator(speed);
      dispatch({ type: 'SET_SIMULATOR', simulator });
      return simulator;
    } catch (error) {
      dispatch({
        type: 'PUSH_TOAST',
        toast: {
          id: crypto.randomUUID(),
          title: 'Simulator failed to start',
          body: error.message || 'Could not start the simulator.',
          severity: 'critical',
        },
      });
      throw error;
    }
  }

  async function stopSimulator() {
    const simulator = await apiRef.current.stopSimulator();
    dispatch({ type: 'SET_SIMULATOR', simulator });
    return simulator;
  }

  async function resetSimulator() {
    const simulator = await apiRef.current.resetSimulator();
    dispatch({ type: 'SET_SIMULATOR', simulator: { status: 'paused', speed: 1 } });
    await Promise.all([
      refreshAnomalies(),
      refreshCrossGymRevenue(),
    ]);
    if (state.selectedGymId) {
      await selectGym(state.selectedGymId);
    }
    return simulator;
  }

  async function dismissAnomaly(id) {
    const updated = await apiRef.current.dismissAnomaly(id);
    dispatch({
      type: 'SET_ANOMALIES',
      anomalies: state.anomalies.map((anomaly) => (anomaly.id === updated.id ? updated : anomaly)),
    });
    dispatch({
      type: 'LIVE_EVENT',
      event: {
        type: 'ANOMALY_RESOLVED',
        anomaly_id: updated.id,
        gym_id: updated.gym_id,
        resolved_at: updated.resolved_at,
      },
    });
    return updated;
  }

  const selectedGym = state.gyms.find((gym) => gym.id === state.selectedGymId) || null;
  const value = useMemo(
    () => ({
      state: {
        ...state,
        selectedGym,
        formatCurrency,
        formatCompactNumber,
        formatDateTime,
        toneFromPct,
        percentileToLevel,
      },
      actions: {
        setView: (view) => dispatch({ type: 'SET_VIEW', view }),
        selectGym,
        changeDateRange,
        refreshAnomalies,
        refreshCrossGymRevenue,
        startSimulator,
        stopSimulator,
        resetSimulator,
        dismissAnomaly,
        pushToast: (toast) => dispatch({ type: 'PUSH_TOAST', toast }),
        dismissToast: (toastId) => dispatch({ type: 'DISMISS_TOAST', toastId }),
      },
    }),
    [state, selectedGym],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used inside DashboardProvider');
  }
  return context;
}

export {
  DashboardProvider,
  useDashboard,
  buildFeedEntry,
};
