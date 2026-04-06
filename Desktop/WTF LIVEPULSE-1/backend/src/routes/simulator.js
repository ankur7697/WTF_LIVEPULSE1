const express = require('express');
const { asyncRoute, apiError } = require('../utils/http');
const { parseSpeed } = require('../utils/validation');

function createSimulatorRouter() {
  const router = express.Router();

  router.post(
    '/start',
    asyncRoute(async (request, response) => {
      const speed = parseSpeed(request.body?.speed || request.body?.speedMultiplier || 1);

      if (!speed) {
        throw apiError(400, 'Speed must be 1, 5, or 10');
      }

      response.json(request.app.locals.simulator.start(speed));
    }),
  );

  router.post(
    '/stop',
    asyncRoute(async (request, response) => {
      response.json(request.app.locals.simulator.stop());
    }),
  );

  router.post(
    '/reset',
    asyncRoute(async (request, response) => {
      response.json(await request.app.locals.simulator.reset());
    }),
  );

  return router;
}

module.exports = {
  createSimulatorRouter,
};
