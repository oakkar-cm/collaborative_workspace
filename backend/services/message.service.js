const Message = require("../models/Message");
const User = require("../models/User");
const { assertWorkspaceMember, assertValidObjectId } = require("./access.service");

function buildPollOptions(options = []) {
  return options.map((optionText, idx) => ({
    option_id: `opt_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 8)}`,
    text: optionText,
    votes: []
  }));
}

function buildSinglePollOption(optionText) {
  return {
    option_id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text: optionText,
    votes: []
  };
}

function normalizeVotes(votes = []) {
  return Array.from(new Set(votes.map((voteUserId) => String(voteUserId))));
}

async function create(workspaceId, userId, payload) {
  await assertWorkspaceMember(workspaceId, userId);
  const type = payload?.type === "poll" ? "poll" : "text";
  const content = typeof payload?.content === "string" ? payload.content.trim() : "";
  const pollPayload = payload?.poll || {};
  const user = await User.findById(userId).select("firstName lastName email avatar_url").lean();
  const userName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
    : "Unknown";

  const baseMessage = {
    workspace_id: workspaceId,
    user_id: userId,
    user_name: userName,
    user_picture: user?.avatar_url || ""
  };

  let message;
  if (type === "poll") {
    const question = typeof pollPayload.question === "string" ? pollPayload.question.trim() : "";
    const allowMultipleAnswers = pollPayload.allow_multiple_answers !== false;
    const options = Array.isArray(pollPayload.options)
      ? pollPayload.options.map((opt) => String(opt || "").trim()).filter(Boolean)
      : [];
    if (!question || options.length < 2) {
      throw Object.assign(new Error("Poll requires question and at least 2 options"), { statusCode: 400 });
    }
    message = new Message({
      ...baseMessage,
      type: "poll",
      content: question,
      poll: {
        question,
        allow_multiple_answers: allowMultipleAnswers,
        options: buildPollOptions(options.slice(0, 10))
      }
    });
  } else {
    if (!content) {
      throw Object.assign(new Error("Message content is required"), { statusCode: 400 });
    }
    message = new Message({
      ...baseMessage,
      type: "text",
      content
    });
  }

  await message.save();
  return formatMessage(message);
}

async function addPollOption(workspaceId, messageId, userId, optionText) {
  await assertWorkspaceMember(workspaceId, userId);
  assertValidObjectId(messageId, "Invalid message id");

  const normalizedText = String(optionText || "").trim();
  if (!normalizedText) {
    throw Object.assign(new Error("option_text is required"), { statusCode: 400 });
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const message = await Message.findOne({ _id: messageId, workspace_id: workspaceId })
      .select("_id workspace_id user_id type poll __v");
    if (!message) {
      throw Object.assign(new Error("Message not found"), { statusCode: 404 });
    }
    if (message.type !== "poll") {
      throw Object.assign(new Error("Message is not a poll"), { statusCode: 400 });
    }
    if (String(message.user_id) !== String(userId)) {
      throw Object.assign(new Error("Only poll creator can add options"), { statusCode: 403 });
    }

    const existingOptions = Array.isArray(message.poll?.options) ? message.poll.options : [];
    if (existingOptions.length >= 10) {
      throw Object.assign(new Error("Poll can have at most 10 options"), { statusCode: 400 });
    }
    const duplicate = existingOptions.some(
      (option) => String(option.text || "").trim().toLowerCase() === normalizedText.toLowerCase()
    );
    if (duplicate) {
      throw Object.assign(new Error("Poll option already exists"), { statusCode: 400 });
    }

    const updatedOptions = [
      ...existingOptions.map((opt) => ({
        option_id: opt.option_id,
        text: opt.text,
        votes: normalizeVotes(opt.votes)
      })),
      buildSinglePollOption(normalizedText)
    ];

    const updated = await Message.findOneAndUpdate(
      { _id: messageId, workspace_id: workspaceId, __v: message.__v },
      { $set: { "poll.options": updatedOptions }, $inc: { __v: 1 } },
      { new: true }
    ).lean();
    if (updated) {
      return formatMessage(updated);
    }
  }
  throw Object.assign(new Error("Poll changed by another user. Please retry."), { statusCode: 409 });
}

async function votePoll(workspaceId, messageId, userId, optionId) {
  await assertWorkspaceMember(workspaceId, userId);
  assertValidObjectId(messageId, "Invalid message id");
  const normalizedUserId = String(userId);
  const normalizedOptionId = String(optionId);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const message = await Message.findOne({ _id: messageId, workspace_id: workspaceId })
      .select("_id workspace_id type poll __v");
    if (!message) {
      throw Object.assign(new Error("Message not found"), { statusCode: 404 });
    }
    if (message.type !== "poll" || !message.poll?.options?.length) {
      throw Object.assign(new Error("Message is not a poll"), { statusCode: 400 });
    }

    const targetOption = message.poll.options.find(
      (option) => String(option.option_id) === normalizedOptionId
    );
    if (!targetOption) {
      throw Object.assign(new Error("Poll option not found"), { statusCode: 404 });
    }

    const updatedOptions = message.poll.options.map((option) => ({
      option_id: option.option_id,
      text: option.text,
      votes: normalizeVotes(option.votes)
    }));

    const nextTarget = updatedOptions.find((option) => String(option.option_id) === normalizedOptionId);
    const userAlreadySelected = nextTarget.votes.includes(normalizedUserId);

    if (userAlreadySelected) {
      nextTarget.votes = nextTarget.votes.filter((voteUserId) => voteUserId !== normalizedUserId);
    } else {
      if (!message.poll.allow_multiple_answers) {
        updatedOptions.forEach((option) => {
          option.votes = option.votes.filter((voteUserId) => voteUserId !== normalizedUserId);
        });
      }
      nextTarget.votes = normalizeVotes([...nextTarget.votes, normalizedUserId]);
    }

    const updated = await Message.findOneAndUpdate(
      { _id: messageId, workspace_id: workspaceId, __v: message.__v },
      { $set: { "poll.options": updatedOptions }, $inc: { __v: 1 } },
      { new: true }
    ).lean();
    if (updated) {
      return formatMessage(updated);
    }
  }
  throw Object.assign(new Error("Poll changed by another user. Please retry."), { statusCode: 409 });
}

async function listByWorkspace(workspaceId, userId, options = {}) {
  await assertWorkspaceMember(workspaceId, userId);
  const page = Math.max(parseInt(options.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 100, 1), 200);
  const skip = (page - 1) * limit;
  const messages = await Message.find({ workspace_id: workspaceId })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .lean();
  return messages.map(formatMessage);
}

function formatMessage(msg) {
  return {
    message_id: String(msg._id),
    workspace_id: String(msg.workspace_id),
    user_id: String(msg.user_id),
    user_name: msg.user_name || "Unknown",
    user_picture: msg.user_picture || "",
    type: msg.type || "text",
    content: msg.content,
    poll: msg.type === "poll" && msg.poll
      ? {
          question: msg.poll.question || msg.content || "",
          allow_multiple_answers: msg.poll.allow_multiple_answers !== false,
          options: (msg.poll.options || []).map((option) => ({
            option_id: option.option_id,
            text: option.text,
            votes_count: Array.isArray(option.votes) ? option.votes.length : 0,
            voter_ids: (option.votes || []).map((voteUserId) => String(voteUserId))
          }))
        }
      : null,
    created_at: msg.createdAt || msg.created_at
  };
}

module.exports = { create, listByWorkspace, votePoll, addPollOption };
