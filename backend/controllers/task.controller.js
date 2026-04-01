const taskService = require("../services/task.service");

async function create(req, res, next) {
  try {
    const { workspace_id, title, description } = req.body;
    if (!workspace_id || !title) {
      return res.status(400).json({ message: "workspace_id and title are required" });
    }
    const task = await taskService.create(workspace_id, title, description, req.user.userId);

    const io = req.app.get("io");
    if (io) io.to(workspace_id).emit("task", { ...task, user_id: req.user.userId });

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { workspace_id, page, limit } = req.query;
    if (!workspace_id) {
      return res.status(400).json({ message: "workspace_id query param required" });
    }
    const tasks = await taskService.listByWorkspace(workspace_id, req.user.userId, { page, limit });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const task = await taskService.update(req.params.id, req.user.userId, req.body);

    const io = req.app.get("io");
    if (io && task.workspace_id) io.to(String(task.workspace_id)).emit("task_update", { ...task, user_id: req.user.userId });

    res.json(task);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const task = await taskService.getById(req.params.id, req.user.userId);
    await taskService.remove(req.params.id, req.user.userId);

    const io = req.app.get("io");
    if (io) io.to(String(task.workspace_id)).emit("task_deleted", { task_id: req.params.id, user_id: req.user.userId });

    res.json({ message: "Task deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, update, remove };
