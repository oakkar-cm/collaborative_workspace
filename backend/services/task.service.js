const Task = require("../models/Task");

async function getByWorkspace(workspaceId) {
  return Task.find({ workspace_id: workspaceId }).sort({ createdAt: -1 });
}

async function create(workspaceId, title, description, userId) {
  const task = new Task({
    workspace_id: workspaceId,
    title,
    description: description || "",
    status: "todo",
    created_by: userId
  });
  await task.save();
  return task;
}

async function update(taskId, updates) {
  const task = await Task.findByIdAndUpdate(taskId, updates, { new: true });
  if (!task) {
    const err = new Error("Task not found");
    err.statusCode = 404;
    throw err;
  }
  return task;
}

async function remove(taskId) {
  const task = await Task.findByIdAndDelete(taskId);
  if (!task) {
    const err = new Error("Task not found");
    err.statusCode = 404;
    throw err;
  }
  return task;
}

module.exports = { getByWorkspace, create, update, remove };
