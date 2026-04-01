const Document = require("../models/Document");
const { assertWorkspaceMember, assertValidObjectId } = require("./access.service");
const { assertValidDocumentContent } = require("../utils/document-content");

async function create(workspaceId, title, userId) {
  await assertWorkspaceMember(workspaceId, userId);
  const doc = new Document({
    workspace_id: workspaceId,
    title: String(title).trim(),
    created_by: userId
  });
  await doc.save();
  return formatDoc(doc);
}

async function listByWorkspace(workspaceId, userId, options = {}) {
  await assertWorkspaceMember(workspaceId, userId);
  const page = Math.max(parseInt(options.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 50, 1), 100);
  const skip = (page - 1) * limit;
  const docs = await Document.find({ workspace_id: workspaceId })
    .select("_id workspace_id title content created_by createdAt updatedAt __v")
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  return docs.map(formatDoc);
}

async function getById(docId, userId) {
  assertValidObjectId(docId, "Invalid document id");
  const doc = await Document.findById(docId)
    .select("_id workspace_id title content created_by createdAt updatedAt __v")
    .lean();
  if (!doc) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }
  await assertWorkspaceMember(doc.workspace_id, userId);
  return formatDoc(doc);
}

async function update(docId, userId, updates) {
  assertValidObjectId(docId, "Invalid document id");
  const existingDoc = await Document.findById(docId).select("_id workspace_id __v").lean();
  if (!existingDoc) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }
  await assertWorkspaceMember(existingDoc.workspace_id, userId);

  const safeUpdates = {};
  if (typeof updates.title === "string") {
    safeUpdates.title = updates.title.trim();
  }
  if (typeof updates.content === "string") {
    assertValidDocumentContent(updates.content);
    safeUpdates.content = updates.content;
  }
  if (Object.keys(safeUpdates).length === 0) {
    const err = new Error("No valid fields to update");
    err.statusCode = 400;
    throw err;
  }

  const expectedVersion = Number.isInteger(updates.version) ? updates.version : null;
  const query = expectedVersion == null
    ? { _id: docId }
    : { _id: docId, __v: expectedVersion };

  const updateDoc = { $set: safeUpdates, $inc: { __v: 1 } };

  const doc = await Document.findOneAndUpdate(query, updateDoc, { new: true })
    .select("_id workspace_id title content created_by createdAt updatedAt __v")
    .lean();
  if (!doc) {
    const err = new Error("Document was updated by another user. Please refresh and retry.");
    err.statusCode = 409;
    throw err;
  }
  return formatDoc(doc);
}

async function remove(docId, userId) {
  assertValidObjectId(docId, "Invalid document id");
  const existingDoc = await Document.findById(docId).select("_id workspace_id").lean();
  if (!existingDoc) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }
  await assertWorkspaceMember(existingDoc.workspace_id, userId);
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
    updated_at: doc.updatedAt || doc.createdAt,
    version: Number.isInteger(doc.__v) ? doc.__v : 0
  };
}

module.exports = { create, listByWorkspace, getById, update, remove };
