const Workspace = require("../models/Workspace");

/**
 * Business logic for workspaces. Same behavior as original routes.
 */
async function createWorkspace(name, userId) {
  const workspace = new Workspace({
    name,
    owner: userId,
    members: [userId]
  });
  await workspace.save();
  return workspace;
}

async function getWorkspacesByUser(userId) {
  const workspaces = await Workspace.find({ members: userId });
  return workspaces;
}

module.exports = {
  createWorkspace,
  getWorkspacesByUser
};
