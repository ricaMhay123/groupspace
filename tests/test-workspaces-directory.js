'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const wsHtmlPath = path.join(__dirname, '../public/workspaces.html');
const styleCssPath = path.join(__dirname, '../public/css/style.css');

const wsHtml = fs.readFileSync(wsHtmlPath, 'utf8');
const styleCss = fs.readFileSync(styleCssPath, 'utf8');

console.log('=== Testing Workspaces Directory Layout, Paddings & Grouping ===');

// ── Task 1 Checks: Structure, Paddings, Breakpoint & Dark Mode Contrast ──
assert(!/<nav>\s*<a href="workspaces\.html"/i.test(wsHtml), 'Header removes redundant lone Workspaces nav pill');
assert(wsHtml.includes('class="workspace-header-bar"'), 'workspaces.html uses left-aligned .workspace-header-bar');
assert(wsHtml.includes('id="workspaceGrid"') && wsHtml.includes('class="workspace-sections"'), '#workspaceGrid mounts .workspace-sections');

[
  '.workspace-header-bar',
  '.workspace-section',
  '.workspace-section-header',
  '.workspace-section-title',
  '.workspace-card-top',
  '.workspace-role-pill',
  '.workspace-card-desc',
  '.workspace-meta-line',
  '.workspace-code-row',
  '.btn-copy-code',
  '.workspace-card-footer'
].forEach(sel => {
  assert(styleCss.includes(sel), `style.css defines ${sel}`);
});

assert(
  styleCss.includes('.workspace-card') && styleCss.includes('flex-direction: column') && styleCss.includes('padding: 24px'),
  '.workspace-card uses flex column layout with 24px padding'
);
assert(styleCss.includes('min(100%, 310px)'), '.workspace-grid guards against <342px overflow using min(100%, 310px)');
assert(styleCss.includes('overflow-wrap: anywhere'), 'Long workspace names/descriptions wrap cleanly');
assert(/@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.workspace-header-bar/.test(styleCss), 'Mobile <=768px handles .workspace-header-bar stacking');
assert(styleCss.includes('.dark .workspace-icon') && styleCss.includes('#93b4ff'), 'Dark mode uses accessible high-contrast #93b4ff accent on dark surfaces');
console.log('PASS: Task 1 header, layout, padding, responsive, and dark contrast selectors');

