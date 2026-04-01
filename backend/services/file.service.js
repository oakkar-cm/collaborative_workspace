const File = require("../models/File");
const { assertWorkspaceMember, assertValidObjectId } = require("./access.service");

async function upload(workspaceId, file, userId) {
  await assertWorkspaceMember(workspaceId, userId);
  const doc = new File({
    workspace_id: workspaceId,
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    data: file.buffer,
    uploaded_by: userId
  });
  await doc.save();
  return formatFile(doc);
}

async function listByWorkspace(workspaceId, userId, options = {}) {
  await assertWorkspaceMember(workspaceId, userId);
  const page = Math.max(parseInt(options.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 50, 1), 100);
  const skip = (page - 1) * limit;
  const files = await File.find({ workspace_id: workspaceId })
    .select("_id workspace_id filename mimetype size uploaded_by uploaded_at createdAt")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  return files.map(formatFile);
}

async function download(fileId, userId) {
  assertValidObjectId(fileId, "Invalid file id");
  const file = await File.findById(fileId).lean();
  if (!file) {
    const err = new Error("File not found");
    err.statusCode = 404;
    throw err;
  }
  await assertWorkspaceMember(file.workspace_id, userId);
  return file;
}

function formatFile(f) {
  return {
    file_id: f._id,
    workspace_id: f.workspace_id,
    filename: f.filename,
    mimetype: f.mimetype,
    size: f.size,
    uploaded_by: f.uploaded_by,
    uploaded_at: f.uploaded_at || f.createdAt
  };
}

async function remove(fileId, userId) {
  assertValidObjectId(fileId, "Invalid file id");
  const existing = await File.findById(fileId).select("_id workspace_id").lean();
  if (!existing) {
    const err = new Error("File not found");
    err.statusCode = 404;
    throw err;
  }
  await assertWorkspaceMember(existing.workspace_id, userId);
  const file = await File.findByIdAndDelete(fileId).lean();
  if (!file) {
    const err = new Error("File not found");
    err.statusCode = 404;
    throw err;
  }
  return formatFile(file);
}

module.exports = { upload, listByWorkspace, download, remove };
