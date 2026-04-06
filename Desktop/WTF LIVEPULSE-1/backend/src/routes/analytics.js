const express = require('express');
const { asyncRoute } = require('../utils/http');
const { parseDateRange } = require('../utils/validation');

function createAnalyticsRouter(store) {
  const router = express.Router();

  router.get(
    '/cross-gym',
    asyncRoute(async (request, response) => {
      const dateRange = parseDateRange(request.query.dateRange);
      const results = await store.getCrossGymRevenue(dateRange || '30d');
      response.json(results);
    }),
  );

  return router;
}

module.exports = {
  createAnalyticsRouter,
};

