import { ActivityFeed } from '../components/ActivityFeed';
import { MetricCard } from '../components/MetricCard';
import { SimulatorPanel } from '../components/SimulatorPanel';
import { Skeleton } from '../components/Skeleton';
import { useDashboardState } from '../hooks/useDashboard';

function DashboardPage() {
  const { state } = useDashboardState();
  const snapshot = state.selectedGymSnapshot;

  return (
    <div className="screen-grid dashboard">
      <div className="section-stack">
        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <h2 className="panel-card__title">
                {snapshot ? snapshot.gym.name : 'Loading selected gym...'}
              </h2>
              <p className="panel-card__subtitle">
                {snapshot ? `${snapshot.gym.city} · ${snapshot.gym.capacity} capacity` : 'Fetching live snapshot and analytics.'}
              </p>
            </div>
            {snapshot ? (
              <span className={`pill ${snapshot.occupancy_tone === 'critical' ? 'pill--critical' : snapshot.occupancy_tone === 'warning' ? 'pill--warning' : 'pill--good'}`}>
                {snapshot.capacity_pct}% occupied
              </span>
            ) : null}
          </div>

          {state.errors.selectedGym ? <div className="panel-error">{state.errors.selectedGym}</div> : null}
          {state.loading.selectedGym ? (
            <div className="kpi-grid">
              <Skeleton className="kpi-card" style={{ minHeight: 120 }} />
              <Skeleton className="kpi-card" style={{ minHeight: 120 }} />
              <Skeleton className="kpi-card" style={{ minHeight: 120 }} />
            </div>
          ) : snapshot ? (
            <div className="kpi-grid">
              <MetricCard
                label="Current occupancy"
                value={snapshot.current_occupancy}
                tone={snapshot.occupancy_tone}
                footer={`${snapshot.capacity_pct}% of capacity`}
              />
              <MetricCard
                label="Today's revenue"
                value={snapshot.today_revenue}
                tone="ok"
                formatter={(value) => state.formatCurrency(value)}
                footer={`Last week same day: ${state.formatCurrency(snapshot.last_week_revenue)}`}
              />
              <MetricCard
                label="Active anomalies"
                value={snapshot.active_anomalies?.filter((item) => !item.resolved)?.length || 0}
                tone={(snapshot.active_anomalies?.length || 0) > 0 ? 'warning' : 'ok'}
                footer={`Last check-in ${state.formatDateTime(snapshot.last_checkin_at)}`}
              />
            </div>
          ) : null}

          {snapshot ? (
            <div style={{ marginTop: 16 }} className="controls-row">
              <div className="muted">
                Status: <span className="mono">{snapshot.gym.status}</span>
              </div>
              <div className="muted">
                WebSocket: <span className="mono">{state.wsConnected ? 'connected' : 'disconnected'}</span>
              </div>
            </div>
          ) : null}
        </section>

        <ActivityFeed
          title="Live activity feed"
          events={state.activityFeed}
          loading={state.loading.bootstrap}
          error={state.errors.bootstrap}
        />
      </div>

      <div className="section-stack">
        <SimulatorPanel />

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <h2 className="panel-card__title">Selected gym anomalies</h2>
              <p className="panel-card__subtitle">Recent warnings and critical alerts for the active gym.</p>
            </div>
          </div>

          {snapshot?.active_anomalies?.length ? (
            <div className="feed-list">
              {snapshot.active_anomalies.map((anomaly) => (
                <article className="feed-item" key={anomaly.id}>
                  <span className={`feed-item__badge ${anomaly.severity === 'critical' ? 'checkout' : ''}`} />
                  <div>
                    <div className="feed-item__member">{anomaly.type.replaceAll('_', ' ')}</div>
                    <div className="feed-item__meta">{anomaly.message}</div>
                  </div>
                  <div className={`pill ${anomaly.severity === 'critical' ? 'pill--critical' : 'pill--warning'}`}>{anomaly.severity}</div>
                </article>
              ))}
            </div>
          ) : (
            <div className="feed-empty">No active anomalies for the selected gym.</div>
          )}
        </section>
      </div>
    </div>
  );
}

export {
  DashboardPage,
};
