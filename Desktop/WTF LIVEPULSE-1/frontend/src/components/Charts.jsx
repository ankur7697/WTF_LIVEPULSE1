import { Fragment } from 'react';
import { formatCurrency, formatDateTime, percentileToLevel } from '../lib/format';

function HeatmapChart({ data, loading = false, error = null }) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const rows = dayNames.map((label, dayIndex) => ({
    label,
    cells: Array.from({ length: 24 }, (_, hour) =>
      data.find((entry) => entry.day_of_week === dayIndex && entry.hour_of_day === hour) || {
        day_of_week: dayIndex,
        hour_of_day: hour,
        checkin_count: 0,
      }),
  }));

  const max = Math.max(1, ...data.map((entry) => Number(entry.checkin_count || 0)));

  return (
    <section className="panel-card">
      <div className="panel-card__header">
        <div>
          <h2 className="panel-card__title">7-day peak hours heatmap</h2>
          <p className="panel-card__subtitle">Check-in volume per hour of day, using the materialized view.</p>
        </div>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}
      {loading ? (
        <div className="feed-empty">Loading heatmap...</div>
      ) : (
        <div className="heatmap">
          <div />
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="heatmap__label" style={{ textAlign: 'center' }}>
              {hour}
            </div>
          ))}
          {rows.map((row) => (
            <Fragment key={row.label}>
              <div className="heatmap__label">{row.label}</div>
              {row.cells.map((cell) => {
                const level = percentileToLevel(Number(cell.checkin_count || 0), max);
                return (
                  <div
                    key={`${cell.day_of_week}-${cell.hour_of_day}`}
                    className="heatmap__cell"
                    data-level={level}
                    title={`${row.label} ${cell.hour_of_day}:00 · ${cell.checkin_count} check-ins`}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      )}
    </section>
  );
}

function RevenueBreakdown({ rows = [], loading = false, error = null }) {
  const max = Math.max(1, ...rows.map((row) => Number(row.total_revenue || 0)));

  return (
    <section className="panel-card">
      <div className="panel-card__header">
        <div>
          <h2 className="panel-card__title">Revenue by plan</h2>
          <p className="panel-card__subtitle">Last 30 days by default, filterable by date range.</p>
        </div>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}
      {loading ? (
        <div className="feed-empty">Loading revenue breakdown...</div>
      ) : (
        <div className="chart-stack">
          {rows.map((row) => (
            <div key={row.plan_type} className="bar-row">
              <div className="bar-row__header">
                <span>{row.plan_type}</span>
                <span>{formatCurrency(row.total_revenue)}</span>
              </div>
              <div className="bar-track">
                <div className="bar-track__fill" style={{ width: `${(Number(row.total_revenue || 0) / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RatioDonut({ ratio, loading = false }) {
  const pct = ratio?.new_joiner_pct || 0;

  return (
    <section className="panel-card">
      <div className="panel-card__header">
        <div>
          <h2 className="panel-card__title">New vs renewal ratio</h2>
          <p className="panel-card__subtitle">Memberships sold in the selected date range.</p>
        </div>
      </div>

      {loading ? (
        <div className="feed-empty">Loading ratio...</div>
      ) : (
        <div className="donut" style={{ position: 'relative' }}>
          <div className="donut__ring" style={{ '--pct': `${pct}%` }}>
            <div className="donut__center">
              <div>
                <div className="donut__value">{pct}%</div>
                <div className="donut__caption">new joiners</div>
              </div>
            </div>
          </div>
          <div className="muted mono">
            {ratio?.new_count || 0} new · {ratio?.renewal_count || 0} renewal
          </div>
        </div>
      )}
    </section>
  );
}

function RankingBars({ rows = [], loading = false, error = null }) {
  const max = Math.max(1, ...rows.map((row) => Number(row.total_revenue || 0)));

  return (
    <section className="panel-card">
      <div className="panel-card__header">
        <div>
          <h2 className="panel-card__title">Cross-gym revenue ranking</h2>
          <p className="panel-card__subtitle">All 10 gyms ranked by trailing 30-day revenue.</p>
        </div>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}
      {loading ? (
        <div className="feed-empty">Loading ranking...</div>
      ) : (
        <div className="ranking-list">
          {rows.map((row) => (
            <div className="ranking-item" key={row.gym_id}>
              <div className="ranking-item__top">
                <span className="ranking-item__name">
                  #{row.rank} {row.gym_name}
                </span>
                <span className="ranking-item__value">{formatCurrency(row.total_revenue)}</span>
              </div>
              <div className="bar-track">
                <div className="bar-track__fill" style={{ width: `${(Number(row.total_revenue || 0) / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ChurnRiskPanel({ rows = [], loading = false, error = null }) {
  return (
    <section className="panel-card">
      <div className="panel-card__header">
        <div>
          <h2 className="panel-card__title">Churn risk members</h2>
          <p className="panel-card__subtitle">Active members who have not checked in for 45+ days.</p>
        </div>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}
      {loading ? (
        <div className="feed-empty">Loading churn risk...</div>
      ) : rows.length ? (
        <div className="feed-list">
          {rows.slice(0, 10).map((row) => (
            <article className="feed-item" key={row.id}>
              <span className={`feed-item__badge ${row.risk_level === 'Critical' ? 'checkout' : ''}`} />
              <div>
                <div className="feed-item__member">{row.name}</div>
                <div className="feed-item__meta">
                  Last check-in {formatDateTime(row.last_checkin_at)} · {row.days_since_checkin} days inactive
                </div>
              </div>
              <div className={`pill ${row.risk_level === 'Critical' ? 'pill--critical' : 'pill--warning'}`}>{row.risk_level}</div>
            </article>
          ))}
        </div>
      ) : (
        <div className="feed-empty">No churn risk members in this range.</div>
      )}
    </section>
  );
}

export {
  ChurnRiskPanel,
  HeatmapChart,
  RankingBars,
  RatioDonut,
  RevenueBreakdown,
};
