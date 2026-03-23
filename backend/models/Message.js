const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  user_name: { type: String, default: "" },
  user_picture: { type: String, default: "" },
  content: { type: String, required: true }
}, { timestamps: true, collection: "messages" });

module.exports = mongoose.model("Message", messageSchema);
