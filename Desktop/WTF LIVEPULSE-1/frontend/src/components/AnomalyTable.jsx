import { formatDateTime } from '../lib/format';

function AnomalyTable({ rows, loading = false, error = null, onDismiss }) {
  return (
    <section className="panel-card">
      <div className="panel-card__header">
        <div>
          <h2 className="panel-card__title">Anomaly log</h2>
          <p className="panel-card__subtitle">Resolved anomalies remain visible for 24 hours.</p>
        </div>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}
      {loading ? (
        <div className="feed-empty">Loading anomalies...</div>
      ) : rows.length ? (
        <table className="table">
          <thead>
            <tr>
              <th>Gym Name</th>
              <th>Anomaly Type</th>
              <th>Severity</th>
              <th>Time Detected</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const canDismiss = row.severity === 'warning' && !row.dismissed && !row.resolved;
              return (
                <tr key={row.id}>
                  <td>{row.gym_name}</td>
                  <td>{row.type.replaceAll('_', ' ')}</td>
                  <td>
                    <span className={`pill ${row.severity === 'critical' ? 'pill--critical' : 'pill--warning'}`}>{row.severity}</span>
                  </td>
                  <td>{formatDateTime(row.detected_at)}</td>
                  <td>
                    <span className={`pill ${row.dismissed ? 'pill--warning' : row.resolved ? 'pill--good' : 'pill--critical'}`}>
                      {row.dismissed ? 'Dismissed' : row.resolved ? 'Resolved' : 'Active'}
                    </span>
                  </td>
                  <td>
                    {canDismiss ? (
                      <button
                        type="button"
                        className="control-button"
                        onClick={() => onDismiss(row.id)}
                      >
                        Dismiss
                      </button>
                    ) : (
                      <span className="muted">{row.severity === 'critical' ? 'Critical' : 'Auto-managed'}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="feed-empty">No anomalies found.</div>
      )}
    </section>
  );
}

export {
  AnomalyTable,
};
