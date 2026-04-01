const documentService = require("../services/document.service");
const documentExportService = require("../services/document-export.service");

async function create(req, res, next) {
  try {
    const { workspace_id, title } = req.body;
    if (!workspace_id || !title) {
      return res.status(400).json({ message: "workspace_id and title are required" });
    }
    const doc = await documentService.create(workspace_id, title, req.user.userId);
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { workspace_id, page, limit } = req.query;
    if (!workspace_id) {
      return res.status(400).json({ message: "workspace_id query param required" });
    }
    const docs = await documentService.listByWorkspace(workspace_id, req.user.userId, { page, limit });
    res.json(docs);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const doc = await documentService.getById(req.params.id, req.user.userId);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const doc = await documentService.update(req.params.id, req.user.userId, req.body);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await documentService.remove(req.params.id, req.user.userId);
    res.json({ message: "Document deleted" });
  } catch (err) {
    next(err);
  }
}

async function exportDocx(req, res, next) {
  try {
    const doc = await documentService.getById(req.params.id, req.user.userId);
    const buffer = await documentExportService.buildDocxBuffer({
      title: doc.title,
      contentHtml: doc.content || ""
    });
    const safeName = sanitizeFilename(doc.title || "document");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.docx"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

async function exportPdf(req, res, next) {
  try {
    const doc = await documentService.getById(req.params.id, req.user.userId);
    const buffer = await documentExportService.buildPdfBuffer({
      title: doc.title,
      contentHtml: doc.content || ""
    });
    const safeName = sanitizeFilename(doc.title || "document");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.pdf"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

function sanitizeFilename(input) {
  return String(input).replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "_") || "document";
}

module.exports = { create, list, getById, update, remove, exportDocx, exportPdf };
