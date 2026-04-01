const mongoose = require("mongoose");

const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

workspaceSchema.index({ owner: 1, createdAt: -1 });
workspaceSchema.index({ members: 1, createdAt: -1 });

module.exports = mongoose.model("Workspace", workspaceSchema);
