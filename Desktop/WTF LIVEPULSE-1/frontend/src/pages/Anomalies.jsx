import { AnomalyTable } from '../components/AnomalyTable';
import { useAnomalies } from '../hooks/useAnomalies';

function AnomaliesPage() {
  const { anomalies, loading, error, unreadCount, dismissAnomaly } = useAnomalies();

  async function handleDismiss(id) {
    const anomaly = anomalies.find((item) => item.id === id);
    if (!anomaly) {
      return;
    }

    const confirmed = window.confirm(`Dismiss ${anomaly.type.replaceAll('_', ' ')} for ${anomaly.gym_name}?`);
    if (!confirmed) {
      return;
    }

    await dismissAnomaly(id);
  }

  return (
    <div className="section-stack">
      <section className="panel-card">
        <div className="panel-card__header">
          <div>
            <h2 className="panel-card__title">Anomalies</h2>
            <p className="panel-card__subtitle">Critical anomalies stay visible and cannot be dismissed.</p>
          </div>
          <div className="pill">{unreadCount} active</div>
        </div>
      </section>

      <AnomalyTable
        rows={anomalies}
        loading={loading}
        error={error}
        onDismiss={handleDismiss}
      />
    </div>
  );
}

export {
  AnomaliesPage,
};
