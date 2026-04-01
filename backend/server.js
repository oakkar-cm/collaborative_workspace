const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const { connect } = require("./db");
const config = require("./config");
const logger = require("./utils/logger");
const { initializeSocket } = require("./socket");

const server = http.createServer(app);
const allowedOrigins = new Set(config.corsOrigins);
const io = new Server(server, {
  cors: {
    credentials: true,
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error("Socket CORS origin not allowed"));
    }
  },
  path: "/api/socket.io",
  pingInterval: 25000,
  pingTimeout: 20000,
  connectTimeout: 10000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true
  }
});

app.set("io", io);

initializeSocket(io);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logger.error(`Port ${config.port} is already in use. Stop the other process or set PORT in .env`);
  } else {
    logger.error("Server error", err);
  }
  process.exit(1);
});

async function start() {
  await connect();
  server.listen(config.port, () => {
    logger.info(`Server running on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  logger.error("Failed to start server", err);
  process.exit(1);
});
