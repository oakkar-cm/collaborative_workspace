const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
  filename: { type: String, required: true },
  original_name: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number, required: true },
  mimetype: { type: String, default: "application/octet-stream" },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

fileSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.file_id = ret._id;
    ret.uploaded_at = ret.createdAt;
    delete ret._id;
    delete ret.__v;
    delete ret.path;
    return ret;
  }
});

module.exports = mongoose.model("File", fileSchema);
