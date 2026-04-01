const express = require("express");
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth");
const { requireBodyFields } = require("../middleware/validate");

const router = express.Router();

router.post("/register", requireBodyFields(["email", "firstName", "lastName", "password"]), authController.register);
router.post("/login", requireBodyFields(["email", "password"]), authController.login);
router.post("/auth/session", requireBodyFields(["session_id"]), authController.exchangeSession);
router.post("/logout", authMiddleware, authController.logout);
router.get("/me", authMiddleware, authController.getMe);

module.exports = router;
