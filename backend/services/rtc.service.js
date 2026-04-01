const crypto = require("crypto");
const config = require("../config");

function getIceConfigForUser(userId) {
  const servers = config.stunUrls.map((url) => ({ urls: url }));
  const hasTurnConfig = config.turnUrls.length > 0 && Boolean(config.turnSharedSecret);
  if (hasTurnConfig) {
    const expiresAt = Math.floor(Date.now() / 1000) + config.turnCredentialTtlSeconds;
    const username = `${expiresAt}:${userId}`;
    const credential = crypto
      .createHmac("sha1", config.turnSharedSecret)
      .update(username)
      .digest("base64");
    servers.push({
      urls: config.turnUrls,
      username,
      credential
    });
  }
  return {
    iceServers: servers,
    ttl_seconds: config.turnCredentialTtlSeconds
  };
}

module.exports = {
  getIceConfigForUser
};
