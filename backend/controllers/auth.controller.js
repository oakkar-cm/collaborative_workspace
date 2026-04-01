const authService = require("../services/auth.service");
const User = require("../models/User");
const config = require("../config");

function setAuthCookie(res, token) {
  res.cookie(config.authCookieName, token, {
    httpOnly: true,
    secure: config.authCookieSecure,
    sameSite: config.authCookieSameSite,
    maxAge: 60 * 60 * 1000
  });
}

function clearAuthCookie(res) {
  res.clearCookie(config.authCookieName, {
    httpOnly: true,
    secure: config.authCookieSecure,
    sameSite: config.authCookieSameSite
  });
}

async function register(req, res, next) {
  try {
    const { email, firstName, lastName, password } = req.body;
    const result = await authService.registerUser({
      email,
      firstName,
      lastName,
      password
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({ email, password });
    if (result?.token) {
      setAuthCookie(res, result.token);
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/** Get current user: retrieve from database by userId in JWT. */
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.userId)
      .select("email firstName lastName avatar_url")
      .lean();
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json({
      user_id: user._id,
      email: user.email,
      first_name: user.firstName || "",
      last_name: user.lastName || "",
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
      avatar_url: user.avatar_url || ""
    });
  } catch (err) {
    next(err);
  }
}

async function exchangeSession(req, res, next) {
  try {
    const { session_id } = req.body;
    if (!session_id) {
      return res.status(400).json({ message: "session_id is required" });
    }
    const result = await authService.exchangeSession(session_id);
    if (result?.token) {
      setAuthCookie(res, result.token);
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getGoogleConfig(req, res, next) {
  try {
    res.json({ enabled: authService.isGoogleAuthConfigured() });
  } catch (err) {
    next(err);
  }
}

async function startGoogleAuth(req, res, next) {
  try {
    const url = authService.buildGoogleAuthUrl();
    res.redirect(url);
  } catch (err) {
    next(err);
  }
}

async function handleGoogleCallback(req, res, next) {
  try {
    if (req.query.error) {
      const message = encodeURIComponent(`Google sign-in failed: ${req.query.error}`);
      return res.redirect(`${config.clientUrl}/login?error=${message}`);
    }

    const code = req.query.code;
    const sessionId = await authService.loginWithGoogleCode(code);
    const callbackUrl = `${config.clientUrl}/auth/callback#session_id=${encodeURIComponent(sessionId)}`;
    return res.redirect(callbackUrl);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    clearAuthCookie(res);
    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getMe,
  exchangeSession,
  logout,
  getGoogleConfig,
  startGoogleAuth,
  handleGoogleCallback
};
