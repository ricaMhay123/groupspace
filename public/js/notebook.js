/**
 * GroupSpace — Collaborative Notebook Client Module (notebook.js)
 * 
 * Features:
 * 1. Modal Save Page handler with try/catch and matching HTML IDs
 * 2. Rich Text Font & Spacing controls injection
 * 3. Multi-format Document Export (.txt, .pdf via html2pdf, .docx via API)
 */

'use strict';

/**
 * 1. FIX THE MODAL BUG:
 * Event listener for `#savePageBtn` / `#createNoteForm`.
 * Supports both ID conventions (pageTitle / noteTitle, etc.).
 */
function initSavePageModalListener() {
  const saveBtn = document.getElementById('savePageBtn');
  const form = document.getElementById('createNoteForm');

  async function handleSavePage(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    // Support both ID conventions (pageTitle/noteTitle, pageContent/noteContent, etc.)
    const titleEl   = document.getElementById('pageTitle')   || document.getElementById('noteTitle');
    const contentEl = document.getElementById('pageContent') || document.getElementById('noteContent');
    const tagsEl    = document.getElementById('pageTags')    || document.getElementById('noteTags');
    const pinEl     = document.getElementById('pinNote')     || document.getElementById('notePinned');

    const title    = titleEl ? titleEl.value.trim() : '';
    const content  = contentEl ? contentEl.value : '';
    const tags     = tagsEl ? tagsEl.value.trim() : '';
    const isPinned = pinEl ? Boolean(pinEl.checked) : false;

    if (!title) {
      if (typeof showToast === 'function') showToast('Page title is required.', 'error');
      if (titleEl) titleEl.focus();
      return;
    }

    // Button loading state to prevent double submits
    const btn = saveBtn || (e?.target ? e.target.querySelector('button[type="submit"]') : null);
    const origText = btn ? btn.textContent : 'Save Page';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving...';
    }

    try {
      const activeGroupId = typeof currentGroupId !== 'undefined' ? currentGroupId : null;

      // Primary: POST /api/notebooks/pages
      const payload = {
        title,
        content,
        tags,
        isPinned,
        groupId: activeGroupId
      };

      const res = await fetch('/api/notebooks/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        // Fallback to legacy notes endpoint if group-specific
        if (activeGroupId) {
          await apiFetch(`/api/groups/${activeGroupId}/notes`, {
            method: 'POST',
            body: JSON.stringify(payload)
          });
        } else {
          throw new Error(data.message || 'Failed to save page.');
        }
      }

      // Close modal on success
      if (typeof closeModal === 'function') {
        closeModal('createNoteModal');
      } else {
        const modal = document.getElementById('createNoteModal');
        if (modal) modal.style.display = 'none';
      }

      // Reset form
      if (form) form.reset();
      if (titleEl) titleEl.value = '';
      if (contentEl) contentEl.value = '';
      if (tagsEl) tagsEl.value = '';
      if (pinEl) pinEl.checked = false;

      if (typeof showToast === 'function') {
        showToast('Page saved successfully!', 'success');
      }

      // Refresh list using loadNotebookPages
      if (typeof loadNotebookPages === 'function') {
        await loadNotebookPages();
      } else if (typeof loadNotebook === 'function') {
        await loadNotebook();
      }
    } catch (err) {
      console.error('Error saving notebook page:', err);
      if (typeof showToast === 'function') {
        showToast(err.message || 'Error saving notebook page.', 'error');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = origText;
      }
    }
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', handleSavePage);
  }
  if (form) {
    form.addEventListener('submit', handleSavePage);
  }
}

/**
 * Loads and renders saved notebook pages / notes in the shared notes list container (#notebookGrid).
 * Supports responses from GET /api/notebooks/:groupId, GET /api/notebooks/pages/:notebookId,
 * and GET /api/groups/:groupId/notes.
 */
