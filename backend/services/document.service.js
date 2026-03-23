const Document = require("../models/Document");

async function getByWorkspace(workspaceId) {
  return Document.find({ workspace_id: workspaceId }).sort({ updatedAt: -1 });
}

async function create(workspaceId, title, userId) {
  const doc = new Document({
    workspace_id: workspaceId,
    title,
    content: "",
    created_by: userId
  });
  await doc.save();
  return doc;
}

async function getById(documentId) {
  const doc = await Document.findById(documentId);
  if (!doc) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }
  return doc;
}

async function update(documentId, updates) {
  const doc = await Document.findByIdAndUpdate(documentId, updates, { new: true });
  if (!doc) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }
  return doc;
}

async function remove(documentId) {
  const doc = await Document.findByIdAndDelete(documentId);
  if (!doc) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }
  return doc;
}

module.exports = { getByWorkspace, create, getById, update, remove };
