const express = require("express");
const taskController = require("../controllers/task.controller");
const authMiddleware = require("../middleware/auth");
const { requireBodyFields, requireQueryFields, requireObjectIdParam, requirePagination } = require("../middleware/validate");

const router = express.Router();
router.use(authMiddleware);

router.get("/", requireQueryFields(["workspace_id"]), requirePagination, taskController.list);
router.post("/", requireBodyFields(["workspace_id", "title"]), taskController.create);
router.put("/:id", requireObjectIdParam("id"), taskController.update);
router.delete("/:id", requireObjectIdParam("id"), taskController.remove);

module.exports = router;
