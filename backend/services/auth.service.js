const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../config");

/**
 * Business logic for auth. No request/response; same behavior as original routes.
 */
async function registerUser({ email, firstName, lastName, password }) {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const err = new Error("User already exists");
    err.statusCode = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({
    email,
    firstName,
    lastName,
    password: hashedPassword
  });
  await newUser.save();
  return { message: "User registered successfully" };
}

async function loginUser({ email, password }) {
  const user = await User.findOne({ email });
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

module.exports = {
  registerUser,
  loginUser
};
