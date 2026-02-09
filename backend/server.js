const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Fake database (for Iteration 1)
const users = [];

// Secret key for JWT
const JWT_SECRET = "cp3407_secret_key";

// ----------------------
// REGISTER USER
// ----------------------
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;

  // Check input
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  // Check if user exists
  const existingUser = users.find(u => u.username === username);
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Save user
  users.push({
    id: users.length + 1,
    username,
    password: hashedPassword
  });

  res.status(201).json({ message: "User registered successfully" });
});

// ----------------------
// LOGIN USER
// ----------------------
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  // Find user
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // Create token
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    message: "Login successful",
    token
  });
});

// ----------------------
// PROTECTED ROUTE (TEST)
// ----------------------
app.get("/api/protected", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      message: "Access granted",
      user: decoded
    });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// ----------------------
app.listen(3000, () => {
  console.log("Auth server running on http://localhost:3000");
});
