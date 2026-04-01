const Comment = require("../models/Comment");
const User = require("../models/User");
const Document = require("../models/Document");
const { assertWorkspaceMember, assertValidObjectId } = require("./access.service");

async function create({ documentId, userId, text, selectionRange }) {
  assertValidObjectId(documentId, "Invalid document id");
  if (!text || !text.trim()) {
    const err = new Error("Comment text is required");
    err.statusCode = 400;
    throw err;
  }

  const [document, user] = await Promise.all([
    Document.findById(documentId).lean(),
    User.findById(userId).select("firstName lastName email avatar_url").lean()
  ]);

  if (!document) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }
  await assertWorkspaceMember(document.workspace_id, userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const comment = new Comment({
    document_id: documentId,
    user_id: userId,
    user_name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
    user_picture: user.avatar_url || "",
    text: text.trim(),
    selection_range: {
      from: Number.isFinite(selectionRange?.from) ? selectionRange.from : null,
      to: Number.isFinite(selectionRange?.to) ? selectionRange.to : null,
      selected_text: selectionRange?.selected_text || ""
    }
  });

  await comment.save();
  return formatComment(comment);
}

async function listByDocument(documentId, userId, options = {}) {
  assertValidObjectId(documentId, "Invalid document id");
  const page = Math.max(parseInt(options.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 100, 1), 200);
  const skip = (page - 1) * limit;

  const document = await Document.findById(documentId).select("_id workspace_id").lean();
  if (!document) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }
  await assertWorkspaceMember(document.workspace_id, userId);

  const comments = await Comment.find({ document_id: documentId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  return comments.map(formatComment);
}

async function remove(commentId, userId) {
  assertValidObjectId(commentId, "Invalid comment id");

  const comment = await Comment.findById(commentId);
  if (!comment) {
    const err = new Error("Comment not found");
    err.statusCode = 404;
    throw err;
  }
  if (String(comment.user_id) !== String(userId)) {
    const err = new Error("You can only delete your own comments");
    err.statusCode = 403;
    throw err;
  }
  const document = await Document.findById(comment.document_id).select("_id workspace_id").lean();
  if (document) {
    await assertWorkspaceMember(document.workspace_id, userId);
  }

  await Comment.deleteOne({ _id: commentId });
}

function formatComment(comment) {
  return {
    comment_id: comment._id,
    document_id: comment.document_id,
    user_id: comment.user_id,
    user_name: comment.user_name,
    user_picture: comment.user_picture || "",
    text: comment.text,
    selection_range: {
      from: comment.selection_range?.from ?? null,
      to: comment.selection_range?.to ?? null,
      selected_text: comment.selection_range?.selected_text || ""
    },
    created_at: comment.createdAt || comment.created_at
  };
}

module.exports = {
  create,
  listByDocument,
  remove
};
