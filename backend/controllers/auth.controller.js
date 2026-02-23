const authService = require("../services/auth.service");
const User = require("../models/User");

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
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/** Get current user: retrieve from database by userId in JWT. */
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.userId)
      .select("email firstName lastName")
      .lean();
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json({
      email: user.email,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getMe
};
