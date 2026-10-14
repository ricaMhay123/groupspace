/**
 * GroupSpace — Collaborative Rich Text Editor
 * notebook-editor.js
 *
 * Stack:
 *  - QuillJS      (rich text editing engine)
 *  - Yjs          (CRDT-based shared document state)
 *  - y-quill      (Quill ↔ Yjs binding)
 *  - y-websocket  (WebSocket provider for Yjs sync)
 *
 * CDN requirements (add to HTML before this script):
 *   <script src="https://cdn.quilljs.com/1.3.7/quill.min.js"></script>
 *   <link   rel="stylesheet" href="https://cdn.quilljs.com/1.3.7/quill.snow.css">
 *   <script src="https://cdn.jsdelivr.net/npm/yjs/dist/yjs.js"></script>
 *   <script src="https://cdn.jsdelivr.net/npm/y-quill/dist/y-quill.js"></script>
 *   <script src="https://cdn.jsdelivr.net/npm/y-websocket/dist/y-websocket.js"></script>
 */

'use strict';

/* ─── Colour palette for remote cursors ─────────────────────────────────────── */
const CURSOR_COLORS = [
  '#e53935', '#8e24aa', '#1e88e5', '#00897b',
  '#f4511e', '#039be5', '#7cb342', '#fb8c00',
];

function hashColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return CURSOR_COLORS[Math.abs(h) % CURSOR_COLORS.length];
}

/* ─── Formatting helpers ─────────────────────────────────────────────────────── */
function buildAvatarInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
}

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000)  return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

/* ─── NotebookEditorComponent ────────────────────────────────────────────────── */

/**
 * Self-contained Collaborative Notebook editor component.
 *
 * Usage:
 *   const editor = new NotebookEditorComponent(containerEl, {
 *     notebookId : 42,
 *     groupId    : 7,
 *     pageId     : null,           // null → "select a page" state
 *     userRole   : 'editor',       // 'viewer' | 'editor' | 'admin'
 *     currentUser: { id, full_name, avatar_initials },
 *     wsUrl      : 'wss://your-yjs-server.example.com',
 *     members    : [{ user_id, full_name, role }],
 *     onSave     : async (pageId, { title, content }) => { ... },
 *   });
 *
 *   editor.loadPage(pageId);  // switch active page
 *   editor.destroy();         // clean up Yjs + WebSocket
 */
class NotebookEditorComponent {
  /**
   * @param {HTMLElement} container - DOM element to mount into
   * @param {object}      opts      - configuration options (see above)
   */
  constructor(container, opts = {}) {
    this._container  = container;
    this._opts       = Object.assign({
      notebookId:  null,
      pageId:      null,
      userRole:    'viewer',
      currentUser: { id: 0, full_name: 'Anonymous', avatar_initials: 'A' },
      wsUrl:       null,
      members:     [],
      onSave:      null,
    }, opts);

    this._isReadOnly  = this._opts.userRole === 'viewer';
    this._quill       = null;
    this._ydoc        = null;
    this._provider    = null;
    this._binding     = null;
    this._saveTimer   = null;
    this._activePageId = null;
    this._awareness   = null;
    this._connStatus  = 'disconnected'; // 'connecting' | 'connected' | 'error'

    this._render();
  }

  /* ── Public API ──────────────────────────────────────────────────────────── */

  /**
   * Load (or switch to) a page by ID.
   * Tears down the previous Yjs connection and starts a new one.
   * @param {number|null} pageId
   * @param {object} [pageMeta] - { title, content, updatedAt }
   */
  loadPage(pageId, pageMeta = {}) {
    this._activePageId = pageId;
    this._destroyYjs();

    if (!pageId) {
      this._showEmptyCanvas();
      return;
    }

    if (pageMeta.title !== undefined) {
      this._els.titleInput.value = pageMeta.title || '';
    }

    this._initQuill();
    this._initYjs(pageId);

    // Pre-fill static content when Yjs doc is fresh (first editor, no ws sync yet)
    if (pageMeta.content && this._quill) {
      setTimeout(() => {
        const isEmpty = this._quill.getText().trim() === '';
        if (isEmpty && pageMeta.content) {
          this._quill.clipboard.dangerouslyPasteHTML(pageMeta.content);
          this._quill.history.clear();
        }
      }, 300);
    }
  }

  /** Tear everything down. Call before removing the component from DOM. */
  destroy() {
    this._destroyYjs();
    clearTimeout(this._saveTimer);
    this._container.innerHTML = '';
  }

  /* ── Rendering ───────────────────────────────────────────────────────────── */

  _render() {
    this._container.innerHTML = '';
    this._container.className = 'nb-editor-shell';

    this._els = {};

    /* Header */
    const header = this._createHeader();
    this._container.appendChild(header);

    /* Read-only banner (viewer only) */
    if (this._isReadOnly) {
      const banner = this._createReadOnlyBanner();
      this._container.appendChild(banner);
    }

    /* Toolbar */
    const toolbar = this._createToolbar();
    this._container.appendChild(toolbar);
    if (this._isReadOnly) toolbar.classList.add('disabled');

    /* Collaboration status bar */
    const collabBar = this._createCollabBar();
    this._container.appendChild(collabBar);

    /* Editor canvas */
    const editorWrap = document.createElement('div');
    editorWrap.className = 'nb-editor-wrap';
    this._els.editorWrap = editorWrap;
    this._container.appendChild(editorWrap);

    /* Footer */
    const footer = this._createFooter();
    this._container.appendChild(footer);
  }

