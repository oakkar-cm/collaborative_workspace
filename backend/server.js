const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const { connect } = require("./db");
const config = require("./config");
const logger = require("./utils/logger");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  logger.info("User connected:", socket.id);
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
