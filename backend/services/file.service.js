const File = require("../models/File");

async function upload(workspaceId, file, userId) {
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

async function listByWorkspace(workspaceId) {
  const files = await File.find({ workspace_id: workspaceId })
    .select("-data")
    .sort({ createdAt: -1 })
    .lean();
  return files.map(formatFile);
}

async function download(fileId) {
  const file = await File.findById(fileId).lean();
  if (!file) {
    const err = new Error("File not found");
    err.statusCode = 404;
    throw err;
  }
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

async function remove(fileId) {
  const file = await File.findByIdAndDelete(fileId).lean();
  if (!file) {
    const err = new Error("File not found");
    err.statusCode = 404;
    throw err;
  }
  return formatFile(file);
}

module.exports = { upload, listByWorkspace, download, remove };
