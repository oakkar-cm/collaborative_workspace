const File = require("../models/File");

async function getByWorkspace(workspaceId) {
  return File.find({ workspace_id: workspaceId }).sort({ createdAt: -1 });
}

async function create(workspaceId, fileData, userId) {
  const file = new File({
    workspace_id: workspaceId,
    filename: fileData.filename,
    original_name: fileData.originalname,
    path: fileData.path,
    size: fileData.size,
    mimetype: fileData.mimetype,
    uploaded_by: userId
  });
  await file.save();
  return file;
}

async function getById(fileId) {
  const file = await File.findById(fileId);
  if (!file) {
    const err = new Error("File not found");
    err.statusCode = 404;
    throw err;
  }
  return file;
}

module.exports = { getByWorkspace, create, getById };
