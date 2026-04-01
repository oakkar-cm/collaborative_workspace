function sanitizeObject(target) {
  if (!target || typeof target !== "object") return;

  Object.keys(target).forEach((key) => {
    // Remove suspicious NoSQL operator keys
    if (key.startsWith("$") || key.includes(".")) {
      delete target[key];
      return;
    }

    const value = target[key];
    if (Array.isArray(value)) {
      value.forEach((item) => sanitizeObject(item));
      return;
    }

    if (value && typeof value === "object") {
      sanitizeObject(value);
    }
  });
}

function sanitizeRequest(req, res, next) {
  try {
    sanitizeObject(req.body);
    sanitizeObject(req.params);
    sanitizeObject(req.query);
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = sanitizeRequest;
