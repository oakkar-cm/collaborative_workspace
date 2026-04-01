/**
 * Simple logger abstraction. Behavior matches previous console.log/error usage.
 * Can be replaced with a proper logger (e.g. winston) without changing call sites.
 */
function format(level, args) {
  return JSON.stringify({
    level,
    timestamp: new Date().toISOString(),
    message: args.map((arg) => (
      arg instanceof Error
        ? { name: arg.name, message: arg.message, stack: arg.stack }
        : arg
    ))
  });
}

const logger = {
  info(...args) {
    console.log(format("info", args));
  },
  error(...args) {
    console.error(format("error", args));
  }
};

module.exports = logger;
