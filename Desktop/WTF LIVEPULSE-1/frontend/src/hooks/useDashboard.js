import { useDashboard } from '../store/DashboardContext';

function useDashboardState() {
  return useDashboard();
}

export {
  useDashboardState,
};

