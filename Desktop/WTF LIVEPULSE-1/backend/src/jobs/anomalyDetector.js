const { evaluateAnomalyCycle } = require('../services/anomalyService');

function createAnomalyDetector({ store, wsHub, intervalMs = 30000 }) {
  let timer = null;
  let running = false;
  let inFlight = false;

  async function runCycle() {
    if (inFlight) {
      return;
    }

    inFlight = true;

    try {
      const gyms = await store.listGyms();
      const activeAnomalies = (await store.listAnomalies({})).filter((anomaly) => !anomaly.resolved);
      const liveSnapshots = new Map();

      await Promise.all(
        gyms.map(async (gym) => {
          const snapshot = await store.getGymLiveSnapshot(gym.id);
          liveSnapshots.set(gym.id, snapshot);
        }),
      );

      const { created, resolved } = evaluateAnomalyCycle({
        gyms,
        liveSnapshotByGymId: liveSnapshots,
        activeAnomalies,
        now: new Date(),
      });

      for (const anomaly of created) {
        const inserted = await store.insertAnomaly(anomaly);
        wsHub.broadcast({
          type: 'ANOMALY_DETECTED',
          anomaly_id: inserted.id,
          gym_id: inserted.gym_id,
          gym_name: gyms.find((gym) => gym.id === inserted.gym_id)?.name || 'Unknown gym',
          anomaly_type: inserted.type,
          severity: inserted.severity,
          message: inserted.message,
        });
      }

      for (const anomaly of resolved) {
        const updated = await store.resolveAnomaly(anomaly.id);
        if (updated) {
          wsHub.broadcast({
            type: 'ANOMALY_RESOLVED',
            anomaly_id: updated.id,
            gym_id: updated.gym_id,
            resolved_at: updated.resolved_at,
          });
        }
      }
    } finally {
      inFlight = false;
    }
  }

  function start() {
    if (running) {
      return;
    }

    running = true;
    timer = setInterval(runCycle, intervalMs);
    runCycle().catch(() => {});
  }

  function stop() {
    running = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    start,
    stop,
    runCycle,
    get running() {
      return running;
    },
  };
}

module.exports = {
  createAnomalyDetector,
};

