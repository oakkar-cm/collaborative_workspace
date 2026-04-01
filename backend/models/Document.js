const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, default: "" },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true, collection: "documents" });

documentSchema.index({ workspace_id: 1, updatedAt: -1 });
documentSchema.index({ workspace_id: 1, createdAt: -1 });

module.exports = mongoose.model("Document", documentSchema);