  _createHeader() {
    const header = document.createElement('div');
    header.className = 'nb-header';

    const titleInput = document.createElement('input');
    titleInput.type        = 'text';
    titleInput.className   = 'nb-title-input';
    titleInput.placeholder = 'Untitled Page';
    titleInput.disabled    = this._isReadOnly;
    titleInput.addEventListener('input', () => this._scheduleSave());
    this._els.titleInput = titleInput;

    const meta = document.createElement('div');
    meta.className = 'nb-header-meta';

    // Visibility badge
    const vis = this._opts.visibility || 'shared';
    const visEl = document.createElement('span');
    visEl.className = `nb-visibility-badge ${vis}`;
    visEl.textContent = vis === 'shared' ? '🌐 Shared' : '🔒 Private';
    this._els.visBadge = visEl;

    // Permissions button (admin only)
    if (this._opts.userRole === 'admin') {
      const permBtn = document.createElement('button');
      permBtn.className   = 'nb-tb-btn';
      permBtn.title       = 'Manage Permissions';
      permBtn.innerHTML   = '⚙️ Share';
      permBtn.addEventListener('click', () => this._openPermissionsModal());
      meta.appendChild(permBtn);
    }

    meta.appendChild(visEl);
    header.appendChild(titleInput);
    header.appendChild(meta);

    return header;
  }

