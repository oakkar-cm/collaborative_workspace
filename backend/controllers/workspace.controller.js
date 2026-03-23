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

async function update(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "name is required" });
    }
    const workspace = await workspaceService.updateWorkspace(
      req.params.id,
      req.user.userId,
      { name: name.trim() }
    );
    res.json(workspace);
  } catch (err) {
    next(err);
  }
}

async function invite(req, res, next) {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "email is required" });
    }
    const result = await workspaceService.inviteMember(
      req.params.id,
      req.user.userId,
      email
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
  update,
  remove,
  getMembers,
  invite
};
