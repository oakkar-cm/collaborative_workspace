const mongoose = require("mongoose");
const config = require("../config");
const logger = require("../utils/logger");

async function connect() {
  try {
    await mongoose.connect(config.mongodbUri);
    logger.info("MongoDB Connected");
  } catch (err) {
    logger.error("DB ERROR:", err);
    throw err;
  }
}

module.exports = { connect };
