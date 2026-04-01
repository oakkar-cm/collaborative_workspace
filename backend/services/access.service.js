const mongoose = require("mongoose");
const Workspace = require("../models/Workspace");

function assertValidObjectId(id, message = "Invalid id format") {
  if (!mongoose.isValidObjectId(id)) {
    const err = new Error(message);
    err.statusCode = 400;
    throw err;
  }
}

async function assertWorkspaceMember(workspaceId, userId) {
  assertValidObjectId(workspaceId, "Invalid workspace id");
  assertValidObjectId(userId, "Invalid user id");

  const isMember = await Workspace.exists({ _id: workspaceId, members: userId });
  if (!isMember) {
    const err = new Error("Workspace not found");
    err.statusCode = 404;
    throw err;
  }
}

module.exports = {
  assertValidObjectId,
  assertWorkspaceMember
};
