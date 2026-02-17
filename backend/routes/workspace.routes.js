const express = require("express");
const workspaceController = require("../controllers/workspace.controller");
const authMiddleware = require("../middleware/auth");
const { requireWorkspaceName } = require("../middleware/validate");

const router = express.Router();

router.use(authMiddleware);

router.post("/", requireWorkspaceName, workspaceController.create);
router.get("/", workspaceController.list);

module.exports = router;
