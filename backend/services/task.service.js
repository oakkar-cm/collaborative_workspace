const Task = require("../models/Task");

async function create(workspaceId, title, description, userId) {
  const task = new Task({
    workspace_id: workspaceId,
    title,
    description: description || "",
    created_by: userId
  });
  await task.save();
  return formatTask(task);
}

async function listByWorkspace(workspaceId) {
  const tasks = await Task.find({ workspace_id: workspaceId })
    .sort({ createdAt: -1 })
    .lean();
  return tasks.map(formatTask);
}

async function update(taskId, updates) {
  const allowed = {};
  if (updates.status !== undefined) allowed.status = updates.status;
  if (updates.title !== undefined) allowed.title = updates.title;
  if (updates.description !== undefined) allowed.description = updates.description;
  if (updates.assigned_to !== undefined) allowed.assigned_to = updates.assigned_to;

  const task = await Task.findByIdAndUpdate(taskId, allowed, { new: true }).lean();
  if (!task) {
    const err = new Error("Task not found");
    err.statusCode = 404;
    throw err;
  }
  return formatTask(task);
}

async function remove(taskId) {
  const result = await Task.findByIdAndDelete(taskId);
  if (!result) {
    const err = new Error("Task not found");
    err.statusCode = 404;
    throw err;
  }
}

function formatTask(task) {
  return {
    task_id: task._id,
    workspace_id: task.workspace_id,
    title: task.title,
    description: task.description || "",
    status: task.status || "todo",
    assigned_to: task.assigned_to,
    created_by: task.created_by
  };
}

module.exports = { create, listByWorkspace, update, remove };
