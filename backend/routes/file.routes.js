const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fileController = require("../controllers/file.controller");
const authMiddleware = require("../middleware/auth");

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router = express.Router();

router.use(authMiddleware);

router.get("/", fileController.list);
router.post("/upload", upload.single("file"), fileController.upload);
router.get("/:id/download", fileController.download);

module.exports = router;
