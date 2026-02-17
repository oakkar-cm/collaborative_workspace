/**
 * Simple logger abstraction. Behavior matches previous console.log/error usage.
 * Can be replaced with a proper logger (e.g. winston) without changing call sites.
 */
const logger = {
  info(...args) {
    console.log(...args);
  },
  error(...args) {
    console.error(...args);
  }
};

module.exports = logger;
