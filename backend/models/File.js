const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  filename: { type: String, required: true },
  mimetype: { type: String, default: "application/octet-stream" },
  size: { type: Number, default: 0 },
  data: { type: Buffer, required: true },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  uploaded_at: { type: Date, default: Date.now }
}, { timestamps: true, collection: "files" });

fileSchema.index({ workspace_id: 1, createdAt: -1 });

module.exports = mongoose.model("File", fileSchema);
