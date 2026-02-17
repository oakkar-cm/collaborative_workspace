const mongoose = require("mongoose");

const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  documentContent: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Workspace", workspaceSchema);
