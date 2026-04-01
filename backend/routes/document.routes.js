const express = require("express");
const documentController = require("../controllers/document.controller");
const authMiddleware = require("../middleware/auth");
const { requireBodyFields, requireQueryFields, requireObjectIdParam, requirePagination } = require("../middleware/validate");

const router = express.Router();
router.use(authMiddleware);

router.get("/", requireQueryFields(["workspace_id"]), requirePagination, documentController.list);
router.post("/", requireBodyFields(["workspace_id", "title"]), documentController.create);
router.get("/:id/export/docx", requireObjectIdParam("id"), documentController.exportDocx);
router.get("/:id/export/pdf", requireObjectIdParam("id"), documentController.exportPdf);
router.get("/:id", requireObjectIdParam("id"), documentController.getById);
router.put("/:id", requireObjectIdParam("id"), documentController.update);
router.delete("/:id", requireObjectIdParam("id"), documentController.remove);

module.exports = router;
