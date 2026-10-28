/**
 * GroupSpace — Collaborative Notebook Client Module (notebook.js)
 *
 * Provides:
 * 1. loadNotebookPages() — renders saved pages from the API
 * 2. renderNotebookRichTextToolbar() — injects font/spacing controls
 * 3. exportNotebook() — .txt / .pdf / .docx download
 *
 * NOTE: The "Save Page" modal submit is handled exclusively by
 * handleCreateNote() in dashboard.js (bound via the form's onsubmit
 * attribute). notebook.js must NOT add a second listener on #savePageBtn
 * or #createNoteForm — doing so causes double-fires and wrong-endpoint
 * errors.
 */

'use strict';

/**
 * Loads and renders saved notebook pages / notes in the shared notes list container (#notebookGrid).
 * Supports responses from GET /api/notebooks/:groupId, GET /api/notebooks/pages/:notebookId,
 * and GET /api/groups/:groupId/notes.
 */
async function loadNotebookPages(groupId = null) {
  // Extract groupId, workspaceId, or workspace_id safely from query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const paramGroupId = urlParams.get('groupId') || urlParams.get('workspaceId') || urlParams.get('workspace_id');
  const activeGroupId = groupId || paramGroupId || (typeof currentGroupId !== 'undefined' && currentGroupId ? currentGroupId : null) || localStorage.getItem('groupspace_active_group_id');
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

    // Render note cards — click title to open in full editor
    const activeGroupId2 = typeof currentGroupId !== 'undefined' ? currentGroupId : activeGroupId;
    container.innerHTML = items.map(n => {
      const title = n.title || extractAutoTitleClient(n.content || '');
      const content = n.content || '';
      const author = n.author_name || n.author || 'Member';
      const isPinned = Boolean(n.is_pinned);
      const tags = n.tags || '';
      const safeId = n.id || 0;
      const folderName = n.folder_name || '';
      const editorUrl = `/notebook.html?groupId=${activeGroupId2}&noteId=${safeId}`;
      const creatorId = Number(n.created_by || n.author_user_id || 0);
      const currUid = (typeof currentUser !== 'undefined' && currentUser) ? Number(currentUser.id) : 0;
      const roleStr = String((typeof currentGroupDetails !== 'undefined' && currentGroupDetails?.role) || '').toLowerCase();
      const isLeaderRole = roleStr === 'leader' || roleStr === 'co_leader';
      const canManagePerms = isLeaderRole || (currUid && creatorId === currUid);

      return `
        <div class="note-card ${isPinned ? 'pinned' : ''}" style="cursor:pointer;" onclick="window.location.href='${editorUrl}'" title="Open in Full Editor">
          <div>
            <h4 style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
              <span>${escapeHtml(title)}</span>
              <span style="font-size:10px; padding:2px 7px; background:rgba(82,214,138,0.12); color:#52D68A; border-radius:10px; font-weight:600; white-space:nowrap;">Edit</span>
            </h4>
            ${folderName ? `<div style="font-size:11px; color:#38bdf8; margin-bottom:6px; font-weight:600;">${escapeHtml(folderName)}</div>` : ''}
            <p style="white-space:pre-wrap;">${escapeHtml((content || '').replace(/^<!--GS_SHAPES_JSON:.*?-->/, '').replace(/<[^>]*>/g, '').trim().slice(0, 200))}${(content || '').length > 200 ? '…' : ''}</p>
          </div>
          <div onclick="event.stopPropagation();">
            ${tags ? `
              <div style="margin-top:10px; display:flex; gap:6px; flex-wrap:wrap;">
                ${tags.split(',').map(t => `<span style="font-size:11px; padding:2px 8px; background:#202522; border-radius:6px; color:var(--primary); font-weight:600;">#${escapeHtml(t.trim())}</span>`).join('')}
              </div>
            ` : ''}
            <div class="note-meta" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-top:12px;">
              <span>By ${escapeHtml(author)}</span>
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                ${canManagePerms && typeof openDashboardShareModal === 'function' ? `<button type="button" title="Share / Page Permissions" class="btn-export-badge" onclick="openDashboardShareModal(${safeId})" style="background:#0f172a; border:1px solid #334155; color:#ffffff; border-radius:6px; padding:3px 8px; font-size:11px; font-weight:600; cursor:pointer;">Share</button>` : ''}
                <button type="button" title="Download Plain Text (.txt)" class="btn-export-badge" onclick="exportNotebook('txt', ${safeId}, '${escapeHtml(title)}', '${escapeHtml(content)}')" style="background:var(--card, #ffffff); border:1px solid var(--border, #cbd5e1); color:var(--text, #1e293b); border-radius:6px; padding:3px 8px; font-size:11px; font-weight:600; cursor:pointer;">.txt</button>
                <button type="button" title="Download PDF (.pdf)" class="btn-export-badge" onclick="exportNotebook('pdf', ${safeId}, '${escapeHtml(title)}', '${escapeHtml(content)}')" style="background:var(--card, #ffffff); border:1px solid var(--border, #cbd5e1); color:var(--text, #1e293b); border-radius:6px; padding:3px 8px; font-size:11px; font-weight:600; cursor:pointer;">.pdf</button>
                <button type="button" title="Download Word (.docx)" class="btn-export-badge" onclick="exportNotebook('docx', ${safeId}, '${escapeHtml(title)}', '${escapeHtml(content)}')" style="background:var(--card, #ffffff); border:1px solid var(--border, #cbd5e1); color:var(--text, #1e293b); border-radius:6px; padding:3px 8px; font-size:11px; font-weight:600; cursor:pointer;">.docx</button>
                <span style="cursor:pointer; color:#FF7272; margin-left:4px; font-size:11px; font-weight:600;" title="Delete Note" onclick="deleteNote(${safeId})">Delete</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load notebook pages:', err);
    container.innerHTML = '<p style="color:var(--gray, #64748b); padding:30px;">Error loading notebook pages.</p>';
  }
}

/**
 * Helper to extract Microsoft Office style auto-title on client from content
 */
function extractAutoTitleClient(rawContent = '') {
  const cleaned = String(rawContent || '')
    .replace(/^<!--GS_SHAPES_JSON:.*?-->/, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  if (!cleaned) return 'Untitled Page';
  const firstLine = cleaned.split(/\r?\n/).map(l => l.trim()).find(Boolean) || cleaned;
  const sentenceMatch = firstLine.match(/^(.+?[.!?])(?:\s|$)/);
  const candidate = (sentenceMatch ? sentenceMatch[1] : firstLine).trim();
  return candidate.length > 65 ? candidate.slice(0, 65).trim() : candidate;
}

/**
 * 2. RENDER RICH TEXT CONTROLS:
 * High-contrast dark slate (#0f172a) with white text/icons (#ffffff), numeric font sizes (12px-36px),
 * text alignment (Left, Center, Right, Justify), Bold/Italic/Underline, Text Color, and Highlight Color.
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
    <div class="notebook-toolbar notebook-rich-toolbar" style="display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:8px 12px; background:#0f172a; color:#ffffff; border:1px solid #334155; border-radius:8px; margin-bottom:10px;">
      <!-- Font Family Dropdown -->
      <div style="display:flex; align-items:center; gap:4px;">
        <label style="font-size:11px; font-weight:700; color:#ffffff; margin:0;">Font:</label>
        <select id="nbFontFamily" class="nb-tb-select" style="background:#1e293b !important; color:#ffffff !important; border:1px solid #475569; border-radius:6px; padding:4px 6px; font-size:12px; cursor:pointer;" onchange="applyNotebookFont(this.value)">
          <option value="Inter, sans-serif" selected>Inter</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="Calibri, sans-serif">Calibri</option>
          <option value="'Times New Roman', Times, serif">Times New Roman</option>
          <option value="Georgia, serif">Georgia</option>
        </select>
      </div>

      <!-- Numeric Pixel Font Sizes -->
      <div style="display:flex; align-items:center; gap:4px;">
        <label style="font-size:11px; font-weight:700; color:#ffffff; margin:0;">Size:</label>
        <select id="nbFontSizePx" class="nb-tb-select" style="background:#1e293b !important; color:#ffffff !important; border:1px solid #475569; border-radius:6px; padding:4px 6px; font-size:12px; cursor:pointer;" onchange="applyNotebookFontSizePx(this.value)">
          <option value="12px">12px</option>
          <option value="14px">14px</option>
          <option value="16px" selected>16px</option>
          <option value="18px">18px</option>
          <option value="20px">20px</option>
          <option value="24px">24px</option>
          <option value="28px">28px</option>
          <option value="32px">32px</option>
          <option value="36px">36px</option>
        </select>
      </div>

      <!-- Text Styling: Bold, Italic, Underline -->
      <div style="display:flex; align-items:center; gap:4px;">
        <button type="button" onclick="applyNotebookCommand('bold')" title="Bold" style="background:#1e293b; color:#ffffff; border:1px solid #475569; border-radius:5px; padding:4px 8px; font-size:12px; font-weight:700; cursor:pointer;"><b>B</b></button>
        <button type="button" onclick="applyNotebookCommand('italic')" title="Italic" style="background:#1e293b; color:#ffffff; border:1px solid #475569; border-radius:5px; padding:4px 8px; font-size:12px; font-style:italic; cursor:pointer;"><i>I</i></button>
        <button type="button" onclick="applyNotebookCommand('underline')" title="Underline" style="background:#1e293b; color:#ffffff; border:1px solid #475569; border-radius:5px; padding:4px 8px; font-size:12px; text-decoration:underline; cursor:pointer;"><u>U</u></button>
      </div>

      <!-- Text Color & Highlight Pickers -->
      <div style="display:flex; align-items:center; gap:6px;">
        <label style="display:flex; align-items:center; gap:4px; font-size:11px; color:#ffffff; cursor:pointer;" title="Text Color (foreColor)">
          <span>A</span>
          <input type="color" id="nbForeColor" value="#0f172a" onchange="applyNotebookColor('foreColor', this.value)" style="width:20px; height:20px; border:none; background:transparent; cursor:pointer; padding:0;">
        </label>
        <label style="display:flex; align-items:center; gap:4px; font-size:11px; color:#ffffff; cursor:pointer;" title="Highlight Color (hiliteColor)">
          <span>🖍</span>
          <input type="color" id="nbHiliteColor" value="#fef08a" onchange="applyNotebookColor('hiliteColor', this.value)" style="width:20px; height:20px; border:none; background:transparent; cursor:pointer; padding:0;">
        </label>
      </div>

      <!-- Alignment: Left, Center, Right, Justify -->
      <div style="display:flex; align-items:center; gap:4px;">
        <button type="button" onclick="applyNotebookCommand('justifyLeft')" title="Align Left" style="background:#1e293b; color:#ffffff; border:1px solid #475569; border-radius:5px; padding:4px 7px; font-size:11px; cursor:pointer;">⬅</button>
        <button type="button" onclick="applyNotebookCommand('justifyCenter')" title="Align Center" style="background:#1e293b; color:#ffffff; border:1px solid #475569; border-radius:5px; padding:4px 7px; font-size:11px; cursor:pointer;">↔</button>
        <button type="button" onclick="applyNotebookCommand('justifyRight')" title="Align Right" style="background:#1e293b; color:#ffffff; border:1px solid #475569; border-radius:5px; padding:4px 7px; font-size:11px; cursor:pointer;">➡</button>
        <button type="button" onclick="applyNotebookCommand('justifyFull')" title="Justify Full" style="background:#1e293b; color:#ffffff; border:1px solid #475569; border-radius:5px; padding:4px 7px; font-size:11px; cursor:pointer;">☰</button>
      </div>

      <!-- Line Height / Spacing Dropdown -->
      <div style="display:flex; align-items:center; gap:4px;">
        <label style="font-size:11px; font-weight:700; color:#ffffff; margin:0;">Spacing:</label>
        <select id="nbLineHeight" class="nb-tb-select" style="background:#1e293b !important; color:#ffffff !important; border:1px solid #475569; border-radius:6px; padding:4px 6px; font-size:12px; cursor:pointer;" onchange="applyNotebookLineHeight(this.value)">
          <option value="1.0">1.0</option>
          <option value="1.15">1.15</option>
          <option value="1.5" selected>1.5</option>
          <option value="2.0">2.0</option>
        </select>
      </div>
    </div>
  `;
}

function applyNotebookFont(fontFamily) {
  const editorEl = document.getElementById('pageContent') || document.getElementById('noteContent');
  if (editorEl) editorEl.style.fontFamily = fontFamily;
}

function applyNotebookFontSizePx(sizePx) {
  const editorEl = document.getElementById('pageContent') || document.getElementById('noteContent');
  if (!editorEl) return;
  if (editorEl.isContentEditable) {
    document.execCommand('fontSize', false, '7');
    editorEl.querySelectorAll('font[size="7"]').forEach(el => {
      const span = document.createElement('span');
      span.style.fontSize = sizePx;
      span.innerHTML = el.innerHTML;
      el.replaceWith(span);
    });
  } else {
    editorEl.style.fontSize = sizePx;
  }
}

function applyNotebookCommand(cmd) {
  const editorEl = document.getElementById('pageContent') || document.getElementById('noteContent');
  if (!editorEl) return;
  if (editorEl.isContentEditable) {
    editorEl.focus();
    document.execCommand(cmd, false, null);
  } else if (cmd === 'justifyLeft') {
    editorEl.style.textAlign = 'left';
  } else if (cmd === 'justifyCenter') {
    editorEl.style.textAlign = 'center';
  } else if (cmd === 'justifyRight') {
    editorEl.style.textAlign = 'right';
  } else if (cmd === 'justifyFull') {
    editorEl.style.textAlign = 'justify';
  }
}

function applyNotebookColor(cmd, colorVal) {
  const editorEl = document.getElementById('pageContent') || document.getElementById('noteContent');
  if (!editorEl) return;
  if (editorEl.isContentEditable) {
    editorEl.focus();
    document.execCommand(cmd, false, colorVal);
  } else if (cmd === 'foreColor') {
    editorEl.style.color = colorVal;
  } else if (cmd === 'hiliteColor') {
    editorEl.style.backgroundColor = colorVal;
  }
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
  let content = String(rawContent || '').replace(/^<!--GS_SHAPES_JSON:.*?-->/, '');
  let pageTitle = title;

  // If content is empty, try grabbing from DOM
  if (!content) {
    const editor = document.getElementById('pageContent') || document.getElementById('noteContent');
    content = editor ? (editor.value || editor.innerHTML || '') : '';
    content = content.replace(/^<!--GS_SHAPES_JSON:.*?-->/, '');
  }
  if (!pageTitle || pageTitle === 'Notebook_Page') {
    const titleEl = document.getElementById('pageTitle') || document.getElementById('noteTitle');
    pageTitle = (titleEl && titleEl.value.trim()) ? titleEl.value.trim() : extractAutoTitleClient(content);
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

// Auto-initialize toolbar when DOM is ready
// (Note: modal save is handled by handleCreateNote in dashboard.js)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    renderNotebookRichTextToolbar();
  });
} else {
  renderNotebookRichTextToolbar();
}
