const express = require("express");
const commentController = require("../controllers/comment.controller");
const authMiddleware = require("../middleware/auth");
const { requireBodyFields, requireObjectIdParam, requirePagination } = require("../middleware/validate");

const router = express.Router();
router.use(authMiddleware);

router.post("/", requireBodyFields(["documentId", "text"]), commentController.create);
router.get("/:documentId", requireObjectIdParam("documentId"), requirePagination, commentController.listByDocument);
router.delete("/:id", requireObjectIdParam("id"), commentController.remove);

module.exports = router;
