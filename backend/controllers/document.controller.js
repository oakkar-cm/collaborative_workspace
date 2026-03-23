const documentService = require("../services/document.service");

async function list(req, res, next) {
  try {
    const { workspace_id } = req.query;
    if (!workspace_id) {
      return res.status(400).json({ message: "workspace_id is required" });
    }
    const docs = await documentService.getByWorkspace(workspace_id);
    res.json(docs);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { workspace_id, title } = req.body;
    if (!workspace_id || !title) {
      return res.status(400).json({ message: "workspace_id and title are required" });
    }
    const doc = await documentService.create(workspace_id, title, req.user.userId);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { content, title } = req.body;
    const updates = {};
    if (content !== undefined) updates.content = content;
    if (title !== undefined) updates.title = title;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No update fields provided" });
    }
    const doc = await documentService.update(id, updates);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await documentService.remove(id);
    res.json({ message: "Document deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
