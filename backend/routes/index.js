const authRoutes = require("./auth.routes");
const workspaceRoutes = require("./workspace.routes");

function mountRoutes(app) {
  app.use("/api", authRoutes);
  app.use("/api/workspaces", workspaceRoutes);
}

module.exports = mountRoutes;
