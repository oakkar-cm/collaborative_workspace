const express = require("express");
const documentController = require("../controllers/document.controller");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

router.get("/", documentController.list);
router.post("/", documentController.create);
router.put("/:id", documentController.update);
router.delete("/:id", documentController.remove);

module.exports = router;
