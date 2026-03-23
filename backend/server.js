const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const { connect } = require("./db");
const config = require("./config");
const logger = require("./utils/logger");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  path: "/api/socket.io"
});

app.set("io", io);

const whiteboardState = {};

io.on("connection", (socket) => {
  logger.info("User connected:", socket.id);

  socket.on("join_room", (data) => {
    if (data.room_id) {
      socket.join(data.room_id);
      logger.info(`Socket ${socket.id} joined room ${data.room_id}`);
    }
  });

  socket.on("document_update", (data) => {
    if (data.workspace_id) {
      socket.to(data.workspace_id).emit("document_update", data);
    }
  });

  socket.on("typing_start", (data) => {
    if (data.workspace_id) {
      socket.to(data.workspace_id).emit("typing_indicator", { ...data, isTyping: true });
    }
  });

  socket.on("typing_stop", (data) => {
    if (data.workspace_id) {
      socket.to(data.workspace_id).emit("typing_indicator", { ...data, isTyping: false });
    }
  });

  socket.on("whiteboard:request", (data) => {
    const wsId = data.workspace_id;
    if (wsId && whiteboardState[wsId]) {
      socket.emit("whiteboard:init", { workspace_id: wsId, ...whiteboardState[wsId] });
    }
  });

  socket.on("whiteboard:update", (data) => {
    const wsId = data.workspace_id;
    if (!wsId) return;

    if (!whiteboardState[wsId]) {
      whiteboardState[wsId] = { stickyNotes: [], shapes: [], paths: [], texts: [] };
    }
    if (data.type === "sticky") whiteboardState[wsId].stickyNotes = data.stickyNotes || [];
    else if (data.type === "shape") whiteboardState[wsId].shapes = data.shapes || [];
    else if (data.type === "path") whiteboardState[wsId].paths = data.paths || [];
    else if (data.type === "text") whiteboardState[wsId].texts = data.texts || [];
    else if (data.type === "delete") {
      whiteboardState[wsId].stickyNotes = data.stickyNotes || [];
      whiteboardState[wsId].shapes = data.shapes || [];
      whiteboardState[wsId].texts = data.texts || [];
    } else if (data.type === "clear") {
      whiteboardState[wsId] = { stickyNotes: [], shapes: [], paths: [], texts: [] };
    }

    socket.to(wsId).emit("whiteboard:update", data);
  });

  socket.on("disconnect", () => {
    logger.info("User disconnected:", socket.id);
  });
});

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
