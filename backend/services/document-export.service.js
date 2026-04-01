const { parseDocument } = require("htmlparser2");
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require("docx");
const PDFDocument = require("pdfkit");

function extractBlocksFromHtml(html) {
  const root = parseDocument(html || "");
  const blocks = [];
  const sourceNodes = root?.children || [];

  for (const node of sourceNodes) {
    collectBlocks(node, blocks);
  }

  if (blocks.length === 0) {
    blocks.push({ type: "paragraph", runs: [{ text: stripHtml(html || ""), bold: false, italics: false }] });
  }

  return blocks.filter((b) => b.runs && b.runs.some((r) => r.text));
}

function collectBlocks(node, blocks) {
  if (!node) return;
  if (node.type === "tag") {
    if (["h1", "h2", "h3", "p", "blockquote", "li"].includes(node.name)) {
      const runs = [];
      collectInlineRuns(node, { bold: false, italics: false }, runs);
      const type = node.name === "li" ? "listItem" : node.name;
      blocks.push({ type, runs: normalizeRuns(runs) });
      return;
    }
    if (["ul", "ol", "div", "section", "article", "main", "body"].includes(node.name)) {
      for (const child of node.children || []) {
        collectBlocks(child, blocks);
      }
      return;
    }
  }
  if (node.children && node.children.length) {
    for (const child of node.children) {
      collectBlocks(child, blocks);
    }
  }
}

function collectInlineRuns(node, style, runs) {
  if (!node) return;
  if (node.type === "text") {
    const text = node.data?.replace(/\s+/g, " ");
    if (text && text.trim()) {
      runs.push({ text, bold: style.bold, italics: style.italics });
    }
    return;
  }

  if (node.type !== "tag") return;

  if (node.name === "br") {
    runs.push({ text: "\n", bold: style.bold, italics: style.italics });
    return;
  }

  const nextStyle = {
    bold: style.bold || node.name === "strong" || node.name === "b",
    italics: style.italics || node.name === "em" || node.name === "i"
  };

  for (const child of node.children || []) {
    collectInlineRuns(child, nextStyle, runs);
  }
}

function normalizeRuns(runs) {
  return runs
    .map((run) => ({
      ...run,
      text: run.text || ""
    }))
    .filter((run) => run.text.trim().length > 0 || run.text === "\n");
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function blockToDocxParagraph(block) {
  const children = block.runs.map((run) => new TextRun({
    text: run.text,
    bold: run.bold,
    italics: run.italics
  }));

  if (block.type === "h1") {
    return new Paragraph({ heading: HeadingLevel.HEADING_1, children, spacing: { after: 220 } });
  }
  if (block.type === "h2") {
    return new Paragraph({ heading: HeadingLevel.HEADING_2, children, spacing: { after: 180 } });
  }
  if (block.type === "h3") {
    return new Paragraph({ heading: HeadingLevel.HEADING_3, children, spacing: { after: 140 } });
  }
  if (block.type === "listItem") {
    const itemRuns = [new TextRun({ text: "• " }), ...children];
    return new Paragraph({ children: itemRuns, spacing: { after: 100 } });
  }
  return new Paragraph({ children, spacing: { after: 140 } });
}

async function buildDocxBuffer({ title, contentHtml }) {
  const blocks = extractBlocksFromHtml(contentHtml);
  const paragraphs = [];

  if (title) {
    paragraphs.push(new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: title })],
      spacing: { after: 280 }
    }));
  }

  for (const block of blocks) {
    paragraphs.push(blockToDocxParagraph(block));
  }

  const doc = new Document({
    sections: [{ children: paragraphs }]
  });

  return Packer.toBuffer(doc);
}

function drawStyledRuns(pdf, runs, options = {}) {
  const size = options.size || 12;
  const lineGap = options.lineGap || 5;
  const indent = options.indent || 0;

  let firstChunk = true;
  for (const run of runs) {
    if (!run.text) continue;
    const font = run.bold && run.italics
      ? "Helvetica-BoldOblique"
      : run.bold
        ? "Helvetica-Bold"
        : run.italics
          ? "Helvetica-Oblique"
          : "Helvetica";

    pdf.font(font).fontSize(size).fillColor("#0F172A").text(run.text, {
      continued: true,
      lineGap,
      indent: firstChunk ? indent : 0
    });
    firstChunk = false;
  }
  pdf.text("", { continued: false });
}

async function buildPdfBuffer({ title, contentHtml }) {
  const blocks = extractBlocksFromHtml(contentHtml);
  const pdf = new PDFDocument({
    size: "A4",
    margin: 48,
    info: { Title: title || "Document Export" }
  });

  const chunks = [];
  pdf.on("data", (chunk) => chunks.push(chunk));

  if (title) {
    pdf.font("Helvetica-Bold").fontSize(22).fillColor("#0F172A").text(title, { lineGap: 6 });
    pdf.moveDown(0.8);
  }

  for (const block of blocks) {
    if (block.type === "h1") {
      drawStyledRuns(pdf, block.runs, { size: 20, lineGap: 6 });
      pdf.moveDown(0.35);
    } else if (block.type === "h2") {
      drawStyledRuns(pdf, block.runs, { size: 17, lineGap: 5 });
      pdf.moveDown(0.3);
    } else if (block.type === "h3") {
      drawStyledRuns(pdf, block.runs, { size: 15, lineGap: 5 });
      pdf.moveDown(0.25);
    } else if (block.type === "listItem") {
      drawStyledRuns(pdf, [{ text: "• " }, ...block.runs], { size: 12, indent: 12, lineGap: 4 });
      pdf.moveDown(0.1);
    } else {
      drawStyledRuns(pdf, block.runs, { size: 12, lineGap: 4 });
      pdf.moveDown(0.2);
    }
  }

  pdf.end();
  return new Promise((resolve, reject) => {
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
  });
}

module.exports = {
  buildDocxBuffer,
  buildPdfBuffer
};
