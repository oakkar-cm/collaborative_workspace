const mongoose = require("mongoose");
const dns = require("dns");
const config = require("../config");
const logger = require("../utils/logger");

async function connect() {
  try {
    let uri = config.mongodbUri;
    if (uri.startsWith("mongodb+srv://") && config.mongodbDnsServers.length > 0) {
      dns.setServers(config.mongodbDnsServers);
      logger.info(`Using custom DNS servers for MongoDB SRV: ${config.mongodbDnsServers.join(", ")}`);
    }

    if (uri.includes("mongodb+srv://") || uri.includes("mongodb://")) {
      const hasDb = /\.net\/[^?/]+/.test(uri) || /:\d+\/[^?/]+/.test(uri);
      if (!hasDb) {
        const insertAt = uri.indexOf("?") !== -1 ? uri.indexOf("?") : uri.length;
        uri = uri.slice(0, insertAt) + "/collab_workspace" + uri.slice(insertAt);
        logger.info("Injected default database name into connection URI");
      }
    }

    await mongoose.connect(uri, {
      dbName: "collab_workspace",
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    logger.info("MongoDB Connected to database: collab_workspace");

    require("../models/Document");
    require("../models/Task");
    require("../models/Message");
    require("../models/File");
    require("../models/User");
    require("../models/Workspace");

    if (!config.isProduction || config.shouldSyncIndexes) {
      await mongoose.connection.syncIndexes();
      logger.info("All collection indexes synced");
    }
  } catch (err) {
    logger.error("DB ERROR:", err);
    throw err;
  }
}

module.exports = { connect };
