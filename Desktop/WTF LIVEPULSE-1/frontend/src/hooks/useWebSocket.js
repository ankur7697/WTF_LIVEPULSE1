import { useDashboardState } from './useDashboard';

function useWebSocket() {
  const { state } = useDashboardState();

  return {
    connected: state.wsConnected,
    simulator: state.simulator,
  };
}

export {
  useWebSocket,
};
