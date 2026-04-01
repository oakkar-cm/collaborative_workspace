const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  user_name: { type: String, default: "" },
  user_picture: { type: String, default: "" },
  type: { type: String, enum: ["text", "poll"], default: "text", index: true },
  content: { type: String, default: "" },
  poll: {
    question: { type: String, default: "" },
    allow_multiple_answers: { type: Boolean, default: true },
    options: [{
      option_id: { type: String, required: true },
      text: { type: String, required: true },
      votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
    }]
  }
}, { timestamps: true, collection: "messages" });

messageSchema.index({ workspace_id: 1, createdAt: 1 });
messageSchema.index({ workspace_id: 1, type: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
