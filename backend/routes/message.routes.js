const express = require("express");
const messageController = require("../controllers/message.controller");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

router.get("/", messageController.list);
router.post("/", messageController.create);

module.exports = router;
