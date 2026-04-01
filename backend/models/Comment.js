const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  document_id: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true, index: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  user_name: { type: String, required: true },
  user_picture: { type: String, default: "" },
  text: { type: String, required: true },
  selection_range: {
    from: { type: Number, default: null },
    to: { type: Number, default: null },
    selected_text: { type: String, default: "" }
  }
}, { timestamps: true, collection: "comments" });

commentSchema.index({ document_id: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);
