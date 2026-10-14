/**
 * Notebook Export Service
 *
 * Handles server-side document generation for the Collaborative Notebook module.
 * Currently supports: .docx (Microsoft Word)
 *
 * Client-side exports (.txt, .pdf) are handled entirely in notebook-editor.js
 * via Blob objects and html2pdf.js — no server round-trip required.
 */

'use strict';

const HTMLtoDOCX = require('html-to-docx');
const { NotebookPageModel, NotebookModel } = require('./notebook.model');
const { SYSTEM_MESSAGES } = require('../../config/constants');

/**
 * Build a well-formed HTML document string from page content.
 * Wraps the raw Quill HTML in a minimal skeleton so html-to-docx can
 * honour font declarations and paragraph spacing correctly.
 *
 * @param {string} title        - Page title (used as H1 heading)
 * @param {string} htmlContent  - Raw innerHTML from the Quill editor
 * @param {string} [font]       - Base font family (default: Arial)
 * @returns {string} Full HTML document string
 */
function _buildDocumentHtml(title, htmlContent, font = 'Arial, sans-serif') {
  const safeTitle   = title   ? title.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Untitled';
  const safeContent = htmlContent || '<p></p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <style>
    body {
      font-family: ${font};
      font-size: 12pt;
      line-height: 1.5;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
    }
    h1 { font-size: 22pt; margin-bottom: 12pt; }
    h2 { font-size: 18pt; margin-bottom: 10pt; }
    h3 { font-size: 14pt; margin-bottom: 8pt; }
    p  { margin-bottom: 8pt; }
    blockquote {
      border-left: 3px solid #cccccc;
      margin-left: 0;
      padding-left: 12pt;
      color: #555555;
    }
    pre, code {
      font-family: 'Courier New', monospace;
      font-size: 10pt;
      background: #f4f4f4;
      padding: 4pt;
    }
    ul, ol { margin-bottom: 8pt; padding-left: 20pt; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <h1>${safeTitle}</h1>
  ${safeContent}
</body>
</html>`;
}

/**
 * Generate a .docx Buffer for a single notebook page.
 *
 * @param {object} opts
 * @param {string}  opts.title       - Document title / H1 heading
 * @param {string}  opts.htmlContent - Raw Quill editor HTML
 * @param {string} [opts.font]       - Base font family override
 * @param {string} [opts.creator]    - Author name embedded in DOCX metadata
 * @param {number} [opts.lineHeight] - Line height multiplier (e.g. 1.5)
 * @returns {Promise<Buffer>} Raw .docx binary
 */
async function generateDocx({ title, htmlContent, font, creator = 'GroupSpace', lineHeight = 1.5 }) {
  const documentHtml = _buildDocumentHtml(title, htmlContent, font);

  // html-to-docx options — see: https://github.com/privateOmega/html-to-docx
  const docxOptions = {
    title:           title || 'GroupSpace Export',
    creator,
    description:     'Exported from GroupSpace Collaborative Notebook',
    keywords:        ['groupspace', 'notebook', 'export'],
    orientation:     'portrait',
    // Page margins in twips (1 inch = 1440 twips)
    margins: {
      top:    1440,
      right:  1080,
      bottom: 1440,
      left:   1080,
    },
    font:       font ? font.split(',')[0].replace(/['"]/g, '').trim() : 'Arial',
    fontSize:   24,          // half-points → 12pt
    lineHeight: Math.round(lineHeight * 240), // in twentieths of a point
    table:      { row: { cantSplit: true } },
    header:     false,
    footer:     false,
    pageNumber: false,
  };

  const buffer = await HTMLtoDOCX(documentHtml, null, docxOptions);
  return buffer;
}

/**
 * Fetch a page from the DB, verify it belongs to the expected notebook,
 * and return its data ready for export.
 *
 * @param {number|string} pageId
 * @param {number|string} notebookId
 * @returns {Promise<{title:string, content:string, notebookTitle:string}>}
 */
async function resolvePageForExport(pageId, notebookId) {
  const page = await NotebookPageModel.findById(pageId);

  if (!page) {
    const err = new Error(SYSTEM_MESSAGES.NOTEBOOK_NOT_FOUND);
    err.httpStatus = 404;
    throw err;
  }

  if (String(page.notebook_id) !== String(notebookId)) {
    const err = new Error('Page does not belong to the specified notebook.');
    err.httpStatus = 403;
    throw err;
  }

  const notebook = await NotebookModel.findById(notebookId);

  return {
    title:         page.title   || 'Untitled Page',
    content:       page.content || '',
    notebookTitle: notebook?.title || 'Untitled Notebook',
  };
}

module.exports = { generateDocx, resolvePageForExport };
