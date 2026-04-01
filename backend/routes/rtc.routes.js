const express = require("express");
const rtcController = require("../controllers/rtc.controller");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

router.get("/ice-config", rtcController.getIceConfig);

module.exports = router;
