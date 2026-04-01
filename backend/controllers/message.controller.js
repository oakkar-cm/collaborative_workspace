const messageService = require("../services/message.service");

async function create(req, res, next) {
  try {
    const { workspace_id } = req.body;
    if (!workspace_id) {
      return res.status(400).json({ message: "workspace_id is required" });
    }
    const message = await messageService.create(workspace_id, req.user.userId, req.body);

    const io = req.app.get("io");
    if (io) io.to(workspace_id).emit("message", message);

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { workspace_id, page, limit } = req.query;
    if (!workspace_id) {
      return res.status(400).json({ message: "workspace_id query param required" });
    }
    const messages = await messageService.listByWorkspace(workspace_id, req.user.userId, { page, limit });
    res.json(messages);
  } catch (err) {
    next(err);
  }
}

async function votePoll(req, res, next) {
  try {
    const { messageId } = req.params;
    const { workspace_id, option_id } = req.body;
    if (!workspace_id || !option_id) {
      return res.status(400).json({ message: "workspace_id and option_id are required" });
    }

    const updated = await messageService.votePoll(workspace_id, messageId, req.user.userId, option_id);

    const io = req.app.get("io");
    if (io) io.to(workspace_id).emit("message_updated", updated);

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function addPollOption(req, res, next) {
  try {
    const { messageId } = req.params;
    const { workspace_id, option_text } = req.body;
    if (!workspace_id || !option_text) {
      return res.status(400).json({ message: "workspace_id and option_text are required" });
    }

    const updated = await messageService.addPollOption(workspace_id, messageId, req.user.userId, option_text);

    const io = req.app.get("io");
    if (io) io.to(workspace_id).emit("message_updated", updated);

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, votePoll, addPollOption };
