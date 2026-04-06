import {
  ChurnRiskPanel,
  HeatmapChart,
  RankingBars,
  RatioDonut,
  RevenueBreakdown,
} from '../components/Charts';
import { Skeleton } from '../components/Skeleton';
import { useDashboardState } from '../hooks/useDashboard';

function AnalyticsPage() {
  const { state, actions } = useDashboardState();

  return (
    <div className="section-stack">
      <section className="panel-card">
        <div className="panel-card__header">
          <div>
            <h2 className="panel-card__title">Analytics engine</h2>
            <p className="panel-card__subtitle">The selected gym drives all analytics panels.</p>
          </div>
          <div className="control-group">
            <label className="muted" htmlFor="date-range">
              Date range
            </label>
            <select
              id="date-range"
              className="select-control"
              value={state.dateRange}
              onChange={(event) => actions.changeDateRange(event.target.value)}
            >
              <option value="7d">7d</option>
              <option value="30d">30d</option>
              <option value="90d">90d</option>
            </select>
          </div>
        </div>

        {state.loading.analytics ? (
          <div className="feed-empty">Loading analytics for the selected gym...</div>
        ) : state.analytics ? (
          <div className="controls-row">
            <div>
              <div className="muted">Selected gym</div>
              <div className="mono">{state.analytics.gym.name}</div>
            </div>
            <div>
              <div className="muted">Date range</div>
              <div className="mono">{state.analytics.date_range}</div>
            </div>
          </div>
        ) : (
          <Skeleton className="feed-empty" />
        )}
      </section>

      <div className="analytics-grid">
        <div className="section-stack">
          <HeatmapChart
            data={state.analytics?.heatmap || []}
            loading={state.loading.analytics}
            error={state.errors.analytics}
          />

          <RevenueBreakdown
            rows={state.analytics?.revenue_by_plan || []}
            loading={state.loading.analytics}
            error={state.errors.analytics}
          />
        </div>

        <div className="section-stack">
          <RatioDonut
            ratio={state.analytics?.new_renewal_ratio}
            loading={state.loading.analytics}
          />

          <ChurnRiskPanel
            rows={state.analytics?.churn_risk || []}
            loading={state.loading.analytics}
            error={state.errors.analytics}
          />

          <RankingBars
            rows={state.crossGymRevenue || []}
            loading={state.loading.crossGymRevenue}
            error={state.errors.crossGymRevenue}
          />
        </div>
      </div>
    </div>
  );
}

export {
  AnalyticsPage,
};

