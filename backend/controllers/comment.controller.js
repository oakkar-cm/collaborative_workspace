const commentService = require("../services/comment.service");

async function create(req, res, next) {
  try {
    const { documentId, text, selectionRange } = req.body;
    if (!documentId || !text || !String(text).trim()) {
      return res.status(400).json({ message: "documentId and text are required" });
    }
    const comment = await commentService.create({
      documentId,
      userId: req.user.userId,
      text,
      selectionRange
    });
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}

async function listByDocument(req, res, next) {
  try {
    const { page, limit } = req.query;
    const comments = await commentService.listByDocument(req.params.documentId, req.user.userId, { page, limit });
    res.json(comments);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await commentService.remove(req.params.id, req.user.userId);
    res.json({ message: "Comment deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  listByDocument,
  remove
};
