const Message = require("../models/Message");

async function getByWorkspace(workspaceId) {
  return Message.find({ workspace_id: workspaceId }).sort({ createdAt: 1 });
}

async function create(workspaceId, content, userId, userName, userPicture) {
  const message = new Message({
    workspace_id: workspaceId,
    content,
    user_id: userId,
    user_name: userName,
    user_picture: userPicture || ""
  });
  await message.save();
  return message;
}

module.exports = { getByWorkspace, create };
