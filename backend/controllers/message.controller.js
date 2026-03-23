const messageService = require("../services/message.service");
const User = require("../models/User");

async function list(req, res, next) {
  try {
    const { workspace_id } = req.query;
    if (!workspace_id) {
      return res.status(400).json({ message: "workspace_id is required" });
    }
    const messages = await messageService.getByWorkspace(workspace_id);
    res.json(messages);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { workspace_id, content } = req.body;
    if (!workspace_id || !content) {
      return res.status(400).json({ message: "workspace_id and content are required" });
    }

    const user = await User.findById(req.user.userId).select("firstName lastName").lean();
    const userName = user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || req.user.email
      : req.user.email;

    const message = await messageService.create(
      workspace_id, content, req.user.userId, userName, ""
    );

    const io = req.app.get("io");
    if (io) {
      io.to(workspace_id).emit("message", message.toJSON());
    }

    res.json(message);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create };
