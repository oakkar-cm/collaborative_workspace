/**
 * Centralized configuration from environment variables.
 * Use .env in development; do not commit secrets.
 */
const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 5000,
  mongodbUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/collab_workspace",
  jwtSecret: process.env.JWT_SECRET || "cp3407_secret_key",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h"
};
