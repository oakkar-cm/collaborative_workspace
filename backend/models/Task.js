const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  status: { type: String, enum: ["todo", "in_progress", "done"], default: "todo" },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true, collection: "tasks" });

module.exports = mongoose.model("Task", taskSchema);
