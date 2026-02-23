const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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

module.exports = {
  registerUser,
  loginUser
};