// ── Task 2 Checks: Partitioning, Description Cleanup, Invite Copy & A11y ──
const scriptMatches = [...wsHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert(scriptMatches.length > 0, 'workspaces.html contains inline script');
const inlineScript = scriptMatches[scriptMatches.length - 1][1];

let copiedText = '';
let clipboardShouldReject = false;
let execCommandResult = true;
let toastCalls = [];
const sandbox = {
  document: {
    getElementById: () => ({ addEventListener: () => {}, innerHTML: '', value: '' }),
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => ({ style: {}, setAttribute: () => {}, select: () => {} }),
    body: { appendChild: () => {}, removeChild: () => {} },
    execCommand: () => execCommandResult
  },
  window: { location: { href: '' } },
  localStorage: { setItem: () => {}, getItem: () => null },
  navigator: {
    clipboard: {
      writeText: text => {
        if (clipboardShouldReject) {
          return Promise.reject(new Error('Clipboard blocked'));
        }
        copiedText = text;
        return Promise.resolve();
      }
    }
  },
  escapeHtml: s => String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;'),
  showToast: (msg, type) => toastCalls.push({ msg, type }),
  apiFetch: async () => ({ data: [] }),
  checkAuth: async () => ({ id: 1, fullName: 'Rica' })
};

vm.createContext(sandbox);
vm.runInContext(inlineScript, sandbox, { filename: 'workspaces.html (inline script)' });

assert.strictEqual(typeof sandbox.partitionWorkspaces, 'function', 'partitionWorkspaces is defined');
assert.strictEqual(typeof sandbox.formatWorkspaceDescription, 'function', 'formatWorkspaceDescription is defined');
assert.strictEqual(typeof sandbox.renderWorkspaceCard, 'function', 'renderWorkspaceCard is defined');
assert.strictEqual(typeof sandbox.renderWorkspaceSectionsHtml, 'function', 'renderWorkspaceSectionsHtml is defined');
assert.strictEqual(typeof sandbox.copyWorkspaceCode, 'function', 'copyWorkspaceCode is defined');

// 1. Joined workspace (including promoted joined leader) must separate cleanly using created_by_user_id
const sampleGroups = [
  { id: 10, name: 'Defense', description: 'N/A', category: 'School Project', role: 'member', created_by_user_id: 99, member_count: 3, pending_task_count: 4, join_code: 'GS-DSHHBN' },
  { id: 11, name: 'PT', description: 'No description provided.', category: 'Personal Study Group', role: 'leader', created_by_user_id: 1, member_count: 1, pending_task_count: 1, join_code: 'GS-MC74F9' },
  { id: 12, name: 'Promoted Team', description: 'Co-managed team', category: 'School Project', role: 'leader', created_by_user_id: 42, member_count: 5, pending_task_count: 2, join_code: 'GS-PROMO1' },
  { id: 13, name: 'Legacy Team', description: 'Real description', category: 'School Project', role: 'leader', created_by_user_id: null, member_count: 2, pending_task_count: 0, join_code: 'GS-LEGACY' }
];
const grouped = sandbox.partitionWorkspaces(sampleGroups, 1);
assert.deepStrictEqual(Array.from(grouped.created).map(g => g.name), ['PT', 'Legacy Team'], 'Created + legacy leader workspaces belong in created section');
assert.deepStrictEqual(Array.from(grouped.joined).map(g => g.name), ['Defense', 'Promoted Team'], 'Joined member and joined promoted-leader workspaces belong in joined section');

// 2. Placeholder descriptions eliminated
assert.strictEqual(sandbox.formatWorkspaceDescription('N/A'), '');
assert.strictEqual(sandbox.formatWorkspaceDescription('No description provided.'), '');
assert.strictEqual(sandbox.formatWorkspaceDescription('   '), '');
assert.strictEqual(sandbox.formatWorkspaceDescription('Create websites'), 'Create websites');

// 3. Mixed, joined-only, and created-only section headers behave cleanly
const mixedHtml = sandbox.renderWorkspaceSectionsHtml(sampleGroups, { id: 1 });
assert(mixedHtml.indexOf('Created by You') !== -1 && mixedHtml.indexOf('Joined Workspaces') !== -1, 'Mixed list renders both sections');
assert(mixedHtml.indexOf('Created by You') < mixedHtml.indexOf('Joined Workspaces'), 'Created by You renders above Joined Workspaces');

const joinedOnlyHtml = sandbox.renderWorkspaceSectionsHtml([sampleGroups[0]], { id: 1 });
assert(!joinedOnlyHtml.includes('Created by You'), 'Joined-only user omits empty Created by You section');
assert(joinedOnlyHtml.includes('Joined Workspaces'), 'Joined-only user renders Joined Workspaces');

const createdOnlyHtml = sandbox.renderWorkspaceSectionsHtml([sampleGroups[1]], { id: 1 });
assert(createdOnlyHtml.includes('Created by You'), 'Creator-only user renders Created by You');
assert(!createdOnlyHtml.includes('Joined Workspaces'), 'Creator-only user omits empty Joined Workspaces section');

// 4. Owned & promoted leader cards render safe data-join-code copy button + keyboard accessible link; joined member omits code
const ownedCardHtml = sandbox.renderWorkspaceCard(sampleGroups[1], true);
assert(!ownedCardHtml.includes('No description provided.'), 'Owned card omits No description provided.');
assert(ownedCardHtml.includes('data-join-code="GS-MC74F9"') && ownedCardHtml.includes('this.dataset.joinCode'), 'Owned card uses safe data-join-code attribute instead of JS string escaping');
assert(ownedCardHtml.includes('tabindex="0"') && ownedCardHtml.includes('<a href="dashboard.html?groupId=11"'), 'Card is keyboard focusable with semantic Open link');

const promotedLeaderCardHtml = sandbox.renderWorkspaceCard(sampleGroups[2], false);
assert(promotedLeaderCardHtml.includes('GS-PROMO1'), 'Promoted joined Leader retains copyable invite code pill per spec');

const joinedCardHtml = sandbox.renderWorkspaceCard(sampleGroups[0], false);
assert(!joinedCardHtml.includes('>N/A<'), 'Joined card omits literal N/A');
assert(!joinedCardHtml.includes('GS-DSHHBN'), 'Joined member card omits redundant invite code block');

// 5. Copy button stops propagation, falls back when clipboard rejects, and only reports success when copied
(async () => {
  let stopped = false;
  sandbox.copyWorkspaceCode({ stopPropagation: () => { stopped = true; } }, 'GS-MC74F9');
  assert.strictEqual(stopped, true, 'copyWorkspaceCode calls event.stopPropagation()');
  await new Promise(r => setImmediate(r));
  assert.strictEqual(copiedText, 'GS-MC74F9', 'copyWorkspaceCode writes invite code to clipboard');
  assert(toastCalls.some(t => t.type === 'success'), 'copyWorkspaceCode shows toast confirmation on clipboard success');

  toastCalls = [];
  clipboardShouldReject = true;
  execCommandResult = false;
  sandbox.copyWorkspaceCode({ stopPropagation: () => {} }, 'GS-MC74F9');
  await new Promise(r => setImmediate(r));
  assert(toastCalls.some(t => t.type === 'warning' || t.type === 'error'), 'copyWorkspaceCode warns instead of showing false success when clipboard + fallback fail');

  console.log('PASS: Task 2 partitioning, clean card markup, a11y, and invite copy tests');
})();
