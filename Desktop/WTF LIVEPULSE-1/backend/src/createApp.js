const express = require('express');
const { sendError } = require('./utils/http');
const { createMembersRouter } = require('./routes/members');
const { createGymsRouter } = require('./routes/gyms');
const { createAnomaliesRouter } = require('./routes/anomalies');
const { createAnalyticsRouter } = require('./routes/analytics');
const { createSimulatorRouter } = require('./routes/simulator');
const { createNoopHub } = require('./websocket/server');

function createNoopSimulator() {
  return {
    start(speed = 1) {
      return { status: 'running', speed };
    },
    stop() {
      return { status: 'paused' };
    },
    reset() {
      return Promise.resolve({ status: 'reset' });
    },
    getState() {
      return { status: 'paused', speed: 1 };
    },
  };
}

function createApp({ store, simulator = createNoopSimulator(), wsHub = createNoopHub() }) {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.locals.store = store;
  app.locals.simulator = simulator;
  app.locals.wsHub = wsHub;

  app.get('/healthz', (request, response) => {
    response.json({ ok: true });
  });

  app.use('/api/gyms', createGymsRouter(store));
  app.use('/api/members', createMembersRouter(store));
  app.use('/api/anomalies', createAnomaliesRouter(store));
  app.use('/api/analytics', createAnalyticsRouter(store));
  app.use('/api/simulator', createSimulatorRouter());

  app.use((error, request, response, next) => {
    sendError(response, error);
  });

  return app;
}

module.exports = {
  createApp,
};
