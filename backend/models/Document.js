const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, default: "" },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true, collection: "documents" });

module.exports = mongoose.model("Document", documentSchema);
