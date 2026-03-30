const fileService = require("../services/file.service");

async function upload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }
    const workspaceId = req.body.workspace_id;
    if (!workspaceId) {
      return res.status(400).json({ message: "workspace_id is required" });
    }
    const file = await fileService.upload(workspaceId, req.file, req.user.userId);

    const io = req.app.get("io");
    if (io) io.to(workspaceId).emit("file", { ...file, user_id: req.user.userId });

    res.status(201).json(file);
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
    const files = await fileService.listByWorkspace(workspace_id);
    res.json(files);
  } catch (err) {
    next(err);
  }
}

async function download(req, res, next) {
  try {
    const file = await fileService.download(req.params.id);
    res.set({
      "Content-Type": file.mimetype || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Content-Length": file.data.length
    });
    res.send(file.data);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const file = await fileService.remove(req.params.id);

    const io = req.app.get("io");
    if (io) io.to(String(file.workspace_id)).emit("file_deleted", { file_id: file.file_id, user_id: req.user.userId });

    res.json({ message: "File deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, list, download, remove };
