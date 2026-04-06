import { useDashboardState } from './useDashboard';

function useAnomalies() {
  const { state, actions } = useDashboardState();

  return {
    anomalies: state.anomalies,
    loading: state.loading.anomalies,
    error: state.errors.anomalies,
    unreadCount: state.anomalies.filter((item) => !item.resolved && !item.dismissed).length,
    refreshAnomalies: actions.refreshAnomalies,
    dismissAnomaly: actions.dismissAnomaly,
  };
}

export {
  useAnomalies,
};
