/**
 * Simple validation helpers. Use to reject invalid input before hitting services.
 * Does not change success-path behavior.
 */
const mongoose = require("mongoose");

function requireWorkspaceName(req, res, next) {
  const name = req.body && req.body.name;
  if (name == null || String(name).trim() === "") {
    return res.status(400).json({ message: "Workspace name is required" });
  }
  req.body.name = String(name).trim();
  next();
}

function requireBodyFields(fields) {
  return (req, res, next) => {
    for (const field of fields) {
      const value = req.body?.[field];
      if (value == null || String(value).trim() === "") {
        return res.status(400).json({ message: `${field} is required` });
      }
      if (typeof value === "string") {
        req.body[field] = value.trim();
      }
    }
    next();
  };
}

function requireQueryFields(fields) {
  return (req, res, next) => {
    for (const field of fields) {
      const value = req.query?.[field];
      if (value == null || String(value).trim() === "") {
        return res.status(400).json({ message: `${field} query param required` });
      }
      if (typeof value === "string") {
        req.query[field] = value.trim();
      }
    }
    next();
  };
}

function requireObjectIdParam(paramName) {
  return (req, res, next) => {
    const value = req.params?.[paramName];
    if (!value || !mongoose.isValidObjectId(value)) {
      return res.status(400).json({ message: `Invalid ${paramName}` });
    }
    next();
  };
}

function requirePagination(req, res, next) {
  const page = req.query?.page;
  const limit = req.query?.limit;
  if (page !== undefined && (!Number.isInteger(Number(page)) || Number(page) < 1)) {
    return res.status(400).json({ message: "page must be a positive integer" });
  }
  if (limit !== undefined && (!Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 200)) {
    return res.status(400).json({ message: "limit must be an integer between 1 and 200" });
  }
  next();
}

module.exports = {
  requireWorkspaceName,
  requireBodyFields,
  requireQueryFields,
  requireObjectIdParam,
  requirePagination
};
