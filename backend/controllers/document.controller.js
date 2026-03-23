const documentService = require("../services/document.service");

async function create(req, res, next) {
  try {
    const { workspace_id, title } = req.body;
    if (!workspace_id || !title) {
      return res.status(400).json({ message: "workspace_id and title are required" });
    }
    const doc = await documentService.create(workspace_id, title, req.user.userId);
    res.status(201).json(doc);
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
    const docs = await documentService.listByWorkspace(workspace_id);
    res.json(docs);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const doc = await documentService.getById(req.params.id);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const doc = await documentService.update(req.params.id, req.body);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await documentService.remove(req.params.id);
    res.json({ message: "Document deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getById, update, remove };
