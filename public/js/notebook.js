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
                ${tags.split(',').map(t => `<span style="font-size:11px; padding:2px 8px; background:var(--muted, #f1f5f9); border:1px solid var(--border, #cbd5e1); border-radius:6px; color:var(--primary); font-weight:600;">#${escapeHtml(t.trim())}</span>`).join('')}
              </div>
            ` : ''}
            <div class="note-meta" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-top:12px;">
              <span>By ${escapeHtml(author)}</span>
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                ${canManagePerms && typeof openDashboardShareModal === 'function' ? `<button type="button" title="Share / Page Permissions" class="btn-export-badge" onclick="openDashboardShareModal(${safeId})" style="background:var(--card, #ffffff); border:1px solid var(--border, #cbd5e1); color:var(--text, #0f172a); border-radius:6px; padding:3px 8px; font-size:11px; font-weight:600; cursor:pointer;">Share</button>` : ''}
                <button type="button" title="Download Plain Text (.txt)" class="btn-export-badge" onclick="exportNotebook('txt', ${safeId}, '${escapeHtml(title)}', '${escapeHtml(content)}')" style="background:var(--card, #ffffff); border:1px solid var(--border, #cbd5e1); color:var(--text, #0f172a); border-radius:6px; padding:3px 8px; font-size:11px; font-weight:600; cursor:pointer;">.txt</button>
                <button type="button" title="Download PDF (.pdf)" class="btn-export-badge" onclick="exportNotebook('pdf', ${safeId}, '${escapeHtml(title)}', '${escapeHtml(content)}')" style="background:var(--card, #ffffff); border:1px solid var(--border, #cbd5e1); color:var(--text, #0f172a); border-radius:6px; padding:3px 8px; font-size:11px; font-weight:600; cursor:pointer;">.pdf</button>
                <button type="button" title="Download Word (.docx)" class="btn-export-badge" onclick="exportNotebook('docx', ${safeId}, '${escapeHtml(title)}', '${escapeHtml(content)}')" style="background:var(--card, #ffffff); border:1px solid var(--border, #cbd5e1); color:var(--text, #0f172a); border-radius:6px; padding:3px 8px; font-size:11px; font-weight:600; cursor:pointer;">.docx</button>
                <span style="cursor:pointer; color:#ef4444; margin-left:4px; font-size:11px; font-weight:600;" title="Delete Note" onclick="deleteNote(${safeId}, event)">Delete</span>
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
  if (!cleaned) return 'Untitled Note';
  const firstLine = cleaned.split(/\r?\n/).map(l => l.trim()).find(Boolean) || cleaned;
  const sentenceMatch = firstLine.match(/^(.+?[.!?])(?:\s|$)/);
  const candidate = (sentenceMatch ? sentenceMatch[1] : firstLine).trim();
  return (candidate.length > 65 ? candidate.slice(0, 65).trim() : candidate) || 'Untitled Note';
}

/**
 * 2. RENDER RICH TEXT & DRAWING TOOLBAR (MICROSOFT WORD STYLE):
 * Includes Home/Insert/Draw/Layout ribbon options, Insert Shape / Flowchart Elements dropdown
 * (Rectangle, Circle, Diamond (Decision), Oval (Terminal), Callout Box, Straight Line,
 * Broken/Dashed Line, Arrow Line, Dashed Arrow Line), Stroke Thickness (1px, 2px, 4px, 6px),
 * Fill/Stroke color pickers, Bold/Italic/Underline, Text Alignment (Left, Center, Right, Justify),
 * Numeric Font Sizes (12px-36px), Text Color, and Text Highlight.
 */
function renderNotebookRichTextToolbar(targetContainerId = 'notebookToolbarContainer', editorTargetId = null) {
  let container = document.getElementById(targetContainerId);

  // If container doesn't exist, create and inject it above the content editor
  if (!container) {
    const editorEl = (editorTargetId && document.getElementById(editorTargetId)) || document.getElementById('pageContent');
    if (!editorEl) return;
    
    // Safety guard: Never inject rich toolbar into simple creation modals or hidden elements
    if (editorEl.closest && (editorEl.closest('#createNoteModal') || editorEl.closest('.modal') || editorEl.closest('.modal-card') || editorEl.closest('.nb-modal-card'))) return;
    if (editorEl.style && editorEl.style.display === 'none') return;

    container = document.createElement('div');
    container.id = targetContainerId;
    container.className = 'notebook-rich-toolbar';
    editorEl.parentNode.insertBefore(container, editorEl);
  }

  const targetArg = editorTargetId ? `'${editorTargetId}'` : 'null';

  container.innerHTML = `
    <div class="notebook-toolbar notebook-rich-toolbar" style="display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:8px 12px; background:var(--toolbar-bg, #f8fafc); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:8px; margin-bottom:10px;">
      <!-- MS Word Style Ribbon Options: File / Home / Insert / Draw / Layout -->
      <div class="nb-word-ribbon-bar" style="display:flex; align-items:center; gap:4px; width:100%; padding-bottom:6px; margin-bottom:2px; border-bottom:1px solid var(--toolbar-border, #cbd5e1);">
        <button type="button" class="nb-ribbon-btn" data-ribbon="file" onclick="switchEmbeddedRibbonTab(this, 'file')" style="background:transparent; color:var(--toolbar-text, #0f172a); border:1px solid transparent; border-radius:5px; padding:3px 10px; font-size:11px; font-weight:700; cursor:pointer;">File</button>
        <button type="button" class="nb-ribbon-btn active" data-ribbon="home" onclick="switchEmbeddedRibbonTab(this, 'home')" style="background:#2563eb; color:#ffffff; border:1px solid #38bdf8; border-radius:5px; padding:3px 10px; font-size:11px; font-weight:700; cursor:pointer;">Home</button>
        <button type="button" class="nb-ribbon-btn" data-ribbon="insert" onclick="switchEmbeddedRibbonTab(this, 'insert')" style="background:transparent; color:var(--toolbar-text, #0f172a); border:1px solid transparent; border-radius:5px; padding:3px 10px; font-size:11px; font-weight:700; cursor:pointer;">Insert</button>
        <button type="button" class="nb-ribbon-btn" data-ribbon="draw" onclick="switchEmbeddedRibbonTab(this, 'draw')" style="background:transparent; color:var(--toolbar-text, #0f172a); border:1px solid transparent; border-radius:5px; padding:3px 10px; font-size:11px; font-weight:700; cursor:pointer;">Draw</button>
        <button type="button" class="nb-ribbon-btn" data-ribbon="layout" onclick="switchEmbeddedRibbonTab(this, 'layout')" style="background:transparent; color:var(--toolbar-text, #0f172a); border:1px solid transparent; border-radius:5px; padding:3px 10px; font-size:11px; font-weight:700; cursor:pointer;">Layout</button>
        <span style="margin-left:auto; font-size:10.5px; color:var(--gray, #64748b); font-weight:600;">Auto-Title on Save</span>
      </div>

      <!-- File Tab: Export PDF / Save TXT / Export DOCX -->
      <div data-ribbon-section="file" style="display:none; align-items:center; gap:8px; flex-wrap:wrap;">
        <button type="button" onclick="embeddedExportEditor('pdf', ${targetArg})" title="Export PDF" style="display:inline-flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-width:74px; height:48px; background:var(--toolbar-surface, #ffffff); color:#dc2626; border:1px solid #fecaca; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:700; cursor:pointer;">
          <span style="font-size:15px;">📄</span>
          <span>Export PDF</span>
        </button>
        <button type="button" onclick="embeddedExportEditor('txt', ${targetArg})" title="Save TXT" style="display:inline-flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-width:74px; height:48px; background:var(--toolbar-surface, #ffffff); color:#059669; border:1px solid #a7f3d0; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:700; cursor:pointer;">
          <span style="font-size:15px;">⬇</span>
          <span>Save TXT</span>
        </button>
        <button type="button" onclick="embeddedExportEditor('docx', ${targetArg})" title="Export DOCX" style="display:inline-flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-width:74px; height:48px; background:var(--toolbar-surface, #ffffff); color:#2563eb; border:1px solid #bfdbfe; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:700; cursor:pointer;">
          <span style="font-size:15px;">📘</span>
          <span>Export DOCX</span>
        </button>
      </div>

      <!-- Font Family Dropdown -->
      <div data-ribbon-section="home layout" style="display:flex; align-items:center; gap:4px;">
        <label style="font-size:11px; font-weight:700; color:var(--toolbar-text, #0f172a); margin:0;">Font:</label>
        <select id="nbFontFamily_${targetContainerId}" class="nb-tb-select" style="background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:6px; padding:4px 6px; font-size:12px; cursor:pointer;" onchange="applyNotebookFont(this.value, ${targetArg})">
          <option value="Arial, sans-serif" selected>Arial</option>
          <option value="Calibri, sans-serif">Calibri</option>
          <option value="'Times New Roman', Times, serif">Times New Roman</option>
          <option value="Inter, sans-serif">Inter</option>
          <option value="Georgia, serif">Georgia</option>
        </select>
      </div>

      <!-- Numeric Pixel Font Sizes (12px to 36px) -->
      <div data-ribbon-section="home layout" style="display:flex; align-items:center; gap:4px;">
        <label style="font-size:11px; font-weight:700; color:var(--toolbar-text, #0f172a); margin:0;">Size:</label>
        <select id="nbFontSizePx_${targetContainerId}" class="nb-tb-select" style="background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:6px; padding:4px 6px; font-size:12px; cursor:pointer;" onchange="applyNotebookFontSizePx(this.value, ${targetArg})">
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

      <!-- Text Styling: Bold, Italic, Underline, Strikethrough, Subscript, Superscript, Clear Formatting -->
      <div data-ribbon-section="home" style="display:flex; align-items:center; gap:4px;">
        <button type="button" onclick="applyNotebookCommand('bold', ${targetArg})" title="Bold" style="background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:5px; padding:4px 8px; font-size:12px; font-weight:700; cursor:pointer;"><b>B</b></button>
        <button type="button" onclick="applyNotebookCommand('italic', ${targetArg})" title="Italic" style="background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:5px; padding:4px 8px; font-size:12px; font-style:italic; cursor:pointer;"><i>I</i></button>
        <button type="button" onclick="applyNotebookCommand('underline', ${targetArg})" title="Underline" style="background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:5px; padding:4px 8px; font-size:12px; text-decoration:underline; cursor:pointer;"><u>U</u></button>
        <button type="button" onclick="applyNotebookCommand('strikeThrough', ${targetArg})" title="Strikethrough" style="background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:5px; padding:4px 8px; font-size:12px; cursor:pointer;"><s>S</s></button>
        <button type="button" onclick="applyNotebookCommand('subscript', ${targetArg})" title="Subscript (X₂)" style="background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:5px; padding:4px 8px; font-size:12px; cursor:pointer;">X<sub>2</sub></button>
        <button type="button" onclick="applyNotebookCommand('superscript', ${targetArg})" title="Superscript (X²)" style="background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:5px; padding:4px 8px; font-size:12px; cursor:pointer;">X<sup>2</sup></button>
        <button type="button" onclick="applyNotebookCommand('removeFormat', ${targetArg})" title="Clear Formatting" style="background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:5px; padding:4px 8px; font-size:12px; cursor:pointer;">Tx</button>
      </div>

      <!-- Text Color & Highlight Pickers -->
      <div data-ribbon-section="home" style="display:flex; align-items:center; gap:6px;">
        <label style="display:flex; align-items:center; gap:4px; font-size:11px; color:var(--toolbar-text, #0f172a); cursor:pointer;" title="Text Color (foreColor)">
          <span>A</span>
          <input type="color" id="nbForeColor_${targetContainerId}" value="#0f172a" onchange="applyNotebookColor('foreColor', this.value, ${targetArg})" style="width:20px; height:20px; border:none; background:transparent; cursor:pointer; padding:0;">
        </label>
        <label style="display:flex; align-items:center; gap:4px; font-size:11px; color:var(--toolbar-text, #0f172a); cursor:pointer;" title="Text Highlight (hiliteColor)">
          <span>Highlight</span>
          <input type="color" id="nbHiliteColor_${targetContainerId}" value="#fef08a" onchange="applyNotebookColor('hiliteColor', this.value, ${targetArg})" style="width:20px; height:20px; border:none; background:transparent; cursor:pointer; padding:0;">
        </label>
      </div>

      <!-- Bullets & Numbering + Alignment: Left, Center, Right, Justify -->
      <div data-ribbon-section="home layout" style="display:flex; align-items:center; gap:4px;">
        <button type="button" onclick="applyNotebookCommand('insertUnorderedList', ${targetArg})" title="Bullet List" style="background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:5px; padding:4px 7px; font-size:11px; cursor:pointer;">• List</button>
        <button type="button" onclick="applyNotebookCommand('insertOrderedList', ${targetArg})" title="Numbered List" style="background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:5px; padding:4px 7px; font-size:11px; cursor:pointer;">1. List</button>

        <button type="button" onclick="applyNotebookCommand('justifyLeft', ${targetArg})" title="Align Left" style="background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:5px; padding:4px 7px; font-size:11px; cursor:pointer;">Left</button>
        <button type="button" onclick="applyNotebookCommand('justifyCenter', ${targetArg})" title="Align Center" style="background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:5px; padding:4px 7px; font-size:11px; cursor:pointer;">Center</button>
        <button type="button" onclick="applyNotebookCommand('justifyRight', ${targetArg})" title="Align Right" style="background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:5px; padding:4px 7px; font-size:11px; cursor:pointer;">Right</button>
        <button type="button" onclick="applyNotebookCommand('justifyFull', ${targetArg})" title="Justify" style="background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:5px; padding:4px 7px; font-size:11px; cursor:pointer;">Justify</button>
      </div>

      <!-- Insert HTML Table (Insert Tab) -->
      <div data-ribbon-section="insert" style="display:flex; align-items:center; gap:4px;">
        <label style="font-size:11px; font-weight:700; color:var(--toolbar-text, #0f172a); margin:0;">Table:</label>
        <select class="nb-tb-select" style="background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:6px; padding:4px 6px; font-size:12px; cursor:pointer;" onchange="if(this.value){ insertEmbeddedTable(this.value, ${targetArg}); this.value=''; }">
          <option value="" disabled selected>+ Insert Table</option>
          <option value="2x2">2 × 2 Table</option>
          <option value="3x3">3 × 3 Table</option>
          <option value="4x4">4 × 4 Table</option>
        </select>
      </div>

      <!-- Insert Shape / Flowchart Elements & Connectors/Lines -->
      <div data-ribbon-section="insert draw" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
        <select id="nbFlowchartShapeSelect_${targetContainerId}" class="nb-tb-select" style="background:var(--toolbar-surface, #ffffff); color:var(--primary, #2563eb); font-weight:700; border:1px solid var(--toolbar-border, #cbd5e1); border-radius:6px; padding:4px 6px; font-size:12px; cursor:pointer;" onchange="if(this.value){ insertEmbeddedNotebookShape(this.value, ${targetArg}, '${targetContainerId}'); this.value=''; }">
          <option value="" disabled selected>+ Insert Shape / Flowchart Elements</option>
          <optgroup label="Shapes">
            <option value="rectangle">Rectangle</option>
            <option value="circle">Circle</option>
            <option value="diamond">Diamond (Decision)</option>
            <option value="oval">Oval (Terminal)</option>
            <option value="callout">Callout Box</option>
          </optgroup>
          <optgroup label="Connectors &amp; Lines">
            <option value="straight_line">Straight Line</option>
            <option value="dashed_line">Broken/Dashed Line</option>
            <option value="arrow_line">Arrow Line</option>
            <option value="dashed_arrow_line">Dashed Arrow Line</option>
          </optgroup>
        </select>

        <label style="font-size:11px; font-weight:700; color:var(--toolbar-text, #0f172a); margin:0;">Stroke:</label>
        <select id="nbEmbedStrokeWidth_${targetContainerId}" class="nb-tb-select" style="background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:6px; padding:4px 6px; font-size:12px; cursor:pointer;" title="Line Stroke Thickness">
          <option value="1">1px</option>
          <option value="2" selected>2px</option>
          <option value="4">4px</option>
          <option value="6">6px</option>
        </select>

        <label style="display:flex; align-items:center; gap:4px; font-size:11px; color:var(--toolbar-text, #0f172a); cursor:pointer;" title="Shape Fill Color">
          <span>Fill</span>
          <input type="color" id="nbEmbedFillColor_${targetContainerId}" value="#dbeafe" style="width:20px; height:20px; border:none; background:transparent; cursor:pointer; padding:0;">
        </label>

        <label style="display:flex; align-items:center; gap:4px; font-size:11px; color:var(--toolbar-text, #0f172a); cursor:pointer;" title="Shape / Line Stroke Color">
          <span>Stroke</span>
          <input type="color" id="nbEmbedStrokeColor_${targetContainerId}" value="#2563eb" style="width:20px; height:20px; border:none; background:transparent; cursor:pointer; padding:0;">
        </label>
      </div>

      <!-- Line Height / Spacing Dropdown -->
      <div data-ribbon-section="layout" style="display:flex; align-items:center; gap:4px;">
        <label style="font-size:11px; font-weight:700; color:var(--toolbar-text, #0f172a); margin:0;">Spacing:</label>
        <select id="nbLineHeight_${targetContainerId}" class="nb-tb-select" style="background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:6px; padding:4px 6px; font-size:12px; cursor:pointer;" onchange="applyNotebookLineHeight(this.value, ${targetArg})">
          <option value="1.0">1.0</option>
          <option value="1.15">1.15</option>
          <option value="1.5" selected>1.5</option>
          <option value="2.0">2.0</option>
        </select>
      </div>
      ${renderEmbeddedExtraRibbonSections(targetArg, targetContainerId)}
    </div>
  `;

  // Initialize strict tab isolation to 'home' tab
  const initialActiveBtn = container.querySelector('.nb-ribbon-btn[data-ribbon="home"]') || container.querySelector('.nb-ribbon-btn');
  if (initialActiveBtn) {
    switchEmbeddedRibbonTab(initialActiveBtn, 'home');
  }
}

/**
 * Additional MS Word-style groups for the embedded editor (Personal Space + shared embeds),
 * so it mirrors the full-page notebook toolbar: Heading styles, Pages, Picture, Text Box, WordArt,
 * Equations, Symbols, Table styles, TOC, Page Setup, Indent / Spacing and Arrange.
 */
function renderEmbeddedExtraRibbonSections(targetArg, toolbarId) {
  const sel = 'background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:6px; padding:4px 6px; font-size:12px; cursor:pointer;';
  const btn = 'background:var(--toolbar-surface, #ffffff); color:var(--toolbar-text, #0f172a); border:1px solid var(--toolbar-border, #cbd5e1); border-radius:5px; padding:4px 8px; font-size:11px; cursor:pointer;';
  const lbl = 'font-size:11px; font-weight:700; color:var(--toolbar-text, #0f172a); margin:0;';
  const num = 'width:54px; ' + sel;
  const secStyle = 'display:flex; align-items:center; gap:4px; flex-wrap:wrap;';
  const opts = (arr) => arr.map(([v, t]) => '<option value="' + v + '">' + t + '</option>').join('');
  const picker = (id, title, fn) => '<select style="' + sel + '" title="' + title + '" onchange="if(this.value){' + fn + '(this.value, ' + targetArg + '); this.value=\'\';}"><option value="" disabled selected>' + title + '</option>';
  return `
    <div data-ribbon-section="home" style="${secStyle}">
      <label style="${lbl}">Style:</label>
      <select style="${sel}" onchange="applyEmbeddedHeadingStyle(this.value, ${targetArg})">
        ${opts([['p', 'Normal'], ['h1', 'Heading 1'], ['h2', 'Heading 2'], ['h3', 'Heading 3'], ['title', 'Title']])}
      </select>
    </div>
    <div data-ribbon-section="insert" style="${secStyle}">
      <label style="${lbl}">Pages:</label>
      <button type="button" style="${btn}" onclick="embeddedInsertCoverPage(${targetArg})">Cover Page</button>
      <button type="button" style="${btn}" onclick="embeddedInsertPageBreak(${targetArg})">Blank Page</button>
      <button type="button" style="${btn}" onclick="embeddedInsertPageBreak(${targetArg})">Page Break</button>
      <input type="file" id="nbEmbedPic_${toolbarId}" accept="image/png,image/jpeg,image/gif,image/webp" style="display:none;" onchange="embeddedInsertPicture(event, ${targetArg})">
      <button type="button" style="${btn}" onclick="document.getElementById('nbEmbedPic_${toolbarId}').click()">Picture</button>
      <button type="button" style="${btn}" onclick="embeddedInsertTextBox(${targetArg})">+ Text Box</button>
    </div>
    <div data-ribbon-section="insert" style="${secStyle}">
      <select style="${sel}" title="Table Style" onchange="if(this.value){applyEmbeddedTablePreset(this.value, ${targetArg}); this.value='';}">
        <option value="" disabled selected>Table Style</option>
        ${opts([['default-grid', 'Default Grid'], ['striped', 'Striped Rows'], ['header-accent', 'Header Accent'], ['borderless', 'Borderless']])}
      </select>
      <select style="${sel}" title="WordArt" onchange="if(this.value){embeddedInsertWordArt(this.value, ${targetArg}); this.value='';}">
        <option value="" disabled selected>+ WordArt</option>
        ${opts([['gradient', 'Gradient Modern'], ['neon', 'Neon Blue Glow'], ['3d', '3D Emboss'], ['gold', 'Metallic Gold']])}
      </select>
      <select style="${sel}" title="Equation" onchange="if(this.value){embeddedInsertText(this.value, ${targetArg}); this.value='';}">
        <option value="" disabled selected>+ Equation</option>
        ${opts([['E = mc²', 'E = mc²'], ['a² + b² = c²', 'a² + b² = c²'], ['x = (-b ± √(b² - 4ac)) / (2a)', 'Quadratic Formula'], ['A = πr²', 'Area of Circle']])}
      </select>
      <select style="${sel}" title="Symbol" onchange="if(this.value){embeddedInsertText(this.value, ${targetArg}); this.value='';}">
        <option value="" disabled selected>+ Symbol</option>
        ${opts([['©', '© Copyright'], ['®', '® Registered'], ['™', '™ Trademark'], ['°', '° Degree'], ['±', '± Plus/Minus'], ['≠', '≠'], ['≤', '≤'], ['≥', '≥'], ['→', '→'], ['★', '★'], ['✓', '✓'], ['π', 'π'], ['∞', '∞']])}
      </select>
    </div>
    <div data-ribbon-section="layout" style="${secStyle}">
      <label style="${lbl}">Contents:</label>
      <button type="button" style="${btn}" onclick="embeddedInsertTOC(${targetArg})">Insert TOC</button>
      <select style="${sel}" title="Add Text" onchange="if(this.value){embeddedMarkTocLevel(this.value, ${targetArg}); this.value='';}">
        <option value="" disabled selected>Add Text</option>
        ${opts([['1', 'Level 1'], ['2', 'Level 2'], ['3', 'Level 3'], ['0', 'Do Not Show']])}
      </select>
      <button type="button" style="${btn}" onclick="embeddedUpdateTOC(${targetArg})">Update Table</button>
    </div>
    <div data-ribbon-section="layout" style="${secStyle}">
      <label style="${lbl}">Margins:</label>
      <select style="${sel}" onchange="applyEmbeddedPageSetup('margins', this.value, ${targetArg})">${opts([['normal', 'Normal'], ['narrow', 'Narrow'], ['wide', 'Wide']])}</select>
      <label style="${lbl}">Orientation:</label>
      <select style="${sel}" onchange="applyEmbeddedPageSetup('orientation', this.value, ${targetArg})">${opts([['portrait', 'Portrait'], ['landscape', 'Landscape']])}</select>
      <label style="${lbl}">Size:</label>
      <select style="${sel}" onchange="applyEmbeddedPageSetup('size', this.value, ${targetArg})">${opts([['letter', 'Letter'], ['a4', 'A4'], ['legal', 'Legal']])}</select>
      <label style="${lbl}">Columns:</label>
      <select style="${sel}" onchange="applyEmbeddedPageSetup('columns', this.value, ${targetArg})">${opts([['1', '1'], ['2', '2'], ['3', '3']])}</select>
    </div>
    <div data-ribbon-section="layout" style="${secStyle}">
      <label style="${lbl}">Indent L/R:</label>
      <input type="number" min="0" max="200" value="0" style="${num}" onchange="applyEmbeddedBlockStyle('marginLeft', this.value + 'px', ${targetArg})">
      <input type="number" min="0" max="200" value="0" style="${num}" onchange="applyEmbeddedBlockStyle('marginRight', this.value + 'px', ${targetArg})">
      <label style="${lbl}">Before/After:</label>
      <input type="number" min="0" max="72" value="0" style="${num}" onchange="applyEmbeddedBlockStyle('marginTop', this.value + 'pt', ${targetArg})">
      <input type="number" min="0" max="72" value="8" style="${num}" onchange="applyEmbeddedBlockStyle('marginBottom', this.value + 'pt', ${targetArg})"><span style="${lbl}">pt</span>
    </div>
    <div data-ribbon-section="layout" style="${secStyle}">
      <label style="${lbl}">Arrange:</label>
      <button type="button" style="${btn}" onclick="arrangeEmbeddedShape('forward', ${targetArg})">Bring Forward</button>
      <button type="button" style="${btn}" onclick="arrangeEmbeddedShape('backward', ${targetArg})">Send Backward</button>
      <button type="button" style="${btn}" onclick="arrangeEmbeddedShape('rotate', ${targetArg})">Rotate 90°</button>
      <button type="button" style="${btn}" onclick="arrangeEmbeddedShape('align', ${targetArg})">Align Center</button>
    </div>
  `;
}

function embeddedFinish(editor) {
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

function embeddedInsertHtml(html, editorTargetId = null) {
  const editor = resolveNotebookEditorElement(editorTargetId);
  if (!editor) return;
  editor.focus();
  document.execCommand('insertHTML', false, html);
  embeddedFinish(editor);
}

function embeddedInsertText(text, editorTargetId = null) {
  const editor = resolveNotebookEditorElement(editorTargetId);
  if (!editor) return;
  editor.focus();
  document.execCommand('insertText', false, text);
  embeddedFinish(editor);
}

function embeddedInsertPageBreak(editorTargetId = null) {
  embeddedInsertHtml('<div class="nb-page-break" contenteditable="false" style="page-break-after:always;border-top:2px dashed #94a3b8;margin:18px 0;"></div><p><br></p>', editorTargetId);
}

function embeddedInsertCoverPage(editorTargetId = null) {
  embeddedInsertHtml('<div class="nb-cover-page" style="text-align:center;padding:96px 24px;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:24px;"><h1 style="font-size:40px;margin:0 0 12px;">Document Title</h1><h3 style="font-weight:400;color:#64748b;">Subtitle</h3><p>Author &middot; ' + new Date().toLocaleDateString() + '</p></div><p><br></p>', editorTargetId);
}

function embeddedInsertPicture(event, editorTargetId = null) {
  const file = event.target.files && event.target.files[0];
  event.target.value = '';
  if (!file || !/^image\//.test(file.type)) return;
  const reader = new FileReader();
  reader.onload = () => embeddedInsertHtml('<img src="' + reader.result + '" alt="" style="max-width:100%;height:auto;"><p><br></p>', editorTargetId);
  reader.readAsDataURL(file);
}

function embeddedInsertTextBox(editorTargetId = null) {
  embeddedInsertHtml('<div class="nb-textbox" data-shape-type="textbox" contenteditable="true" style="display:inline-block;min-width:160px;min-height:60px;padding:10px;border:1px solid #2563eb;background:#eff6ff;border-radius:4px;">Text box</div>&nbsp;', editorTargetId);
}

function embeddedInsertWordArt(style, editorTargetId = null) {
  const styles = {
    gradient: 'background:linear-gradient(90deg,#2563eb,#9333ea);-webkit-background-clip:text;background-clip:text;color:transparent;',
    neon: 'color:#38bdf8;text-shadow:0 0 8px #38bdf8,0 0 18px #2563eb;',
    '3d': 'color:#e2e8f0;text-shadow:1px 1px 0 #94a3b8,2px 2px 0 #64748b,3px 3px 0 #475569;',
    gold: 'background:linear-gradient(180deg,#fde68a,#d4af37);-webkit-background-clip:text;background-clip:text;color:transparent;'
  };
  embeddedInsertHtml('<span class="nb-wordart" style="font-size:36px;font-weight:800;' + (styles[style] || '') + '">WordArt</span>&nbsp;', editorTargetId);
}

function applyEmbeddedHeadingStyle(val, editorTargetId = null) {
  const editor = resolveNotebookEditorElement(editorTargetId);
  if (!editor) return;
  editor.focus();
  if (val === 'title') {
    document.execCommand('formatBlock', false, 'h1');
    const sel = window.getSelection();
    const node = sel && sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
    const h = node && node.closest('h1');
    if (h) { h.style.fontSize = '40px'; h.style.textAlign = 'center'; }
  } else {
    document.execCommand('formatBlock', false, val);
  }
  embeddedFinish(editor);
}

function applyEmbeddedTablePreset(preset, editorTargetId = null) {
  const editor = resolveNotebookEditorElement(editorTargetId);
  if (!editor) return;
  const sel = window.getSelection();
  let node = sel && sel.anchorNode ? (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement) : null;
  let table = node && node.closest ? node.closest('table') : null;
  if (!table) table = editor.querySelector('table:last-of-type');
  if (!table) return;
  table.classList.remove('table-preset-default-grid', 'table-preset-striped', 'table-preset-header-accent', 'table-preset-borderless');
  table.classList.add('table-preset-' + preset);
  embeddedFinish(editor);
}

function embeddedSelectedBlocks(editor) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return [];
  const range = sel.getRangeAt(0);
  const blocks = Array.from(editor.querySelectorAll('p,div:not(.nb-toc):not(.nb-page-break),h1,h2,h3,h4,li')).filter(b => range.intersectsNode(b));
  if (blocks.length) return blocks;
  let n = sel.anchorNode;
  while (n && n !== editor && !(n.nodeType === 1 && /^(P|DIV|H[1-6]|LI)$/.test(n.nodeName))) n = n.parentNode;
  return n && n !== editor ? [n] : [];
}

function applyEmbeddedBlockStyle(prop, value, editorTargetId = null) {
  const editor = resolveNotebookEditorElement(editorTargetId);
  if (!editor) return;
  embeddedSelectedBlocks(editor).forEach(b => { b.style[prop] = value; });
  embeddedFinish(editor);
}

function applyEmbeddedPageSetup(kind, value, editorTargetId = null) {
  const editor = resolveNotebookEditorElement(editorTargetId);
  if (!editor) return;
  if (kind === 'margins') editor.style.padding = { normal: '40px', narrow: '18px', wide: '64px' }[value] || '40px';
  if (kind === 'orientation') editor.classList.toggle('orientation-landscape', value === 'landscape');
  if (kind === 'size') editor.style.maxWidth = { letter: '816px', a4: '794px', legal: '816px' }[value] || '816px';
  if (kind === 'columns') {
    editor.classList.remove('columns-2', 'columns-3');
    if (value === '2' || value === '3') editor.classList.add('columns-' + value);
  }
  embeddedFinish(editor);
}

function embeddedBuildToc(editor) {
  const esc = t => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const items = [];
  editor.querySelectorAll('h1,h2,h3,[data-toc-level]').forEach(el => {
    if (el.closest('.nb-toc')) return;
    const lvl = Math.min(3, Math.max(1, Number(el.getAttribute('data-toc-level') || el.nodeName.replace('H', ''))));
    const text = (el.textContent || '').trim();
    if (text) items.push({ lvl, text });
  });
  return '<h3 style="margin:0 0 8px;">Table of Contents</h3>' + (items.length
    ? items.map(i => '<div style="margin-left:' + (i.lvl - 1) * 18 + 'px;">' + esc(i.text) + '</div>').join('')
    : '<div style="color:#94a3b8;">No headings found.</div>');
}

function embeddedInsertTOC(editorTargetId = null) {
  const editor = resolveNotebookEditorElement(editorTargetId);
  if (!editor) return;
  embeddedInsertHtml('<div class="nb-toc" contenteditable="false" style="border:1px solid #cbd5e1;border-radius:8px;padding:14px 18px;margin:12px 0;">' + embeddedBuildToc(editor) + '</div><p><br></p>', editorTargetId);
}

function embeddedUpdateTOC(editorTargetId = null) {
  const editor = resolveNotebookEditorElement(editorTargetId);
  if (!editor) return;
  editor.querySelectorAll('.nb-toc').forEach(t => { t.innerHTML = embeddedBuildToc(editor); });
  embeddedFinish(editor);
}

function embeddedMarkTocLevel(level, editorTargetId = null) {
  const editor = resolveNotebookEditorElement(editorTargetId);
  if (!editor) return;
  embeddedSelectedBlocks(editor).slice(0, 1).forEach(b => {
    if (level === '0') b.removeAttribute('data-toc-level'); else b.setAttribute('data-toc-level', level);
  });
  embeddedFinish(editor);
}

function arrangeEmbeddedShape(action, editorTargetId = null) {
  const editor = resolveNotebookEditorElement(editorTargetId);
  if (!editor) return;
  const sel = window.getSelection();
  const node = sel && sel.anchorNode ? (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement) : null;
  const shape = node && node.closest ? node.closest('[data-shape-type]') : null;
  if (!shape || !editor.contains(shape)) return;
  if (action === 'forward' || action === 'backward') {
    shape.style.position = shape.style.position || 'relative';
    const z = Number(shape.style.zIndex || 1) + (action === 'forward' ? 1 : -1);
    shape.style.zIndex = String(Math.max(0, z));
  } else if (action === 'rotate') {
    const m = /rotate\((-?\d+)deg\)/.exec(shape.style.transform || '');
    shape.style.transform = 'rotate(' + (((m ? Number(m[1]) : 0) + 90) % 360) + 'deg)';
  } else if (action === 'align') {
    shape.style.display = 'block';
    shape.style.marginLeft = 'auto';
    shape.style.marginRight = 'auto';
  }
  embeddedFinish(editor);
}

function switchEmbeddedRibbonTab(btnEl, tabName) {
  const toolbar = btnEl ? btnEl.closest('.notebook-toolbar') : null;
  if (!toolbar) return;
  const activeTab = (tabName || 'home').toLowerCase();
  toolbar.querySelectorAll('.nb-ribbon-btn').forEach(b => {
    const isActive = b.getAttribute('data-ribbon') === activeTab;
    b.classList.toggle('active', isActive);
    b.style.background = isActive ? '#2563eb' : 'transparent';
    b.style.color = isActive ? '#ffffff' : 'var(--toolbar-text, #0f172a)';
    b.style.borderColor = isActive ? '#38bdf8' : 'transparent';
  });
  toolbar.querySelectorAll('[data-ribbon-section]').forEach(sec => {
    const sections = (sec.getAttribute('data-ribbon-section') || '').split(/\s+/);
    sec.style.display = sections.includes(activeTab) ? 'flex' : 'none';
  });
}

function resolveNotebookEditorElement(editorTargetId = null) {
  if (editorTargetId && document.getElementById(editorTargetId)) {
    return document.getElementById(editorTargetId);
  }
  return document.getElementById('pageContent') || document.getElementById('noteContent') || document.getElementById('personalNotebookCanvas');
}

function insertEmbeddedNotebookShape(type, editorTargetId = null, toolbarId = 'notebookToolbarContainer') {
  const editorEl = resolveNotebookEditorElement(editorTargetId);
  if (!editorEl) return;

  const sw = Number(document.getElementById(`nbEmbedStrokeWidth_${toolbarId}`)?.value || 2);
  const fill = document.getElementById(`nbEmbedFillColor_${toolbarId}`)?.value || '#dbeafe';
  const stroke = document.getElementById(`nbEmbedStrokeColor_${toolbarId}`)?.value || '#2563eb';
  const uid = 'emb_shape_' + Date.now();

  let htmlSnippet = '';
  if (type === 'rectangle') {
    htmlSnippet = `<div contenteditable="true" data-shape-type="rectangle" style="display:inline-flex; align-items:center; justify-content:center; min-width:140px; min-height:64px; padding:10px 16px; margin:8px 6px; border:${sw}px solid ${stroke}; background:${fill}; border-radius:6px; color:${stroke}; font-weight:600; text-align:center; vertical-align:middle;">Process</div>`;
  } else if (type === 'circle') {
    htmlSnippet = `<div contenteditable="true" data-shape-type="circle" style="display:inline-flex; align-items:center; justify-content:center; width:96px; height:96px; padding:10px; margin:8px 6px; border:${sw}px solid ${stroke}; background:${fill}; border-radius:50%; color:${stroke}; font-weight:600; text-align:center; vertical-align:middle;">Node</div>`;
  } else if (type === 'diamond') {
    htmlSnippet = `<div contenteditable="true" data-shape-type="diamond" style="display:inline-flex; align-items:center; justify-content:center; width:140px; height:96px; margin:8px 6px; position:relative; color:${stroke}; font-weight:600; text-align:center; vertical-align:middle;"><svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute; inset:0; pointer-events:none;"><polygon points="50,3 97,50 50,97 3,50" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/></svg><span style="position:relative; z-index:1; padding:4px;">Decision?</span></div>`;
  } else if (type === 'oval') {
    htmlSnippet = `<div contenteditable="true" data-shape-type="oval" style="display:inline-flex; align-items:center; justify-content:center; min-width:140px; height:60px; padding:8px 20px; margin:8px 6px; border:${sw}px solid ${stroke}; background:${fill}; border-radius:999px; color:${stroke}; font-weight:600; text-align:center; vertical-align:middle;">Start / End</div>`;
  } else if (type === 'callout') {
    htmlSnippet = `<div contenteditable="true" data-shape-type="callout" style="display:inline-flex; align-items:center; justify-content:center; min-width:150px; min-height:64px; padding:10px 14px; margin:8px 6px; border:${sw}px solid ${stroke}; background:${fill}; border-radius:8px; color:${stroke}; font-weight:600; text-align:center; vertical-align:middle;">Callout Box</div>`;
  } else if (type === 'straight_line') {
    htmlSnippet = `<div contenteditable="false" data-shape-type="straight_line" style="display:block; width:200px; height:28px; margin:6px 0;"><svg width="100%" height="28" viewBox="0 0 200 28"><line x1="4" y1="14" x2="196" y2="14" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/></svg></div>`;
  } else if (type === 'dashed_line') {
    htmlSnippet = `<div contenteditable="false" data-shape-type="dashed_line" style="display:block; width:200px; height:28px; margin:6px 0;"><svg width="100%" height="28" viewBox="0 0 200 28"><line x1="4" y1="14" x2="196" y2="14" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="8,6" stroke-linecap="round"/></svg></div>`;
  } else if (type === 'arrow_line') {
    htmlSnippet = `<div contenteditable="false" data-shape-type="arrow_line" style="display:block; width:200px; height:28px; margin:6px 0;"><svg width="100%" height="28" viewBox="0 0 200 28"><defs><marker id="m_${uid}" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="${stroke}"/></marker></defs><line x1="4" y1="14" x2="186" y2="14" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" marker-end="url(#m_${uid})"/></svg></div>`;
  } else if (type === 'dashed_arrow_line') {
    htmlSnippet = `<div contenteditable="false" data-shape-type="dashed_arrow_line" style="display:block; width:200px; height:28px; margin:6px 0;"><svg width="100%" height="28" viewBox="0 0 200 28"><defs><marker id="dm_${uid}" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="${stroke}"/></marker></defs><line x1="4" y1="14" x2="186" y2="14" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="8,6" stroke-linecap="round" marker-end="url(#dm_${uid})"/></svg></div>`;
  }

  if (editorEl.isContentEditable) {
    editorEl.focus();
    document.execCommand('insertHTML', false, htmlSnippet + '<p><br></p>');
  } else if ('value' in editorEl) {
    editorEl.value += `\n[${type.toUpperCase()}]\n`;
  }
}