  _createReadOnlyBanner() {
    const banner = document.createElement('div');
    banner.className = 'nb-readonly-banner';
    banner.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      <span>You have <strong>viewer</strong> access — this notebook is read-only.</span>
    `;
    return banner;
  }

  _createToolbar() {
    const bar = document.createElement('div');
    bar.className    = 'nb-toolbar';
    bar.id           = `nb-toolbar-${this._opts.notebookId}`;
    this._els.toolbar = bar;

    /* ── Font Family ── */
    const fontSel = document.createElement('select');
    fontSel.className = 'nb-tb-select';
    fontSel.title     = 'Font Family';
    [['Arial', 'Arial, sans-serif'], ['Calibri', 'Calibri, sans-serif'], ['Times New Roman', "'Times New Roman', serif"]]
      .forEach(([label, value]) => {
        const o = document.createElement('option');
        o.value = value; o.textContent = label;
        fontSel.appendChild(o);
      });
    fontSel.addEventListener('change', () => {
      const sel = this._quill?.getSelection();
      if (!sel) return;
      this._quill.format('font', fontSel.value, 'user');
    });
    this._els.fontSel = fontSel;

    /* ── Font Size ── */
    const sizeSel = document.createElement('select');
    sizeSel.className = 'nb-tb-select';
    sizeSel.title     = 'Font Size';
    [10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36].forEach(s => {
      const o = document.createElement('option');
      o.value = `${s}px`; o.textContent = s;
      if (s === 14) o.selected = true;
      sizeSel.appendChild(o);
    });
    sizeSel.addEventListener('change', () => {
      const sel = this._quill?.getSelection();
      if (!sel) return;
      this._quill.format('size', sizeSel.value, 'user');
    });

    bar.appendChild(fontSel);
    bar.appendChild(sizeSel);
    this._sep(bar);

    /* ── Inline Formatting ── */
    const fmtBtns = [
      { fmt: 'bold',        icon: '<strong>B</strong>',   title: 'Bold (Ctrl+B)' },
      { fmt: 'italic',      icon: '<em>I</em>',           title: 'Italic (Ctrl+I)' },
      { fmt: 'underline',   icon: '<u>U</u>',             title: 'Underline (Ctrl+U)' },
      { fmt: 'strike',      icon: '<s>S</s>',             title: 'Strikethrough' },
    ];
    fmtBtns.forEach(({ fmt, icon, title }) => {
      const btn = this._tbBtn(icon, title);
      btn.dataset.format = fmt;
      btn.addEventListener('click', () => {
        const cur = this._quill?.getFormat() || {};
        this._quill?.format(fmt, !cur[fmt], 'user');
        btn.classList.toggle('active', !cur[fmt]);
      });
      bar.appendChild(btn);
    });

    /* Text color */
    const colorBtn = this._tbBtn('🎨 Color', 'Text Color');
    colorBtn.classList.add('nb-tb-color');
    const colorInput = document.createElement('input');
    colorInput.type = 'color'; colorInput.value = '#000000';
    colorInput.addEventListener('input', () => {
      this._quill?.format('color', colorInput.value, 'user');
    });
    colorBtn.appendChild(colorInput);
    bar.appendChild(colorBtn);

    this._sep(bar);

    /* ── Heading ── */
    const headSel = document.createElement('select');
    headSel.className = 'nb-tb-select';
    headSel.title     = 'Heading';
    [['Normal', false], ['Heading 1', 1], ['Heading 2', 2], ['Heading 3', 3]].forEach(([label, val]) => {
      const o = document.createElement('option');
      o.value = val || ''; o.textContent = label;
      headSel.appendChild(o);
    });
    headSel.addEventListener('change', () => {
      this._quill?.format('header', headSel.value ? Number(headSel.value) : false, 'user');
    });
    bar.appendChild(headSel);

    /* ── Lists ── */
    const olBtn = this._tbBtn('≡ OL', 'Ordered List');
    olBtn.addEventListener('click', () => {
      const cur = this._quill?.getFormat() || {};
      this._quill?.format('list', cur.list === 'ordered' ? false : 'ordered', 'user');
    });
    const ulBtn = this._tbBtn('≡ UL', 'Bullet List');
    ulBtn.addEventListener('click', () => {
      const cur = this._quill?.getFormat() || {};
      this._quill?.format('list', cur.list === 'bullet' ? false : 'bullet', 'user');
    });
    bar.appendChild(olBtn);
    bar.appendChild(ulBtn);

    this._sep(bar);

    /* ── Spacing Group ── */
    const spaceLabel = document.createElement('span');
    spaceLabel.textContent = '↕';
    spaceLabel.title       = 'Line & Paragraph Spacing';
    spaceLabel.style.cssText = 'font-size:0.8rem;color:var(--muted-foreground);padding:0 4px;';
    bar.appendChild(spaceLabel);

    /* Line height */
    const lhSel = document.createElement('select');
    lhSel.className = 'nb-tb-select';
    lhSel.title     = 'Line Height';
    [['1.0×', '1'], ['1.15×', '1.15'], ['1.5×', '1.5'], ['2.0×', '2']].forEach(([label, val]) => {
      const o = document.createElement('option');
      o.value = val; o.textContent = label;
      if (val === '1.5') o.selected = true;
      lhSel.appendChild(o);
    });
    lhSel.addEventListener('change', () => {
      // Apply line-height via inline style on the editor content root
      if (this._quill) {
        this._quill.root.style.lineHeight = lhSel.value;
      }
    });
    this._els.lhSel = lhSel;
    bar.appendChild(lhSel);

    /* Paragraph spacing (margin-before / margin-after via CSS variable approach) */
    const paraSel = document.createElement('select');
    paraSel.className = 'nb-tb-select';
    paraSel.title     = 'Paragraph Spacing';
    [
      ['Compact',  '4px',  '4px'],
      ['Normal',   '8px',  '8px'],
      ['Relaxed',  '14px', '14px'],
      ['Spacious', '20px', '24px'],
    ].forEach(([label, before, after]) => {
      const o = document.createElement('option');
      o.value = JSON.stringify({ before, after });
      o.textContent = label;
      if (label === 'Normal') o.selected = true;
      paraSel.appendChild(o);
    });
    paraSel.addEventListener('change', () => {
      try {
        const { before, after } = JSON.parse(paraSel.value);
        if (this._quill) {
          const style = this._quill.root.style;
          style.setProperty('--nb-para-before', before);
          style.setProperty('--nb-para-after',  after);
          // Apply to all paragraph nodes
          this._quill.root.querySelectorAll('p, h1, h2, h3').forEach(el => {
            el.style.marginTop    = before;
            el.style.marginBottom = after;
          });
        }
      } catch (_) {}
    });
    bar.appendChild(paraSel);

    this._sep(bar);

    /* ── Block Formats ── */
    const blockquoteBtn = this._tbBtn('❝', 'Blockquote');
    blockquoteBtn.addEventListener('click', () => {
      const cur = this._quill?.getFormat() || {};
      this._quill?.format('blockquote', !cur.blockquote, 'user');
    });

    const codeBtn = this._tbBtn('{ }', 'Code Block');
    codeBtn.addEventListener('click', () => {
      const cur = this._quill?.getFormat() || {};
      this._quill?.format('code-block', !cur['code-block'], 'user');
    });

    const linkBtn = this._tbBtn('🔗', 'Insert Link');
    linkBtn.addEventListener('click', () => {
      const url = prompt('Enter URL:');
      if (url) this._quill?.format('link', url, 'user');
    });

    bar.appendChild(blockquoteBtn);
    bar.appendChild(codeBtn);
    bar.appendChild(linkBtn);

    this._sep(bar);

    /* ── History ── */
    const undoBtn = this._tbBtn('↩', 'Undo (Ctrl+Z)');
    undoBtn.addEventListener('click', () => this._quill?.history.undo());
    const redoBtn = this._tbBtn('↪', 'Redo (Ctrl+Y)');
    redoBtn.addEventListener('click', () => this._quill?.history.redo());
    bar.appendChild(undoBtn);
    bar.appendChild(redoBtn);

    this._sep(bar);

    /* ── Export Dropdown ── */
    const exportWrap = document.createElement('div');
    exportWrap.style.cssText = 'position:relative;display:inline-flex;align-items:center;';

    const exportBtn = this._tbBtn('⬇ Export', 'Export this page');
    exportBtn.id = `nb-export-btn-${this._opts.notebookId}`;
    exportBtn.style.cssText = 'gap:4px;font-size:0.75rem;padding:0 10px;';

    const exportMenu = document.createElement('div');
    exportMenu.className = 'nb-export-menu';
    exportMenu.style.cssText = [
      'display:none',
      'position:absolute',
      'top:calc(100% + 4px)',
      'right:0',
      'z-index:9999',
      'background:var(--card)',
      'border:1px solid var(--border)',
      'border-radius:8px',
      'box-shadow:0 8px 24px rgba(0,0,0,0.18)',
      'min-width:160px',
      'overflow:hidden',
      'padding:4px 0',
    ].join(';');

    const exportItems = [
      { format: 'txt',  icon: '📄', label: 'Plain Text (.txt)',  desc: 'Stripped text, instant download' },
      { format: 'pdf',  icon: '📑', label: 'PDF Document (.pdf)', desc: 'Rendered with typography' },
      { format: 'docx', icon: '📝', label: 'Word Document (.docx)', desc: 'Full formatting via server' },
    ];

    exportItems.forEach(({ format, icon, label, desc }) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.style.cssText = [
        'display:flex',
        'align-items:flex-start',
        'gap:10px',
        'width:100%',
        'padding:9px 14px',
        'border:none',
        'background:transparent',
        'cursor:pointer',
        'text-align:left',
        'transition:background 0.15s',
        'color:var(--foreground)',
      ].join(';');
      item.innerHTML = `
        <span style="font-size:1rem;line-height:1;">${icon}</span>
        <span>
          <div style="font-size:0.78rem;font-weight:600;">${label}</div>
          <div style="font-size:0.68rem;color:var(--muted-foreground);margin-top:2px;">${desc}</div>
        </span>`;
      item.addEventListener('mouseenter', () => item.style.background = 'var(--muted)');
      item.addEventListener('mouseleave', () => item.style.background = 'transparent');
      item.addEventListener('click', () => {
        exportMenu.style.display = 'none';
        this.exportPage(format);
      });
      exportMenu.appendChild(item);
    });

    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = exportMenu.style.display !== 'none';
      exportMenu.style.display = isOpen ? 'none' : 'block';
    });

    document.addEventListener('click', () => { exportMenu.style.display = 'none'; }, { capture: true });

    exportWrap.appendChild(exportBtn);
    exportWrap.appendChild(exportMenu);
    bar.appendChild(exportWrap);

    return bar;
  }

  _createCollabBar() {
    const bar = document.createElement('div');
    bar.className = 'nb-collab-bar';

    const statusWrap = document.createElement('div');
    statusWrap.className = 'nb-collab-status';

    const dot = document.createElement('span');
    dot.className = 'nb-collab-dot connecting';
    this._els.collabDot = dot;

    const statusText = document.createElement('span');
    statusText.textContent = 'Connecting…';
    this._els.collabStatus = statusText;

    statusWrap.appendChild(dot);
    statusWrap.appendChild(statusText);

    const usersRow = document.createElement('div');
    usersRow.className = 'nb-users-row';
    this._els.usersRow = usersRow;

    bar.appendChild(statusWrap);
    bar.appendChild(usersRow);
    return bar;
  }

  _createFooter() {
    const footer = document.createElement('div');
    footer.className = 'nb-footer';

    const saveStatus = document.createElement('span');
    saveStatus.className = 'nb-save-status unsaved';
    saveStatus.innerHTML = `<span>●</span> <span id="nb-save-text">No changes</span>`;
    this._els.saveStatus = saveStatus;
    this._els.saveText   = saveStatus.querySelector('#nb-save-text');

    const wordCount = document.createElement('span');
    wordCount.textContent = '0 words';
    this._els.wordCount = wordCount;

    footer.appendChild(saveStatus);
    footer.appendChild(wordCount);
    return footer;
  }

  /* ── Quill Initialisation ─────────────────────────────────────────────────── */

  _initQuill() {
    // Remove any existing Quill instance
    this._els.editorWrap.innerHTML = '';
    const editorDiv = document.createElement('div');
    this._els.editorWrap.appendChild(editorDiv);

    // Register custom fonts with Quill
    const Font = Quill.import('formats/font');
    Font.whitelist = [
      'Arial, sans-serif',
      'Calibri, sans-serif',
      "'Times New Roman', serif",
    ];
    Quill.register(Font, true);

    // Custom size format
    const Size = Quill.import('attributors/style/size');
    Size.whitelist = ['10px','11px','12px','14px','16px','18px','20px','24px','28px','32px','36px'];
    Quill.register(Size, true);

    this._quill = new Quill(editorDiv, {
      theme:       'snow',
      readOnly:    this._isReadOnly,
      placeholder: this._isReadOnly ? '' : 'Start writing your page here…',
      modules: {
        toolbar:  false,   // We provide our own toolbar
        history:  { delay: 1500, maxStack: 100, userOnly: true },
        keyboard: { bindings: {} },
      },
    });

    // Hide the default snow toolbar (we built our own)
    const qlToolbar = this._els.editorWrap.querySelector('.ql-toolbar');
    if (qlToolbar) qlToolbar.style.display = 'none';

    // Wire up save on text change
    this._quill.on('text-change', (delta, old, source) => {
      if (source !== 'user') return;
      this._updateWordCount();
      this._scheduleSave();
    });

    // Update toolbar active state on selection change
    this._quill.on('selection-change', (range) => {
      if (range) this._syncToolbarState();
    });
  }

  /* ── Yjs / WebSocket Initialisation ─────────────────────────────────────── */

  _initYjs(pageId) {
    // Guard: Yjs must be loaded as a global
    if (typeof Y === 'undefined' || typeof YQuill === 'undefined' || typeof YWebsocket === 'undefined') {
      console.warn('[NotebookEditor] Yjs libs not loaded — collaboration disabled.');
      this._setCollabStatus('error', 'Collab unavailable');
      return;
    }

    const wsUrl = this._opts.wsUrl;
    if (!wsUrl) {
      this._setCollabStatus('error', 'No WS URL configured');
      return;
    }

    // Yjs shared document — room name is unique per notebook page
    const roomName = `groupspace-notebook-${this._opts.notebookId}-page-${pageId}`;

    this._ydoc = new Y.Doc();

    // WebSocket provider
    this._provider = new YWebsocket.WebsocketProvider(wsUrl, roomName, this._ydoc);

    this._provider.on('status', ({ status }) => {
      if (status === 'connected') {
        this._setCollabStatus('connected', 'Live');
      } else if (status === 'connecting') {
        this._setCollabStatus('connecting', 'Connecting…');
      } else {
        this._setCollabStatus('error', 'Disconnected');
      }
    });

    // Awareness (cursor / user presence)
    this._awareness = this._provider.awareness;
    const user = this._opts.currentUser;
    const userColor = hashColor(String(user.id));

    this._awareness.setLocalStateField('user', {
      name:   user.full_name,
      initials: user.avatar_initials || buildAvatarInitials(user.full_name),
      color:  userColor,
      id:     user.id,
    });

    // Track remote users for the collab bar
    this._awareness.on('change', () => this._renderActiveUsers());

    // Quill ↔ Yjs binding
    const yText = this._ydoc.getText('quill');
    this._binding = new YQuill.QuillBinding(yText, this._quill, this._awareness);

    this._setCollabStatus('connecting', 'Connecting…');
  }

  _destroyYjs() {
    if (this._binding)  { this._binding.destroy();  this._binding  = null; }
    if (this._provider) { this._provider.destroy(); this._provider = null; }
    if (this._ydoc)     { this._ydoc.destroy();     this._ydoc     = null; }
    this._awareness = null;
    this._setCollabStatus('disconnected', 'Offline');
    this._renderActiveUsers();
  }

  /* ── Collaboration UI ────────────────────────────────────────────────────── */

  _setCollabStatus(state, label) {
    this._connStatus = state;
    if (!this._els.collabDot || !this._els.collabStatus) return;

    this._els.collabDot.className = `nb-collab-dot ${state}`;
    this._els.collabStatus.textContent = label;
  }

  _renderActiveUsers() {
    if (!this._els.usersRow || !this._awareness) {
      if (this._els.usersRow) this._els.usersRow.innerHTML = '';
      return;
    }

    this._els.usersRow.innerHTML = '';
    const states = Array.from(this._awareness.getStates().values());

    states.forEach(state => {
      const u = state.user;
      if (!u || u.id === this._opts.currentUser.id) return;

      const pill = document.createElement('div');
      pill.className = 'nb-user-pill';
      pill.style.cssText = `background:${u.color}18; border-color:${u.color}40;`;
      pill.title = u.name;

      const avatar = document.createElement('div');
      avatar.className = 'nb-user-avatar';
      avatar.style.background = u.color;
      avatar.textContent = u.initials || buildAvatarInitials(u.name);

      const name = document.createElement('span');
      name.textContent = u.name.split(' ')[0];
      name.style.color = u.color;

      pill.appendChild(avatar);
      pill.appendChild(name);
      this._els.usersRow.appendChild(pill);
    });
  }

  /* ── Save Logic ──────────────────────────────────────────────────────────── */

  _scheduleSave() {
    this._setSaveStatus('unsaved', 'Unsaved changes');
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._save(), 1800);
  }

  async _save() {
    if (this._isReadOnly || !this._activePageId || !this._opts.onSave) return;

    this._setSaveStatus('saving', 'Saving…');
    try {
      await this._opts.onSave(this._activePageId, {
        title:   this._els.titleInput.value.trim() || 'Untitled',
        content: this._quill ? this._quill.root.innerHTML : '',
      });
      this._setSaveStatus('saved', 'All changes saved');
    } catch (err) {
      console.error('[NotebookEditor] Save error:', err);
      this._setSaveStatus('error', 'Save failed — retry?');
    }
  }

  _setSaveStatus(state, text) {
    if (!this._els.saveStatus) return;
    this._els.saveStatus.className = `nb-save-status ${state}`;
    if (this._els.saveText) this._els.saveText.textContent = text;
  }

  /* ── Word Count ──────────────────────────────────────────────────────────── */

  _updateWordCount() {
    if (!this._quill || !this._els.wordCount) return;
    const text  = this._quill.getText().trim();
    const count = text ? text.split(/\s+/).filter(Boolean).length : 0;
    this._els.wordCount.textContent = `${count} word${count !== 1 ? 's' : ''}`;
  }

  /* ── Toolbar State Sync ──────────────────────────────────────────────────── */

  _syncToolbarState() {
    if (!this._quill) return;
    const fmt = this._quill.getFormat();

    // Toggle active class on format buttons
    this._els.toolbar.querySelectorAll('[data-format]').forEach(btn => {
      const f = btn.dataset.format;
      btn.classList.toggle('active', !!fmt[f]);
    });
  }

  /* ── Permissions Modal ───────────────────────────────────────────────────── */

  _openPermissionsModal() {
    const overlay = document.createElement('div');
    overlay.className = 'nb-perm-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'nb-perm-modal';

    const title = document.createElement('h3');
    title.textContent = '🔒 Notebook Permissions';
    modal.appendChild(title);

    /* Visibility toggle */
    const visRow = document.createElement('div');
    visRow.className = 'nb-perm-row';
    visRow.innerHTML = `
      <div style="font-size:0.85rem; font-weight:600; color:var(--foreground);">Workspace Visibility</div>
    `;
    const visSel = document.createElement('select');
    visSel.className = 'nb-perm-role-select';
    [['🌐 Shared (all members can view)', 'shared'], ['🔒 Private (invite-only)', 'private']]
      .forEach(([label, val]) => {
        const o = document.createElement('option');
        o.value = val; o.textContent = label;
        if (val === (this._opts.visibility || 'shared')) o.selected = true;
        visSel.appendChild(o);
      });
    visRow.appendChild(visSel);
    modal.appendChild(visRow);

    /* Member rows */
    const memberSection = document.createElement('div');
    memberSection.style.marginTop = '14px';
    const memberTitle = document.createElement('div');
    memberTitle.style.cssText = 'font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted-foreground);margin-bottom:8px;';
    memberTitle.textContent = 'Member Access';
    memberSection.appendChild(memberTitle);

    const pendingGrants = [];

    (this._opts.members || []).forEach(m => {
      if (m.user_id === this._opts.currentUser.id) return; // Skip self

      const row = document.createElement('div');
      row.className = 'nb-perm-row';

      const userInfo = document.createElement('div');
      userInfo.className = 'nb-perm-user-info';

      const avatar = document.createElement('div');
      avatar.className = 'nb-perm-user-avatar';
      const color = hashColor(String(m.user_id));
      avatar.style.background = color;
      avatar.textContent = buildAvatarInitials(m.full_name);

      const nameEl = document.createElement('div');
      nameEl.className = 'nb-perm-user-name';
      nameEl.textContent = m.full_name;

      userInfo.appendChild(avatar);
      userInfo.appendChild(nameEl);

      const roleSel = document.createElement('select');
      roleSel.className = 'nb-perm-role-select';
      [
        ['Viewer',  'viewer'],
        ['Editor',  'editor'],
        ['Admin',   'admin'],
        ['Revoke',  'revoke'],
      ].forEach(([label, val]) => {
        const o = document.createElement('option');
        o.value = val; o.textContent = label;
        roleSel.appendChild(o);
      });

      roleSel.addEventListener('change', () => {
        const existing = pendingGrants.findIndex(g => g.userId === m.user_id);
        const entry = { userId: m.user_id, role: roleSel.value === 'revoke' ? null : roleSel.value };
        if (existing >= 0) pendingGrants[existing] = entry;
        else pendingGrants.push(entry);
      });

      row.appendChild(userInfo);
      row.appendChild(roleSel);
      memberSection.appendChild(row);
    });
    modal.appendChild(memberSection);

    /* Action buttons */
    const actions = document.createElement('div');
    actions.className = 'nb-perm-modal-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'nb-tb-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => overlay.remove());

    const saveBtn = document.createElement('button');
    saveBtn.className = 'nb-tb-btn active';
    saveBtn.style.cssText = 'background:var(--primary);color:#fff;padding:0 16px;';
    saveBtn.textContent = 'Save Permissions';
    saveBtn.addEventListener('click', async () => {
      try {
        saveBtn.textContent = 'Saving…';
        saveBtn.disabled = true;
        await apiFetch(`/api/notebooks/${this._opts.notebookId}/permissions`, {
          method: 'PUT',
          body: JSON.stringify({
            visibility: visSel.value,
            grants:     pendingGrants,
          }),
        });
        showToast('Notebook permissions updated.', 'success');
        this._opts.visibility = visSel.value;
        if (this._els.visBadge) {
          this._els.visBadge.className  = `nb-visibility-badge ${visSel.value}`;
          this._els.visBadge.textContent = visSel.value === 'shared' ? '🌐 Shared' : '🔒 Private';
        }
        overlay.remove();
      } catch (err) {
        showToast(err.message || 'Failed to update permissions.', 'error');
        saveBtn.textContent = 'Save Permissions';
        saveBtn.disabled = false;
      }
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    modal.appendChild(actions);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close on backdrop click
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });
  }

  /* ── Empty Canvas ────────────────────────────────────────────────────────── */

  _showEmptyCanvas() {
    this._els.editorWrap.innerHTML = `
      <div class="nb-empty-state">
        <div class="nb-empty-state-icon">📄</div>
        <h3>Select a page to start editing</h3>
        <p>Pick a page from the sidebar or create a new one to begin.</p>
      </div>
    `;
  }

  /* ── Export ──────────────────────────────────────────────────────────────── */

  /**
   * Export the currently active page in the requested format.
   *
   * @param {'txt'|'pdf'|'docx'} format
   */
  async exportPage(format) {
    if (!this._activePageId) {
      showToast('No page is open to export.', 'error');
      return;
    }

    const title   = this._els.titleInput?.value?.trim() || 'Untitled Page';
    const htmlContent = this._quill ? this._quill.root.innerHTML : '';

    try {
      switch (format) {

        /* ──────────────── .txt ──────────────── */
        case 'txt': {
          // Strip HTML tags; convert common block elements to newlines
          const tmp = document.createElement('div');
          tmp.innerHTML = htmlContent;

          // Replace block-level tags with newlines before stripping
          tmp.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, br').forEach(el => {
            el.insertAdjacentText('beforebegin', '\n');
          });

          const rawText = (title + '\n' + '='.repeat(title.length) + '\n\n' + (tmp.textContent || tmp.innerText || ''))
            .replace(/\n{3,}/g, '\n\n') // collapse excessive blank lines
            .trim();

          const blob = new Blob([rawText], { type: 'text/plain;charset=utf-8' });
          _triggerDownload(blob, `${_safeFilename(title)}.txt`);
          showToast('Downloaded as plain text.', 'success');
          break;
        }

        /* ──────────────── .pdf ──────────────── */
        case 'pdf': {
          if (typeof html2pdf === 'undefined') {
            showToast('html2pdf.js is not loaded. Add the CDN script to your page.', 'error');
            return;
          }

          // Build a self-contained print clone with correct font & spacing
          const lineHeight = this._quill?.root.style.lineHeight || '1.5';
          const font       = this._els.fontSel?.value || 'Arial, sans-serif';

          const printNode = document.createElement('div');
          printNode.style.cssText = [
            `font-family:${font}`,
            `font-size:12pt`,
            `line-height:${lineHeight}`,
            'color:#1a1a1a',
            'padding:20mm',
          ].join(';');
          printNode.innerHTML = `<h1 style="font-size:22pt;margin-bottom:12pt;">${
            title.replace(/</g,'&lt;').replace(/>/g,'&gt;')
          }</h1>${htmlContent}`;

          document.body.appendChild(printNode);

          await html2pdf()
            .set({
              margin:      10,
              filename:    `${_safeFilename(title)}.pdf`,
              image:       { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
              pagebreak:   { mode: ['avoid-all', 'css', 'legacy'] },
            })
            .from(printNode)
            .save();

          document.body.removeChild(printNode);
          showToast('Downloaded as PDF.', 'success');
          break;
        }

        /* ──────────────── .docx ──────────────── */
        case 'docx': {
          showToast('Generating Word document…', 'info');

          const font       = this._els.fontSel?.value || 'Arial, sans-serif';
          const lineHeight = parseFloat(this._quill?.root.style.lineHeight || '1.5') || 1.5;

          const response = await fetch('/api/notebooks/export/docx', {
            method:      'POST',
            credentials: 'include',
            headers:     { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              notebookId:  this._opts.notebookId,
              pageId:      this._activePageId,
              htmlContent,
              title,
              font,
              lineHeight,
            }),
          });

          if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(errBody.message || `Server returned ${response.status}`);
          }

          // Stream binary blob and trigger download
          const blob = await response.blob();
          const cd   = response.headers.get('Content-Disposition') || '';
          const match = cd.match(/filename="([^"]+)"/);
          const filename = match ? match[1] : `${_safeFilename(title)}.docx`;

          _triggerDownload(blob, filename);
          showToast('Downloaded as Word document.', 'success');
          break;
        }

        default:
          showToast(`Unknown export format: ${format}`, 'error');
      }
    } catch (err) {
      console.error('[NotebookEditor] exportPage error:', err);
      showToast(err.message || 'Export failed. Please try again.', 'error');
    }
  }

  /* ── Utility ─────────────────────────────────────────────────────────────── */

  _tbBtn(html, title = '') {
    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'nb-tb-btn';
    btn.title     = title;
    btn.innerHTML = html;
    return btn;
  }

  _sep(parent) {
    const s = document.createElement('span');
    s.className = 'nb-toolbar-sep';
    parent.appendChild(s);
  }
}

/* ─── NotebookModule — orchestrates list + editor inside the tab ─────────────── */

/**
 * Top-level manager that renders the notebook list sidebar + editor panel
 * inside the `#tab-notebook` section of dashboard.html.
 *
 * Usage (called from dashboard.js):
 *   await NotebookModule.init(groupId, currentUser);
 */
const NotebookModule = (() => {
  let _groupId    = null;
  let _currentUser = null;
  let _notebooks  = [];
  let _activeNb   = null;   // { id, title, visibility, user_role, pages }
  let _activePage = null;   // { id, title, content }
  let _editorInst = null;   // NotebookEditorComponent instance
  let _members    = [];

  /* ── Render shell ── */
  function _renderShell() {
    const tab = document.getElementById('tab-notebook');
    if (!tab) return;

    tab.innerHTML = `
      <div class="nb-list-shell" id="nbListShell">
        <!-- Sidebar -->
        <div class="nb-list-sidebar" id="nbListSidebar">
          <div class="nb-list-sidebar-header">
            <h4>📓 Notebooks</h4>
            <button class="nb-tb-btn active" id="nbNewNotebookBtn" title="New Notebook"
                    style="background:var(--primary);color:#fff;padding:0 10px;font-size:0.78rem;"
                    onclick="NotebookModule.openCreateNotebookModal()">+ New</button>
          </div>
          <div class="nb-list-items" id="nbNotebookList">
            <div class="nb-empty-state">
              <div class="nb-empty-state-icon">📓</div>
              <p>Loading notebooks…</p>
            </div>
          </div>
        </div>

        <!-- Editor panel -->
        <div id="nbEditorContainer" style="display:flex;flex-direction:column;min-height:0;">
          <div class="nb-empty-state" style="height:100%;">
            <div class="nb-empty-state-icon">👈</div>
            <h3>Select a notebook</h3>
            <p>Pick one from the list on the left to open it.</p>
          </div>
        </div>
      </div>
    `;
  }

  /* ── Load group notebooks ── */
  async function _loadNotebooks() {
    try {
      const res = await apiFetch(`/api/notebooks/${_groupId}`);
      _notebooks = res.data || [];
      _renderNotebookList();

      // Auto-select first
      if (_notebooks.length > 0 && !_activeNb) {
        await _selectNotebook(_notebooks[0]);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function _renderNotebookList() {
    const list = document.getElementById('nbNotebookList');
    if (!list) return;

    if (_notebooks.length === 0) {
      list.innerHTML = `
        <div class="nb-empty-state">
          <div class="nb-empty-state-icon">📓</div>
          <h3>No notebooks yet</h3>
          <p>Create your first shared notebook.</p>
        </div>`;
      return;
    }

    list.innerHTML = '';
    _notebooks.forEach(nb => {
      const item = document.createElement('div');
      item.className = `nb-list-item${_activeNb && _activeNb.id === nb.id ? ' active' : ''}`;
      item.dataset.id = nb.id;
      item.innerHTML = `
        <div class="nb-list-item-icon">${nb.visibility === 'private' ? '🔒' : '📓'}</div>
        <div class="nb-list-item-body">
          <div class="nb-list-item-title">${escapeHtml(nb.title)}</div>
          <div class="nb-list-item-meta">
            <span>${nb.user_role || 'viewer'}</span>
            <span>·</span>
            <span>${relativeTime(nb.updated_at)}</span>
          </div>
        </div>`;
      item.addEventListener('click', () => _selectNotebook(nb));
      list.appendChild(item);
    });
  }

  /* ── Select notebook → load pages sidebar + open editor ── */
  async function _selectNotebook(nb) {
    _activeNb = nb;

    // Update sidebar active state
    document.querySelectorAll('.nb-list-item').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.id) === nb.id);
    });

    // Fetch pages for this notebook
    let pages = [];
    try {
      const res = await apiFetch(`/api/notebooks/${nb.id}/pages`);
      pages = res.data?.pages || [];
      _activeNb.pages = pages;
    } catch (err) {
      showToast(err.message, 'error');
    }

    // Mount (or remount) editor
    _mountEditor(nb, pages);
  }

  /* ── Mount editor component ── */
  function _mountEditor(nb, pages) {
    if (_editorInst) { _editorInst.destroy(); _editorInst = null; }

    const container = document.getElementById('nbEditorContainer');
    if (!container) return;
    container.innerHTML = '';

    // Build two-panel inner: page list (narrow) + editor
    container.style.cssText = 'display:grid;grid-template-columns:200px 1fr;height:100%;min-height:0;';

    /* Page list */
    const pageSidebar = document.createElement('div');
    pageSidebar.style.cssText = 'border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;background:var(--card);';

    const pageHeader = document.createElement('div');
    pageHeader.style.cssText = 'padding:12px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;';
    pageHeader.innerHTML = `<span style="font-size:0.78rem;font-weight:700;color:var(--foreground);">Pages</span>`;

    if (nb.user_role !== 'viewer') {
      const addPageBtn = document.createElement('button');
      addPageBtn.className   = 'nb-tb-btn';
      addPageBtn.textContent = '+ Page';
      addPageBtn.style.cssText = 'font-size:0.72rem;padding:0 8px;';
      addPageBtn.addEventListener('click', () => _createPage(nb.id));
      pageHeader.appendChild(addPageBtn);
    }

    const pageListEl = document.createElement('div');
    pageListEl.style.cssText = 'flex:1;overflow-y:auto;padding:6px;';
    pageListEl.id = 'nbPageList';

    pageSidebar.appendChild(pageHeader);
    pageSidebar.appendChild(pageListEl);
    container.appendChild(pageSidebar);

    _renderPageList(pages, null, nb.id, nb.user_role);

    /* Editor mount */
    const editorMount = document.createElement('div');
    editorMount.style.cssText = 'min-width:0;display:flex;flex-direction:column;';
    container.appendChild(editorMount);

    const wsUrl = (() => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host  = window.location.host;
      // Fall back to a configurable global; production should set window.GS_WS_URL
      return window.GS_WS_URL || `${proto}//${host}/yjs`;
    })();

    _editorInst = new NotebookEditorComponent(editorMount, {
      notebookId:  nb.id,
      userRole:    nb.user_role || 'viewer',
      currentUser: _currentUser,
      visibility:  nb.visibility,
      wsUrl,
      members:     _members,
      onSave: async (pageId, { title, content }) => {
        await apiFetch(`/api/notebooks/${nb.id}/pages/${pageId}`, {
          method: 'PATCH',
          body: JSON.stringify({ title, content }),
        });
      },
    });

    // Auto-open first page
    if (pages.length > 0) {
      _openPage(pages[0]);
    } else {
      _editorInst.loadPage(null);
    }
  }

  /* ── Page list rendering ── */
  function _renderPageList(pages, activePageId, notebookId, userRole) {
    const pageListEl = document.getElementById('nbPageList');
    if (!pageListEl) return;
    pageListEl.innerHTML = '';

    if (pages.length === 0) {
      pageListEl.innerHTML = `<div style="padding:16px;font-size:0.75rem;color:var(--muted-foreground);text-align:center;">No pages yet</div>`;
      return;
    }

    pages.forEach(page => {
      const item = document.createElement('div');
      item.className = `nb-list-item${page.id === activePageId ? ' active' : ''}`;
      item.dataset.pageId = page.id;
      item.style.gap = '8px';
      item.innerHTML = `
        <div style="font-size:0.95rem;">📄</div>
        <div style="min-width:0;">
          <div class="nb-list-item-title" style="font-size:0.78rem;">${escapeHtml(page.title)}</div>
          <div class="nb-list-item-meta" style="font-size:0.67rem;">${relativeTime(page.updated_at)}</div>
        </div>`;
      item.addEventListener('click', () => _openPage(page));
      pageListEl.appendChild(item);
    });
  }

  function _openPage(page) {
    _activePage = page;
    // Update active state in page list
    document.querySelectorAll('[data-page-id]').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.pageId) === page.id);
    });
    if (_editorInst) {
      _editorInst.loadPage(page.id, {
        title:   page.title,
        content: page.content,
      });
    }
  }

  /* ── Create page ── */
  async function _createPage(notebookId) {
    const title = prompt('New page title:');
    if (!title?.trim()) return;
    try {
      const res = await apiFetch(`/api/notebooks/${notebookId}/pages`, {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), content: '' }),
      });
      const page = res.data;
      if (_activeNb) {
        _activeNb.pages = [...(_activeNb.pages || []), page];
        _renderPageList(_activeNb.pages, page.id, notebookId, _activeNb.user_role);
        _openPage(page);
      }
      showToast('Page created.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  /* ── Create notebook modal ── */
  function openCreateNotebookModal() {
    const overlay = document.createElement('div');
    overlay.className = 'nb-perm-modal-overlay';

    overlay.innerHTML = `
      <div class="nb-perm-modal">
        <h3>📓 Create Notebook</h3>
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:4px;">
          <div>
            <label style="font-size:0.8rem;font-weight:600;color:var(--foreground);display:block;margin-bottom:5px;">Title *</label>
            <input id="nbCreateTitle" class="form-control" placeholder="e.g. Sprint Planning" style="font-size:0.9rem;">
          </div>
          <div>
            <label style="font-size:0.8rem;font-weight:600;color:var(--foreground);display:block;margin-bottom:5px;">Description</label>
            <input id="nbCreateDesc" class="form-control" placeholder="Optional description" style="font-size:0.9rem;">
          </div>
          <div>
            <label style="font-size:0.8rem;font-weight:600;color:var(--foreground);display:block;margin-bottom:5px;">Visibility</label>
            <select id="nbCreateVisibility" class="form-control">
              <option value="shared">🌐 Shared — all workspace members can view</option>
              <option value="private">🔒 Private — invite-only access</option>
            </select>
          </div>
        </div>
        <div class="nb-perm-modal-actions" style="margin-top:20px;">
          <button class="nb-tb-btn" id="nbCreateCancelBtn">Cancel</button>
          <button class="nb-tb-btn active" id="nbCreateSubmitBtn"
                  style="background:var(--primary);color:#fff;padding:0 18px;">Create Notebook</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    overlay.querySelector('#nbCreateCancelBtn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#nbCreateSubmitBtn').addEventListener('click', async () => {
      const title      = overlay.querySelector('#nbCreateTitle').value.trim();
      const desc       = overlay.querySelector('#nbCreateDesc').value.trim();
      const visibility = overlay.querySelector('#nbCreateVisibility').value;

      if (!title) { showToast('Title is required.', 'error'); return; }

      const btn = overlay.querySelector('#nbCreateSubmitBtn');
      btn.textContent = 'Creating…'; btn.disabled = true;

      try {
        await apiFetch('/api/notebooks', {
          method: 'POST',
          body: JSON.stringify({ groupId: _groupId, title, description: desc, visibility }),
        });
        showToast(`Notebook "${title}" created!`, 'success');
        overlay.remove();
        await _loadNotebooks();
      } catch (err) {
        showToast(err.message, 'error');
        btn.textContent = 'Create Notebook'; btn.disabled = false;
      }
    });
  }

  /* ── Public init ── */
  async function init(groupId, currentUser, members = []) {
    _groupId     = groupId;
    _currentUser = currentUser;
    _members     = members;
    _activeNb    = null;
    _activePage  = null;

    _renderShell();
    await _loadNotebooks();
  }

  /**
   * Export the currently active notebook page.
   *
   * Can be called from outside the module (e.g. a top-level keyboard shortcut).
   *
   * @param {'txt'|'pdf'|'docx'} format
   */
  function exportNotebook(format) {
    if (!_editorInst) {
      showToast('No notebook is open.', 'error');
      return;
    }
    _editorInst.exportPage(format);
  }

  return { init, openCreateNotebookModal, exportNotebook };
})();

/* ─── Module-level helpers (shared by class + IIFE) ─────────────────────────── */

/**
 * Trigger a file download from a Blob object without a server round-trip.
 *
 * @param {Blob}   blob     - Binary data to download
 * @param {string} filename - Suggested download filename
 */
function _triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Delay revoke so the browser has time to initiate the download
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

/**
 * Sanitise a string for use as a filename.
 * Strips characters that are illegal on Windows / macOS / Linux.
 *
 * @param {string} name
 * @returns {string}
 */
function _safeFilename(name) {
  return (name || 'export')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')  // illegal chars
    .replace(/\s+/g, '_')                     // spaces → underscores
    .replace(/_{2,}/g, '_')                   // collapse multiple underscores
    .replace(/^[_.]+/, '')                    // no leading dots or underscores
    .slice(0, 100)                            // max length
    || 'export';
}
