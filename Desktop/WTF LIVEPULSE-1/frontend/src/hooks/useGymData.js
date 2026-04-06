import { useDashboardState } from './useDashboard';

function useGymData() {
  const { state, actions } = useDashboardState();

  return {
    gyms: state.gyms,
    selectedGym: state.selectedGym,
    selectedGymId: state.selectedGymId,
    selectedGymSnapshot: state.selectedGymSnapshot,
    analytics: state.analytics,
    loading: state.loading,
    errors: state.errors,
    dateRange: state.dateRange,
    selectGym: actions.selectGym,
    changeDateRange: actions.changeDateRange,
    refreshCrossGymRevenue: actions.refreshCrossGymRevenue,
  };
}

export {
  useGymData,
};
