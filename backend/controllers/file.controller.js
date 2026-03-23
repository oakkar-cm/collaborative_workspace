const fileService = require("../services/file.service");

async function list(req, res, next) {
  try {
    const { workspace_id } = req.query;
    if (!workspace_id) {
      return res.status(400).json({ message: "workspace_id is required" });
    }
    const files = await fileService.getByWorkspace(workspace_id);
    res.json(files);
  } catch (err) {
    next(err);
  }
}

async function upload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const workspace_id = req.body.workspace_id;
    if (!workspace_id) {
      return res.status(400).json({ message: "workspace_id is required" });
    }

    const file = await fileService.create(workspace_id, req.file, req.user.userId);

    const io = req.app.get("io");
    if (io) {
      io.to(workspace_id).emit("file", file.toJSON());
    }

    res.json(file);
  } catch (err) {
    next(err);
  }
}

async function download(req, res, next) {
  try {
    const { id } = req.params;
    const file = await fileService.getById(id);
    res.download(file.path, file.original_name);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, upload, download };
