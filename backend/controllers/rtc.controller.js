const rtcService = require("../services/rtc.service");

async function getIceConfig(req, res, next) {
  try {
    const config = rtcService.getIceConfigForUser(req.user.userId);
    res.json(config);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getIceConfig
};
