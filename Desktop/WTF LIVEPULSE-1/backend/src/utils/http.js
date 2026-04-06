function apiError(status, message, details = null) {
  return {
    status,
    message,
    details,
  };
}

function asyncRoute(handler) {
  return function routeWrapper(request, response, next) {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function sendError(response, error) {
  const status = error.status || 500;
  response.status(status).json({
    error: error.message || 'Internal Server Error',
    details: error.details || null,
  });
}

module.exports = {
  apiError,
  asyncRoute,
  sendError,
};

