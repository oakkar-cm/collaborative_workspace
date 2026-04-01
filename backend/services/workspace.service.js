const Workspace = require("../models/Workspace");
const User = require("../models/User");

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
  const workspaces = await Workspace.find({ members: userId })
    .select("_id name owner members createdAt updatedAt")
    .sort({ updatedAt: -1 })
    .lean();
  return workspaces;
}

async function getWorkspaceById(workspaceId, userId) {
  const workspace = await Workspace.findOne({
    _id: workspaceId,
    members: userId
  }).select("_id name owner members createdAt updatedAt");
  if (!workspace) {
    const err = new Error("Workspace not found");
    err.statusCode = 404;
    throw err;
  }
  return workspace;
}

async function updateWorkspace(workspaceId, userId, updates) {
  const workspace = await Workspace.findOne({
    _id: workspaceId,
    owner: userId
  }).select("_id name owner members createdAt updatedAt");
  if (!workspace) {
    const err = new Error("Workspace not found or not owner");
    err.statusCode = 404;
    throw err;
  }
  Object.assign(workspace, updates);
  await workspace.save();
  return workspace;
}

async function deleteWorkspace(workspaceId, userId) {
  const workspace = await Workspace.findOne({
    _id: workspaceId,
    owner: userId
  }).select("_id name owner members");
  if (!workspace) {
    const err = new Error("Workspace not found or not owner");
    err.statusCode = 404;
    throw err;
  }
  await Workspace.deleteOne({ _id: workspaceId });
}

async function getMembers(workspaceId, userId) {
  const workspace = await Workspace.findOne({
    _id: workspaceId,
    members: userId
  }).select("_id members");
  if (!workspace) {
    const err = new Error("Workspace not found");
    err.statusCode = 404;
    throw err;
  }
  const users = await User.find(
    { _id: { $in: workspace.members } },
    "email firstName lastName avatar_url"
  ).lean();
  return users.map((u) => ({
    user_id: u._id,
    name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
    email: u.email,
    picture: u.avatar_url || ""
  }));
}

async function inviteMember(workspaceId, ownerUserId, email) {
  const workspace = await Workspace.findOne({
    _id: workspaceId,
    members: ownerUserId
  }).select("_id members");
  if (!workspace) {
    const err = new Error("Workspace not found");
    err.statusCode = 404;
    throw err;
  }
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    const err = new Error("User not found with that email");
    err.statusCode = 404;
    throw err;
  }
  if (workspace.members.some((m) => m.toString() === user._id.toString())) {
    const err = new Error("User is already a member");
    err.statusCode = 400;
    throw err;
  }
  workspace.members.push(user._id);
  await workspace.save();
  return { message: `${user.firstName} has been invited` };
}

module.exports = {
  createWorkspace,
  getWorkspacesByUser,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  getMembers,
  inviteMember
};
