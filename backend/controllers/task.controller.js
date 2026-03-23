const taskService = require("../services/task.service");

async function list(req, res, next) {
  try {
    const { workspace_id } = req.query;
    if (!workspace_id) {
      return res.status(400).json({ message: "workspace_id is required" });
    }
    const tasks = await taskService.getByWorkspace(workspace_id);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { workspace_id, title, description } = req.body;
    if (!workspace_id || !title) {
      return res.status(400).json({ message: "workspace_id and title are required" });
    }
    const task = await taskService.create(workspace_id, title, description, req.user.userId);

    const io = req.app.get("io");
    if (io) {
      io.to(workspace_id).emit("task", task.toJSON());
    }

    res.json(task);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { status, title, description } = req.body;
    const updates = {};
    if (status) updates.status = status;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No update fields provided" });
    }
    const task = await taskService.update(id, updates);

    const io = req.app.get("io");
    if (io) {
      io.to(task.workspace_id.toString()).emit("task_update", task.toJSON());
    }

    res.json(task);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const task = await taskService.remove(id);

    const io = req.app.get("io");
    if (io) {
      io.to(task.workspace_id.toString()).emit("task_deleted", { task_id: task._id });
    }

    res.json({ message: "Task deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
