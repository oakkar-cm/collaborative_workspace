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

async function getById(req, res, next) {
  try {
    const workspace = await workspaceService.getWorkspaceById(
      req.params.id,
      req.user.userId
    );
    res.json(workspace);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await workspaceService.deleteWorkspace(req.params.id, req.user.userId);
    res.json({ message: "Workspace deleted" });
  } catch (err) {
    next(err);
  }
}

async function getMembers(req, res, next) {
  try {
    const members = await workspaceService.getMembers(
      req.params.id,
      req.user.userId
    );
    res.json(members);
  } catch (err) {
    next(err);
  }
}

async function invite(req, res, next) {
  try {
    const result = await workspaceService.inviteMember(
      req.params.id,
      req.user.userId,
      req.body.email
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  list,
  getById,
  remove,
  getMembers,
  invite
};