async function loadNotebookPages(groupId = null) {
  const activeGroupId = groupId || (typeof currentGroupId !== 'undefined' ? currentGroupId : null);
  const container = document.getElementById('notebookGrid');
  if (!container || !activeGroupId) return;

  try {
    // 1. Fetch from /api/notebooks/:groupId
    const res = await fetch(`/api/notebooks/${activeGroupId}`, {
      credentials: 'same-origin'
    });
    const result = await res.json();

    let items = [];

    // Parse records from result.notes, result.data, or pages
    if (result && result.notes && Array.isArray(result.notes) && result.notes.length > 0) {
      items = result.notes;
    } else if (result && Array.isArray(result.data) && result.data.length > 0) {
      items = result.data;
    } else if (result && result.data && Array.isArray(result.data.pages) && result.data.pages.length > 0) {
      items = result.data.pages;
    }

    // 2. If no items yet, check if there's a notebookId to query /api/notebooks/pages/:notebookId
    if (items.length === 0 && result && Array.isArray(result.data) && result.data.length > 0 && result.data[0].id) {
      const primaryNotebookId = result.data[0].id;
      const pagesRes = await fetch(`/api/notebooks/pages/${primaryNotebookId}`, { credentials: 'same-origin' });
      const pagesData = await pagesRes.json();
      if (pagesData && pagesData.data && Array.isArray(pagesData.data.pages)) {
        items = pagesData.data.pages;
      }
    }

    // 3. Fallback to /api/groups/:groupId/notes if empty
    if (items.length === 0 && typeof apiFetch === 'function') {
      try {
        const legacyRes = await apiFetch(`/api/groups/${activeGroupId}/notes`);
        if (legacyRes && Array.isArray(legacyRes.data)) {
          items = legacyRes.data;
        }
      } catch (e) {}
    }

    // Render empty state
    if (!items || items.length === 0) {
      container.innerHTML = '<p style="color:var(--gray); padding:30px;">No notebook pages found. Create your first page!</p>';
      return;
    }

    // Render note cards matching active group_id
    container.innerHTML = items.map(n => {
      const title = n.title || 'Untitled Page';
      const content = n.content || '';
      const author = n.author_name || n.author || 'Member';
      const isPinned = Boolean(n.is_pinned);
      const tags = n.tags || '';
      const safeId = n.id || 0;

      return `
        <div class="note-card ${isPinned ? 'pinned' : ''}">
          <div>
            <h4>${escapeHtml(title)}</h4>
            <p style="white-space:pre-wrap;">${escapeHtml(content)}</p>
          </div>
          <div>
            ${tags ? `
              <div style="margin-top:10px; display:flex; gap:6px; flex-wrap:wrap;">
                ${tags.split(',').map(t => `<span style="font-size:11px; padding:2px 8px; background:#202522; border-radius:6px; color:var(--primary); font-weight:600;">#${escapeHtml(t.trim())}</span>`).join('')}
              </div>
            ` : ''}
            <div class="note-meta" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-top:12px;">
              <span>✍️ ${escapeHtml(author)}</span>
              <div style="display:flex; align-items:center; gap:6px;">
                <button type="button" title="Download Plain Text (.txt)" class="btn-export-badge" onclick="exportNotebook('txt', ${safeId}, '${escapeHtml(title)}', '${escapeHtml(content)}')" style="background:#1B231E; border:1px solid #2B342F; color:#E1E7E3; border-radius:4px; padding:2px 6px; font-size:11px; cursor:pointer;">📄 .txt</button>
                <button type="button" title="Download PDF (.pdf)" class="btn-export-badge" onclick="exportNotebook('pdf', ${safeId}, '${escapeHtml(title)}', '${escapeHtml(content)}')" style="background:#1B231E; border:1px solid #2B342F; color:#E1E7E3; border-radius:4px; padding:2px 6px; font-size:11px; cursor:pointer;">📕 .pdf</button>
                <button type="button" title="Download Word (.docx)" class="btn-export-badge" onclick="exportNotebook('docx', ${safeId}, '${escapeHtml(title)}', '${escapeHtml(content)}')" style="background:#1B231E; border:1px solid #2B342F; color:#E1E7E3; border-radius:4px; padding:2px 6px; font-size:11px; cursor:pointer;">📘 .docx</button>
                <span style="cursor:pointer; color:#FF7272; margin-left:4px;" title="Delete Note" onclick="deleteNote(${safeId})">🗑️</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load notebook pages:', err);
    container.innerHTML = '<p style="color:var(--gray); padding:30px;">Error loading notebook pages.</p>';
  }
}

/**
 * 2. RENDER RICH TEXT CONTROLS:
 * Injects Font Family and Line/Paragraph Spacing toolbar into the Notebook DOM.
 */
function renderNotebookRichTextToolbar(targetContainerId = 'notebookToolbarContainer') {
  let container = document.getElementById(targetContainerId);

  // If container doesn't exist, create and inject it above the content editor
  if (!container) {
    const editorEl = document.getElementById('pageContent') || document.getElementById('noteContent');
    if (!editorEl) return;
    
    container = document.createElement('div');
    container.id = targetContainerId;
    container.className = 'notebook-rich-toolbar';
    editorEl.parentNode.insertBefore(container, editorEl);
  }

  container.innerHTML = `
    <div style="display:flex; flex-wrap:wrap; align-items:center; gap:10px; padding:8px 12px; background:#1C221F; border:1px solid #2B342F; border-radius:8px; margin-bottom:10px;">
      <!-- Font Family Dropdown -->
      <div style="display:flex; align-items:center; gap:6px;">
        <label style="font-size:12px; color:var(--gray); margin:0;">Font:</label>
        <select id="nbFontFamily" style="background:#131815; color:#E1E7E3; border:1px solid #2B342F; border-radius:6px; padding:4px 8px; font-size:13px; cursor:pointer;" onchange="applyNotebookFont(this.value)">
          <option value="Arial" selected>Arial</option>
          <option value="Calibri">Calibri</option>
          <option value="'Times New Roman', Times, serif">Times New Roman</option>
        </select>
      </div>

      <!-- Line Height Dropdown -->
      <div style="display:flex; align-items:center; gap:6px;">
        <label style="font-size:12px; color:var(--gray); margin:0;">Spacing:</label>
        <select id="nbLineHeight" style="background:#131815; color:#E1E7E3; border:1px solid #2B342F; border-radius:6px; padding:4px 8px; font-size:13px; cursor:pointer;" onchange="applyNotebookLineHeight(this.value)">
          <option value="1.0">1.0 (Single)</option>
          <option value="1.15">1.15</option>
          <option value="1.5" selected>1.5 (Standard)</option>
          <option value="2.0">2.0 (Double)</option>
        </select>
      </div>

      <!-- Paragraph Margin Control -->
      <div style="display:flex; align-items:center; gap:6px;">
        <label style="font-size:12px; color:var(--gray); margin:0;">Para Margin:</label>
        <select id="nbParaMargin" style="background:#131815; color:#E1E7E3; border:1px solid #2B342F; border-radius:6px; padding:4px 8px; font-size:13px; cursor:pointer;" onchange="applyNotebookParaMargin(this.value)">
          <option value="0px">None</option>
          <option value="8px">Small (8px)</option>
          <option value="16px" selected>Normal (16px)</option>
          <option value="24px">Large (24px)</option>
        </select>
      </div>
    </div>
  `;
}

function applyNotebookFont(fontFamily) {
  const editorEl = document.getElementById('pageContent') || document.getElementById('noteContent');
  if (editorEl) editorEl.style.fontFamily = fontFamily;
}

function applyNotebookLineHeight(lineHeight) {
  const editorEl = document.getElementById('pageContent') || document.getElementById('noteContent');
  if (editorEl) editorEl.style.lineHeight = lineHeight;
}

function applyNotebookParaMargin(margin) {
  const editorEl = document.getElementById('pageContent') || document.getElementById('noteContent');
  if (editorEl) editorEl.style.marginBottom = margin;
}

/**
 * 3. RENDER EXPORT BUTTONS & HANDLERS:
 * Exports active note or page to .txt, .pdf, or .docx.
 */
async function exportNotebook(format, noteId, title = 'Notebook_Page', rawContent = '') {
  let content = rawContent;
  let pageTitle = title;

  // If content is empty, try grabbing from DOM
  if (!content) {
    const editor = document.getElementById('pageContent') || document.getElementById('noteContent');
    content = editor ? editor.value : '';
  }
  if (!pageTitle) {
    const titleEl = document.getElementById('pageTitle') || document.getElementById('noteTitle');
    pageTitle = titleEl ? titleEl.value.trim() : 'Document';
  }

  const safeTitle = (pageTitle || 'Document').replace(/[^a-z0-9_-]/gi, '_');

  switch (format.toLowerCase()) {
    case 'txt': {
      // 1. .txt Export: Strip tags and download Blob
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainText = `${pageTitle}\n${'='.repeat(pageTitle.length)}\n\n${tempDiv.textContent || tempDiv.innerText || content}`;
      
      const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeTitle}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (typeof showToast === 'function') showToast('Downloaded .txt file', 'success');
      break;
    }

    case 'pdf': {
      // 2. .pdf Export: html2pdf.js
      if (typeof html2pdf === 'undefined') {
        if (typeof showToast === 'function') {
          showToast('Loading PDF generator...', 'info');
        }
        // Load dynamically if missing
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => exportNotebook('pdf', noteId, title, rawContent);
        document.head.appendChild(script);
        return;
      }

      const font = document.getElementById('nbFontFamily')?.value || 'Arial';
      const lineHeight = document.getElementById('nbLineHeight')?.value || '1.5';

      const pdfContainer = document.createElement('div');
      pdfContainer.style.padding = '24px';
      pdfContainer.style.fontFamily = font;
      pdfContainer.style.lineHeight = lineHeight;
      pdfContainer.style.color = '#111';
      pdfContainer.style.background = '#fff';
      pdfContainer.innerHTML = `
        <h1 style="border-bottom:2px solid #333; padding-bottom:8px; font-size:22px;">${pageTitle}</h1>
        <div style="margin-top:16px; font-size:14px; white-space:pre-wrap;">${content}</div>
      `;

      html2pdf().from(pdfContainer).set({
        margin: [10, 10, 10, 10],
        filename: `${safeTitle}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).save().then(() => {
        if (typeof showToast === 'function') showToast('Downloaded .pdf document', 'success');
      }).catch(err => {
        console.error('PDF export failed:', err);
        if (typeof showToast === 'function') showToast('Failed to generate PDF.', 'error');
      });
      break;
    }

    case 'docx': {
      // 3. .docx Export: POST to backend endpoint
      try {
        if (typeof showToast === 'function') showToast('Generating Word document...', 'info');

        const font = document.getElementById('nbFontFamily')?.value || 'Arial';
        const lineHeight = document.getElementById('nbLineHeight')?.value || 1.5;

        const response = await fetch('/api/notebooks/export/docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            title: pageTitle,
            htmlContent: `<h2>${pageTitle}</h2><p>${content.replace(/\n/g, '<br/>')}</p>`,
            font: font.replace(/['",]/g, ''),
            lineHeight: parseFloat(lineHeight)
          })
        });

        if (!response.ok) {
          throw new Error('Server DOCX generation failed.');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeTitle}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (typeof showToast === 'function') showToast('Downloaded .docx document', 'success');
      } catch (err) {
        console.error('DOCX export error:', err);
        if (typeof showToast === 'function') showToast(err.message || 'DOCX export failed', 'error');
      }
      break;
    }

    default:
      console.warn('Unknown export format:', format);
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initSavePageModalListener();
    renderNotebookRichTextToolbar();
  });
} else {
  initSavePageModalListener();
  renderNotebookRichTextToolbar();
}
