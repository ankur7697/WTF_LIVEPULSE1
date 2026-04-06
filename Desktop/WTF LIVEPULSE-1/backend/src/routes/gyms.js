const express = require('express');
const { asyncRoute, apiError } = require('../utils/http');
const { isUuid, parseDateRange } = require('../utils/validation');

function createGymsRouter(store) {
  const router = express.Router();

  router.get(
    '/',
    asyncRoute(async (request, response) => {
      const gyms = await store.listGyms();
      response.json(gyms);
    }),
  );

  router.get(
    '/:id/live',
    asyncRoute(async (request, response) => {
      const { id } = request.params;

      if (!isUuid(id)) {
        throw apiError(400, 'Invalid gym id');
      }

      const snapshot = await store.getGymLiveSnapshot(id);
      if (!snapshot) {
        throw apiError(404, 'Gym not found');
      }

      response.json(snapshot);
    }),
  );

  router.get(
    '/:id/analytics',
    asyncRoute(async (request, response) => {
      const { id } = request.params;
      const dateRange = parseDateRange(request.query.dateRange);

      if (!isUuid(id)) {
        throw apiError(400, 'Invalid gym id');
      }

      if (!dateRange) {
        throw apiError(400, 'Invalid dateRange. Use 7d, 30d, or 90d.');
      }

      const analytics = await store.getGymAnalytics(id, dateRange);
      response.json(analytics);
    }),
  );

  return router;
}

module.exports = {
  createGymsRouter,
};

