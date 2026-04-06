const express = require('express');
const { asyncRoute, apiError } = require('../utils/http');
const { isUuid } = require('../utils/validation');

function createAnomaliesRouter(store) {
  const router = express.Router();

  router.get(
    '/',
    asyncRoute(async (request, response) => {
      const gymId = request.query.gym_id || null;
      const severity = request.query.severity || null;

      if (gymId && !isUuid(gymId)) {
        throw apiError(400, 'Invalid gym id');
      }

      if (severity && !['warning', 'critical'].includes(severity)) {
        throw apiError(400, 'Invalid severity filter');
      }

      const anomalies = await store.listAnomalies({
        gym_id: gymId,
        severity,
      });
      response.json(anomalies);
    }),
  );

  router.patch(
    '/:id/dismiss',
    asyncRoute(async (request, response) => {
      const { id } = request.params;

      if (!isUuid(id)) {
        throw apiError(400, 'Invalid anomaly id');
      }

      const updated = await store.dismissAnomaly(id);
      request.app.locals.wsHub?.broadcast({
        type: 'ANOMALY_RESOLVED',
        anomaly_id: updated.id,
        gym_id: updated.gym_id,
        resolved_at: updated.resolved_at,
      });
      response.json(updated);
    }),
  );

  return router;
}

module.exports = {
  createAnomaliesRouter,
};
