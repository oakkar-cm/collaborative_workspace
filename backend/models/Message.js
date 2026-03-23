const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
  content: { type: String, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  user_name: { type: String, required: true },
  user_picture: { type: String, default: "" }
}, { timestamps: true });

messageSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.message_id = ret._id;
    ret.created_at = ret.createdAt;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Message", messageSchema);
