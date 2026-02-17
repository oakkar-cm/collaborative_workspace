/**
 * Simple validation helpers. Use to reject invalid input before hitting services.
 * Does not change success-path behavior.
 */
function requireWorkspaceName(req, res, next) {
  const name = req.body && req.body.name;
  if (name == null || String(name).trim() === "") {
    return res.status(400).json({ message: "Workspace name is required" });
  }
  req.body.name = String(name).trim();
  next();
}

module.exports = {
  requireWorkspaceName
};
