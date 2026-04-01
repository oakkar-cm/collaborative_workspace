const MAX_DOCUMENT_CONTENT_LENGTH = 1_000_000;

function assertValidDocumentContent(content) {
  if (typeof content !== "string") {
    const err = new Error("Document content must be a string");
    err.statusCode = 400;
    throw err;
  }
  if (content.length > MAX_DOCUMENT_CONTENT_LENGTH) {
    const err = new Error(`Document content too large (max ${MAX_DOCUMENT_CONTENT_LENGTH} chars)`);
    err.statusCode = 413;
    throw err;
  }
}

module.exports = {
  MAX_DOCUMENT_CONTENT_LENGTH,
  assertValidDocumentContent
};
