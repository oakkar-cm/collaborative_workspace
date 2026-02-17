const logger = require("../utils/logger");

/**
 * Centralized error handler. Preserves existing response format:
 * - { message: string } with status 400, 401, 500 as before.
 */
function errorHandler(err, req, res, next) {
  logger.error(err);

  if (res.headersSent) {
    return next(err);
  }

  const status = err.statusCode || err.status || 500;
  const message = err.message || "Server error";

  res.status(status).json({ message });
}

module.exports = errorHandler;
