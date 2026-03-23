const Message = require("../models/Message");
const User = require("../models/User");

async function create(workspaceId, userId, content) {
  const user = await User.findById(userId).select("firstName lastName email").lean();
  const userName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
    : "Unknown";

  const message = new Message({
    workspace_id: workspaceId,
    user_id: userId,
    user_name: userName,
    content
  });
  await message.save();
  return formatMessage(message);
}

async function listByWorkspace(workspaceId) {
  const messages = await Message.find({ workspace_id: workspaceId })
    .sort({ createdAt: 1 })
    .lean();
  return messages.map(formatMessage);
}

function formatMessage(msg) {
  return {
    message_id: msg._id,
    workspace_id: msg.workspace_id,
    user_id: msg.user_id,
    user_name: msg.user_name || "Unknown",
    user_picture: msg.user_picture || "",
    content: msg.content,
    created_at: msg.createdAt || msg.created_at
  };
}

module.exports = { create, listByWorkspace };
