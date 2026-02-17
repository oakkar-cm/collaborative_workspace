const jwt = require("jsonwebtoken");
const config = require("../config");

/**
 * Authenticates Bearer token and sets req.user { userId, email }.
 * Responds with 401 { message: "Unauthorized" } if missing or invalid.
 * Preserves same behavior as previous inline JWT verification in routes.
 */
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = { userId: decoded.userId, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

module.exports = authMiddleware;
