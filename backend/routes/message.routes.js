const express = require("express");
const messageController = require("../controllers/message.controller");
const authMiddleware = require("../middleware/auth");
const { requireBodyFields, requireQueryFields, requireObjectIdParam, requirePagination } = require("../middleware/validate");

const router = express.Router();
router.use(authMiddleware);

router.get("/", requireQueryFields(["workspace_id"]), requirePagination, messageController.list);
router.post("/", requireBodyFields(["workspace_id"]), messageController.create);
router.post("/:messageId/poll-vote", requireObjectIdParam("messageId"), requireBodyFields(["workspace_id", "option_id"]), messageController.votePoll);
router.post("/:messageId/poll-options", requireObjectIdParam("messageId"), requireBodyFields(["workspace_id", "option_text"]), messageController.addPollOption);

module.exports = router;
