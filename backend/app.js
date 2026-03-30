const express = require("express");
const cors = require("cors");
const mountRoutes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const config = require("./config");

const app = express();

app.use(express.json());
app.set("trust proxy", 1);

const allowedOrigins = new Set(config.corsOrigins);
app.use(
  cors({
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
