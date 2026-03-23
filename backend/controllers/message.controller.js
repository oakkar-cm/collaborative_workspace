const messageService = require("../services/message.service");

async function create(req, res, next) {
  try {
    const { workspace_id, content } = req.body;
    if (!workspace_id || !content) {
      return res.status(400).json({ message: "workspace_id and content are required" });
    }
    const message = await messageService.create(workspace_id, req.user.userId, content);

    const io = req.app.get("io");
    if (io) io.to(workspace_id).emit("message", message);

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { workspace_id } = req.query;
    if (!workspace_id) {
      return res.status(400).json({ message: "workspace_id query param required" });
    }
    const messages = await messageService.listByWorkspace(workspace_id);
    res.json(messages);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list };
