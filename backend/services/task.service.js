const Task = require("../models/Task");
const { assertWorkspaceMember, assertValidObjectId } = require("./access.service");

async function create(workspaceId, title, description, userId) {
  await assertWorkspaceMember(workspaceId, userId);
  const task = new Task({
    workspace_id: workspaceId,
    title: String(title).trim(),
    description: description || "",
    created_by: userId
  });
  await task.save();
  return formatTask(task);
}

async function listByWorkspace(workspaceId, userId, options = {}) {
  await assertWorkspaceMember(workspaceId, userId);
  const page = Math.max(parseInt(options.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 100, 1), 200);
  const skip = (page - 1) * limit;
  const tasks = await Task.find({ workspace_id: workspaceId })
    .select("_id workspace_id title description status assigned_to created_by createdAt")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  return tasks.map(formatTask);
}

async function getById(taskId, userId) {
  assertValidObjectId(taskId, "Invalid task id");
  const task = await Task.findById(taskId)
    .select("_id workspace_id title description status assigned_to created_by createdAt")
    .lean();
  if (!task) {
    const err = new Error("Task not found");
    err.statusCode = 404;
    throw err;
  }
  await assertWorkspaceMember(task.workspace_id, userId);
  return formatTask(task);
}

async function update(taskId, userId, updates) {
  assertValidObjectId(taskId, "Invalid task id");
  const existing = await Task.findById(taskId).select("_id workspace_id").lean();
  if (!existing) {
    const err = new Error("Task not found");
    err.statusCode = 404;
    throw err;
  }
  await assertWorkspaceMember(existing.workspace_id, userId);

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

async function remove(taskId, userId) {
  assertValidObjectId(taskId, "Invalid task id");
  const existing = await Task.findById(taskId).select("_id workspace_id").lean();
  if (!existing) {
    const err = new Error("Task not found");
    err.statusCode = 404;
    throw err;
  }
  await assertWorkspaceMember(existing.workspace_id, userId);
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

module.exports = { create, listByWorkspace, getById, update, remove };
