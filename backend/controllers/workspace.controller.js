const workspaceService = require("../services/workspace.service");

async function create(req, res, next) {
  try {
    const { name } = req.body;
    const workspace = await workspaceService.createWorkspace(
      name,
      req.user.userId
    );
    res.json(workspace);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const workspaces = await workspaceService.getWorkspacesByUser(
      req.user.userId
    );
    res.json(workspaces);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  list
};
