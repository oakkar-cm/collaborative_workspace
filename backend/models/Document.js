const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
  title: { type: String, required: true },
  content: { type: String, default: "" },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

documentSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.document_id = ret._id;
    ret.updated_at = ret.updatedAt;
    ret.created_at = ret.createdAt;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Document", documentSchema);
