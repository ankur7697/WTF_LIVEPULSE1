const http = require('http');
const { createApp } = require('./createApp');
const { createPgStore } = require('./store/pgStore');
const { createWebSocketHub } = require('./websocket/server');
const { createAnomalyDetector } = require('./jobs/anomalyDetector');
const { createSimulatorController } = require('./jobs/simulator');
const { startHeatmapRefreshJob } = require('./jobs/refreshMaterializedView');

async function bootstrap() {
  const store = createPgStore();
  await store.ensureSeeded();

  const app = createApp({ store });
  const server = http.createServer(app);
  const wsHub = createWebSocketHub(server);
  const simulator = createSimulatorController({ store, wsHub });
  const anomalyDetector = createAnomalyDetector({ store, wsHub });
  const heatmapRefresh = startHeatmapRefreshJob({ store });

  app.locals.wsHub = wsHub;
  app.locals.simulator = simulator;
  app.locals.anomalyDetector = anomalyDetector;
  app.locals.heatmapRefresh = heatmapRefresh;

  const port = Number(process.env.PORT || 3001);

  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`WTF LivePulse backend listening on ${port}`);
  });

  anomalyDetector.start();

  return {
    app,
    server,
    store,
    wsHub,
    simulator,
    anomalyDetector,
    heatmapRefresh,
  };
}

if (require.main === module) {
  bootstrap().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  bootstrap,
};

