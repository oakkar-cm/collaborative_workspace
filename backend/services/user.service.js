const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function updateUser(currentUserId, targetUserId, payload) {
  if (String(currentUserId) !== String(targetUserId)) {
    const err = new Error("You can only update your own profile");
    err.statusCode = 403;
    throw err;
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const updates = {};

  if (typeof payload.firstName === "string") {
    const value = payload.firstName.trim();
    if (!value) {
      const err = new Error("First name cannot be empty");
      err.statusCode = 400;
      throw err;
    }
    updates.firstName = value;
  }

  if (typeof payload.lastName === "string") {
    const value = payload.lastName.trim();
    if (!value) {
      const err = new Error("Last name cannot be empty");
      err.statusCode = 400;
      throw err;
    }
    updates.lastName = value;
  }

  if (typeof payload.email === "string") {
    const normalizedEmail = payload.email.trim().toLowerCase();
    if (!normalizedEmail) {
      const err = new Error("Email cannot be empty");
      err.statusCode = 400;
      throw err;
    }
    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } }).lean();
    if (existing) {
      const err = new Error("Email already in use");
      err.statusCode = 400;
      throw err;
    }
    updates.email = normalizedEmail;
  }

  if (typeof payload.password === "string" && payload.password.trim()) {
    if (payload.password.trim().length < 6) {
      const err = new Error("Password must be at least 6 characters");
      err.statusCode = 400;
      throw err;
    }
    updates.password = await bcrypt.hash(payload.password.trim(), 10);
  }

  if (typeof payload.avatarBase64 === "string") {
    const avatar = payload.avatarBase64.trim();
    if (avatar && !avatar.startsWith("data:image/")) {
      const err = new Error("avatarBase64 must be a valid image data URL");
      err.statusCode = 400;
      throw err;
    }
    if (avatar.length > 2_000_000) {
      const err = new Error("Avatar image is too large");
      err.statusCode = 400;
      throw err;
    }
    updates.avatar_url = avatar;
  }

  Object.assign(user, updates);
  await user.save();

  return formatUser(user);
}

function formatUser(user) {
  return {
    user_id: user._id,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
    avatar_url: user.avatar_url || ""
  };
}

module.exports = {
  updateUser,
  formatUser
};
