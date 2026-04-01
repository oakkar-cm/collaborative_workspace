const express = require("express");
const workspaceController = require("../controllers/workspace.controller");
const authMiddleware = require("../middleware/auth");
const { requireWorkspaceName, requireBodyFields, requireObjectIdParam } = require("../middleware/validate");

const router = express.Router();

router.use(authMiddleware);

router.post("/", requireWorkspaceName, workspaceController.create);
router.get("/", workspaceController.list);
router.get("/:id", requireObjectIdParam("id"), workspaceController.getById);
router.put("/:id", requireObjectIdParam("id"), workspaceController.update);
router.delete("/:id", requireObjectIdParam("id"), workspaceController.remove);
router.get("/:id/members", requireObjectIdParam("id"), workspaceController.getMembers);
router.post("/:id/invite", requireObjectIdParam("id"), requireBodyFields(["email"]), workspaceController.invite);

module.exports = router;