function applyNotebookFont(fontFamily, editorTargetId = null) {
  const editorEl = resolveNotebookEditorElement(editorTargetId);
  if (editorEl) editorEl.style.fontFamily = fontFamily;
}

function applyNotebookFontSizePx(sizePx, editorTargetId = null) {
  const editorEl = resolveNotebookEditorElement(editorTargetId);
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

function insertEmbeddedTable(sizeStr, editorTargetId = null) {
  const editorEl = resolveNotebookEditorElement(editorTargetId);
  if (!editorEl) return;

  const parts = sizeStr.split('x');
  const cols = parseInt(parts[0], 10) || 2;
  const rows = parseInt(parts[1], 10) || 2;

  let tableHtml = '<table style="border-collapse:collapse; width:100%; margin:12px 0;" border="1"><thead><tr>';
  for (let c = 1; c <= cols; c++) {
    tableHtml += `<th contenteditable="true" style="padding:6px 10px; border:1px solid #cbd5e1; background:rgba(15,23,42,0.06);">Header ${c}</th>`;
  }
  tableHtml += '</tr></thead><tbody>';
  for (let r = 1; r <= rows; r++) {
    tableHtml += '<tr>';
    for (let c = 1; c <= cols; c++) {
      tableHtml += `<td contenteditable="true" style="padding:6px 10px; border:1px solid #cbd5e1;">Data ${r},${c}</td>`;
    }
    tableHtml += '</tr>';
  }
  tableHtml += '</tbody></table><p><br></p>';

  if (editorEl.isContentEditable) {
    editorEl.focus();
    document.execCommand('insertHTML', false, tableHtml);
  }
}

function applyNotebookCommand(cmd, editorTargetId = null) {
  const editorEl = resolveNotebookEditorElement(editorTargetId);
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

function applyNotebookColor(cmd, colorVal, editorTargetId = null) {
  const editorEl = resolveNotebookEditorElement(editorTargetId);
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

function applyNotebookLineHeight(lineHeight, editorTargetId = null) {
  const editorEl = resolveNotebookEditorElement(editorTargetId);
  if (editorEl) editorEl.style.lineHeight = lineHeight;
}

function applyNotebookParaMargin(margin) {
  const editorEl = document.getElementById('pageContent') || document.getElementById('noteContent');
  if (editorEl) editorEl.style.marginBottom = margin;
}

function embeddedExportEditor(format, editorTargetId = null) {
  const editor = resolveNotebookEditorElement(editorTargetId);
  const rawContent = editor ? (editor.innerHTML || editor.value || '') : '';
  const titleEl = document.getElementById('personalNoteTitle') || document.getElementById('pageTitle') || document.getElementById('noteTitle');
  const title = (titleEl && titleEl.value && titleEl.value.trim()) ? titleEl.value.trim() : extractAutoTitleClient(rawContent);
  exportNotebook(format, 0, title, rawContent);
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

// Auto-initialize toolbar when DOM is ready (only if dedicated toolbar container or pageContent exists)
// (Note: modal save is handled by handleCreateNote in dashboard.js)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('notebookToolbarContainer') || document.getElementById('pageContent')) {
      renderNotebookRichTextToolbar();
    }
  });
} else {
  if (document.getElementById('notebookToolbarContainer') || document.getElementById('pageContent')) {
    renderNotebookRichTextToolbar();
  }
}
