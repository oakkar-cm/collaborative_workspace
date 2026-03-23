const Document = require("../models/Document");

async function create(workspaceId, title, userId) {
  const doc = new Document({
    workspace_id: workspaceId,
    title,
    created_by: userId
  });
  await doc.save();
  return formatDoc(doc);
}

async function listByWorkspace(workspaceId) {
  const docs = await Document.find({ workspace_id: workspaceId })
    .sort({ updatedAt: -1 })
    .lean();
  return docs.map(formatDoc);
}

async function getById(docId) {
  const doc = await Document.findById(docId).lean();
  if (!doc) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }
  return formatDoc(doc);
}

async function update(docId, updates) {
  const doc = await Document.findByIdAndUpdate(docId, updates, { new: true }).lean();
  if (!doc) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }
  return formatDoc(doc);
}

async function remove(docId) {
  const result = await Document.findByIdAndDelete(docId);
  if (!result) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }
}

function formatDoc(doc) {
  return {
    document_id: doc._id,
    workspace_id: doc.workspace_id,
    title: doc.title,
    content: doc.content || "",
    created_by: doc.created_by,
    updated_at: doc.updatedAt || doc.createdAt
  };
}

module.exports = { create, listByWorkspace, getById, update, remove };
