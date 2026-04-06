const express = require('express');
const { asyncRoute, apiError } = require('../utils/http');
const { isUuid } = require('../utils/validation');

function createMembersRouter(store) {
  const router = express.Router();

  router.get(
    '/',
    asyncRoute(async (request, response) => {
      const gymId = request.query.gym_id || null;

      if (!gymId) {
        throw apiError(400, 'gym_id query parameter is required');
      }

      if (!isUuid(gymId)) {
        throw apiError(400, 'Invalid gym id');
      }

      const members = await store.getMembersForGym(gymId);
      response.json(members);
    }),
  );

  return router;
}

module.exports = {
  createMembersRouter,
};
