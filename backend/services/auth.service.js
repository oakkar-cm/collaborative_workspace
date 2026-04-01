const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const config = require("../config");

/**
 * Register: validate, check duplicate in DB, hash password, then SAVE user to database.
 * All registered data (email, firstName, lastName, hashed password) is stored in MongoDB.
 */
async function registerUser({ email, firstName, lastName, password }) {
  if (!email || !firstName || !lastName || !password) {
    const err = new Error("Email, first name, last name and password are required");
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const err = new Error("User already exists");
    err.statusCode = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({
    email: normalizedEmail,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    password: hashedPassword
  });
  await newUser.save(); // persist to MongoDB
  return { message: "User registered successfully" };
}

/**
 * Login: RETRIEVE user from database by email, verify password, then return token.
 * User information (email, name, etc.) comes from the database.
 */
async function loginUser({ email, password }) {
  const normalizedEmail = email ? email.trim().toLowerCase() : "";
  const user = await User.findOne({ email: normalizedEmail }); // read from MongoDB
  if (!user) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const token = jwt.sign(
    { userId: user._id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
  return { message: "Login successful", token };
}

const activeSessions = new Map();

function createSession(userId) {
  const sessionId = crypto.randomBytes(32).toString("hex");
  activeSessions.set(sessionId, { userId, createdAt: Date.now() });

  setTimeout(() => activeSessions.delete(sessionId), 5 * 60 * 1000);
  return sessionId;
}

async function exchangeSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (!session) {
    const err = new Error("Invalid or expired session");
    err.statusCode = 401;
    throw err;
  }
  activeSessions.delete(sessionId);

  const user = await User.findById(session.userId).select("email firstName lastName avatar_url").lean();
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const token = jwt.sign(
    { userId: user._id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return {
    token,
    user: {
      user_id: user._id,
      email: user.email,
      first_name: user.firstName || "",
      last_name: user.lastName || "",
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
      avatar_url: user.avatar_url || ""
    }
  };
}

function isGoogleAuthConfigured() {
  return Boolean(config.googleClientId && config.googleClientSecret && config.googleRedirectUri);
}

function buildGoogleAuthUrl() {
  if (!isGoogleAuthConfigured()) {
    const err = new Error("Google authentication is not configured");
    err.statusCode = 503;
    throw err;
  }

  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: config.googleRedirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account"
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function loginWithGoogleCode(code) {
  if (!code) {
    const err = new Error("Missing Google authorization code");
    err.statusCode = 400;
    throw err;
  }

  if (!isGoogleAuthConfigured()) {
    const err = new Error("Google authentication is not configured");
    err.statusCode = 503;
    throw err;
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: config.googleRedirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    const err = new Error(`Failed to exchange Google auth code: ${errorBody}`);
    err.statusCode = 401;
    throw err;
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    const err = new Error("Google token response did not include access_token");
    err.statusCode = 401;
    throw err;
  }

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!profileResponse.ok) {
    const errorBody = await profileResponse.text();
    const err = new Error(`Failed to fetch Google user profile: ${errorBody}`);
    err.statusCode = 401;
    throw err;
  }

  const profile = await profileResponse.json();
  const email = String(profile.email || "").trim().toLowerCase();
  if (!email) {
    const err = new Error("Google account did not provide an email");
    err.statusCode = 400;
    throw err;
  }

  const derivedName = String(profile.name || "").trim().split(/\s+/).filter(Boolean);
  const firstName = String(profile.given_name || derivedName[0] || "Google").trim();
  const lastName = String(profile.family_name || derivedName.slice(1).join(" ") || "User").trim();

  let user = await User.findOne({ email });
  if (!user) {
    const generatedPassword = crypto.randomBytes(32).toString("hex");
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    user = new User({
      email,
      firstName,
      lastName,
      password: hashedPassword,
      avatar_url: profile.picture || ""
    });
    await user.save();
  } else {
    let didUpdate = false;
    if (!user.firstName && firstName) {
      user.firstName = firstName;
      didUpdate = true;
    }
    if (!user.lastName && lastName) {
      user.lastName = lastName;
      didUpdate = true;
    }
    if ((!user.avatar_url || user.avatar_url.length === 0) && profile.picture) {
      user.avatar_url = profile.picture;
      didUpdate = true;
    }
    if (didUpdate) {
      await user.save();
    }
  }

  return createSession(user._id);
}

module.exports = {
  registerUser,
  loginUser,
  createSession,
  exchangeSession,
  isGoogleAuthConfigured,
  buildGoogleAuthUrl,
  loginWithGoogleCode
};
