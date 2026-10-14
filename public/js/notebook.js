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

      // Refresh list
      if (typeof loadNotebook === 'function') {
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
