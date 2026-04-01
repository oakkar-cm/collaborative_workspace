const mongoose = require("mongoose");
const authRoutes = require("./auth.routes");
const workspaceRoutes = require("./workspace.routes");
const documentRoutes = require("./document.routes");
const taskRoutes = require("./task.routes");
const messageRoutes = require("./message.routes");
const fileRoutes = require("./file.routes");
const commentRoutes = require("./comment.routes");
const userRoutes = require("./user.routes");
const rtcRoutes = require("./rtc.routes");

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
  app.use("/api/comments", commentRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/rtc", rtcRoutes);
}

module.exports = mountRoutes;
