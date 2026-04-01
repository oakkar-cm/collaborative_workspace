/**
 * Centralized configuration from environment variables.
 * Use .env in development; do not commit secrets.
 */
const dotenv = require("dotenv");

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const jwtSecret = process.env.JWT_SECRET || "";

if (isProduction && (!jwtSecret || jwtSecret.length < 32)) {
  throw new Error("JWT_SECRET must be set with at least 32 characters in production");
}

module.exports = {
  nodeEnv,
  isProduction,
  port: parseInt(process.env.PORT, 10) || 5000,
  mongodbUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/collab_workspace",
  mongodbDnsServers: (process.env.MONGODB_DNS_SERVERS || "8.8.8.8,1.1.1.1")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean),
  jwtSecret: jwtSecret || "dev-only-insecure-jwt-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  authCookieName: process.env.AUTH_COOKIE_NAME || "synapse_auth",
  authCookieSameSite: process.env.AUTH_COOKIE_SAMESITE || (isProduction ? "strict" : "lax"),
  authCookieSecure: process.env.AUTH_COOKIE_SECURE === "true" || isProduction,
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  trustProxy: process.env.TRUST_PROXY || 1,
  shouldSyncIndexes: process.env.SYNC_INDEXES === "true",
  apiRateLimitWindowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || "60000", 10),
  apiRateLimitMax: parseInt(process.env.API_RATE_LIMIT_MAX || "300", 10),
  authRateLimitWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || "600000", 10),
  authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || "20", 10),
  turnCredentialTtlSeconds: parseInt(process.env.TURN_CREDENTIAL_TTL_SECONDS || "300", 10),
  turnSharedSecret: process.env.TURN_SHARED_SECRET || "",
  turnUrls: (process.env.TURN_URLS || "").split(",").map((url) => url.trim()).filter(Boolean),
  stunUrls: (process.env.STUN_URLS || "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  corsOrigins: (
    process.env.CORS_ORIGINS ||
    process.env.CLIENT_URL ||
    "http://localhost:3000"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
};
