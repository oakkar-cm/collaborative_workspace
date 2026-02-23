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

  let status = err.statusCode || err.status || 500;
  let message = err.message || "Server error";

  // Mongoose validation error (e.g. required field missing)
  if (err.name === "ValidationError") {
    status = 400;
    const firstError = err.errors && Object.values(err.errors)[0];
    message = firstError ? firstError.message : "Validation failed";
  }

  // MongoDB duplicate key (e.g. email already exists)
  if (err.code === 11000) {
    status = 400;
    message = "User already exists";
  }

  res.status(status).json({ message });
}

module.exports = errorHandler;
