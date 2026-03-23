const express = require("express");
const multer = require("multer");
const fileController = require("../controllers/file.controller");
const authMiddleware = require("../middleware/auth");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();
router.use(authMiddleware);

router.get("/", fileController.list);
router.post("/upload", upload.single("file"), fileController.upload);
router.get("/:id/download", fileController.download);

module.exports = router;
