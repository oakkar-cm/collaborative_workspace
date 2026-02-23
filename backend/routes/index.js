const mongoose = require("mongoose");
const authRoutes = require("./auth.routes");
const workspaceRoutes = require("./workspace.routes");

function mountRoutes(app) {
  app.get("/api/health", (req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    res.json({ ok: true, db: dbConnected ? "connected" : "disconnected" });
  });
  app.use("/api", authRoutes);
  app.use("/api/workspaces", workspaceRoutes);
}

module.exports = mountRoutes;
