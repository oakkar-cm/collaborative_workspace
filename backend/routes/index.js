const mongoose = require("mongoose");
const authRoutes = require("./auth.routes");
const workspaceRoutes = require("./workspace.routes");
const documentRoutes = require("./document.routes");
const taskRoutes = require("./task.routes");
const messageRoutes = require("./message.routes");
const fileRoutes = require("./file.routes");

function mountRoutes(app) {
  app.get("/api/health", (req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    res.json({ ok: true, db: dbConnected ? "connected" : "disconnected" });
  });
  app.use("/api", authRoutes);
  app.use("/api/workspaces", workspaceRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/files", fileRoutes);
}

module.exports = mountRoutes;
