import { Skeleton } from './Skeleton';
import { useDashboardState } from '../hooks/useDashboard';

function TopBar() {
  const { state, actions } = useDashboardState();

  const busiestGym = [...state.gyms].sort((left, right) => Number(right.current_occupancy || 0) - Number(left.current_occupancy || 0))[0];
  const unreadAnomalies = state.anomalies.filter((item) => !item.resolved && !item.dismissed).length;

  return (
    <header className="top-bar">
      <div className="top-bar__inner">
        <div className="brand-row">
          <div className="brand">
            <span className={`status-dot ${state.wsConnected ? 'is-connected' : ''}`} />
            <div>
              <div className="brand__title">WTF LivePulse</div>
              <span className="brand__subtitle">
                {state.wsConnected ? 'Live feed connected' : 'Connection lost'}
                {state.simulator.status === 'running' ? ` · Simulator ${state.simulator.speed}x` : ' · Simulator paused'}
              </span>
            </div>
          </div>

          <div className="nav-tabs" role="tablist" aria-label="Dashboard views">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'analytics', label: 'Analytics' },
              { id: 'anomalies', label: 'Anomalies' },
            ].map((view) => (
              <button
                key={view.id}
                className="nav-tab"
                aria-current={state.view === view.id ? 'page' : undefined}
                onClick={() => actions.setView(view.id)}
                type="button"
              >
                {view.label}
                {view.id === 'anomalies' && unreadAnomalies > 0 ? (
                  <span className="nav-tab__badge">{unreadAnomalies > 99 ? '99+' : unreadAnomalies}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="top-stats">
          {state.loading.bootstrap ? (
            <>
              <Skeleton className="summary-card" />
              <Skeleton className="summary-card" />
              <Skeleton className="summary-card" />
            </>
          ) : (
            <>
              <div className="summary-card">
                <div className="summary-card__label">Total checked in</div>
                <div className="summary-card__value mono">{state.formatCompactNumber(state.summary.total_members_checked_in)}</div>
                <div className="summary-card__meta">All gyms combined right now</div>
              </div>

              <div className="summary-card">
                <div className="summary-card__label">Today's revenue</div>
                <div className="summary-card__value mono">{state.formatCurrency(state.summary.total_today_revenue)}</div>
                <div className="summary-card__meta">Updated from live payment events</div>
              </div>

              <div className="summary-card">
                <div className="summary-card__label">Active anomalies</div>
                <div className="summary-card__value mono">{state.formatCompactNumber(state.summary.active_anomalies)}</div>
                <div className="summary-card__meta">
                  {busiestGym ? `${busiestGym.name} is busiest right now` : 'Awaiting live occupancy'}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="gyms-strip" aria-label="Gym locations">
          {state.loading.bootstrap
            ? Array.from({ length: 10 }).map((_, index) => (
                <Skeleton key={index} className="gym-tab" style={{ width: 160, height: 40, borderRadius: 999 }} />
              ))
            : state.gyms.map((gym) => (
                <button
                  key={gym.id}
                  type="button"
                  className={`gym-tab ${gym.id === state.selectedGymId ? 'is-active' : ''}`}
                  onClick={() => actions.selectGym(gym.id)}
                >
                  {gym.name}
                </button>
              ))}
        </div>
      </div>
    </header>
  );
}

export {
  TopBar,
};
