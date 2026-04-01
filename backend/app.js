const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const mountRoutes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const config = require("./config");
const logger = require("./utils/logger");

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.set("trust proxy", config.trustProxy);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(mongoSanitize());
app.use(hpp());
app.use(compression());
app.use(morgan(config.isProduction ? "combined" : "dev", {
  stream: { write: (message) => logger.info(message.trim()) }
}));

const apiLimiter = rateLimit({
  windowMs: config.apiRateLimitWindowMs,
  max: config.apiRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api", apiLimiter);

const authLimiter = rateLimit({
  windowMs: config.authRateLimitWindowMs,
  max: config.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts. Please try again later." }
});
app.use("/api/login", authLimiter);
app.use("/api/register", authLimiter);
app.use("/api/auth/session", authLimiter);

const allowedOrigins = new Set(config.corsOrigins);
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      // Allow non-browser requests (curl, health checks) with no Origin header.
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error("CORS origin not allowed"));
    }
  })
);

mountRoutes(app);

app.use(errorHandler);

module.exports = app;
