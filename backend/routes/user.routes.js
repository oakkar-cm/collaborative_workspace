const express = require("express");
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth");
const { requireObjectIdParam } = require("../middleware/validate");

const router = express.Router();
router.use(authMiddleware);

router.put("/:id", requireObjectIdParam("id"), userController.update);

module.exports = router;
