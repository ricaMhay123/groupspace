'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dashHtml = fs.readFileSync(path.join(__dirname, '../public/dashboard.html'), 'utf8');
const dashJs = fs.readFileSync(path.join(__dirname, '../public/js/dashboard.js'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8');

console.log('=== Testing Unified Preferences & Account Modal + Feed Filtering ===');

// 1. Markup & no Default Tab selector
assert(dashHtml.includes('Preferences &amp; Account'), 'dashboard.html modal heading reflects Preferences & Account');
assert(!dashJs.includes('Default tab on open') && !dashJs.includes('defaultLandingTab'), 'No Default Tab selector added per user requirement');

// 2. Role behavior inside openWorkspaceSettingsModal():
assert(dashJs.includes('function leaveCurrentWorkspace'), 'dashboard.js defines leaveCurrentWorkspace()');
assert(dashJs.includes('/leave'), 'leaveCurrentWorkspace calls POST /api/groups/:id/leave');
assert(dashJs.includes('function setPreferenceTheme'), 'dashboard.js defines setPreferenceTheme()');
assert(dashJs.includes('focusHomespaceSettingsDrawer()'), 'Preferences modal links Leaders/Co-Leaders to Team Settings drawer');

// 3. Test openWorkspaceSettingsModal HTML for Leader vs Co-Leader vs Member via regex/vm
const leaderFnMatch = dashJs.match(/function openWorkspaceSettingsModal\(\)[\s\S]*?\n\}/);
assert(leaderFnMatch, 'openWorkspaceSettingsModal exists cleanly');
assert(!leaderFnMatch[0].includes('modalWsNameInput'), 'Leader Preferences modal no longer duplicates Homespace Team Settings form');
assert(!leaderFnMatch[0].includes('modalConstraintApproval'), 'Leader Preferences modal no longer duplicates constraints form');
assert(leaderFnMatch[0].includes('openDeleteAccountModal()'), 'Preferences modal renders Delete Account cleanly for all roles');
assert(leaderFnMatch[0].includes("saveMemberPref('notif_approvals'"), 'Notification preferences render uniformly for all roles');

// 4. Test app.js feed preference filtering in isolated sandbox
let feedBodyEl = { innerHTML: '' };
let feedBadgeEl = { textContent: '', style: { display: '' } };
const store = {
  groupspace_user: JSON.stringify({ id: 7 }),
  groupspace_pref_7_notif_approvals: 'false',
  groupspace_pref_7_notif_mentions: 'true',
  groupspace_pref_7_notif_help: 'false'
};
let capturedToggle = false;
const appSandbox = {
  document: {
    getElementById: id => {
      if (id === 'feedBody') return feedBodyEl;
      if (id === 'feedBadge') return feedBadgeEl;
      return null;
    }
  },
  window: {},
  localStorage: {
    getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null)
  },
  escapeHtml: s => String(s || ''),
  apiFetch: async () => ({
    data: {
      leadershipRequests: [{ id: 1, group_id: 2, requester_name: 'Alex', message: 'Promote me' }],
      pendingApprovals: [{ id: 2, group_id: 2, title: 'Hidden Task' }],
      helpRequests: [{ id: 3, group_id: 2, title: 'Hidden Help' }],
      mentions: [{ id: 4, group_id: 2, author_name: 'Sam', content: 'Check PR' }]
    }
  })
};
appSandbox.window = appSandbox;

vm.createContext(appSandbox);
vm.runInContext(appJs, appSandbox, { filename: 'public/js/app.js' });

(async () => {
  await appSandbox.refreshAppFeed();
  assert(!feedBodyEl.innerHTML.includes('Hidden Task'), 'Disabled notif_approvals filters Pending Approvals out of feed');
  assert(!feedBodyEl.innerHTML.includes('Hidden Help'), 'Disabled notif_help filters Help Needed out of feed');
  assert(feedBodyEl.innerHTML.includes('Check PR'), 'Enabled notif_mentions remains visible in feed');
  assert(feedBodyEl.innerHTML.includes('Promote me'), 'Leadership requests remain visible to leaders');
  assert.strictEqual(feedBadgeEl.textContent, '2', 'Badge counts only visible/enabled feed items (1 leadership + 1 mention)');
  console.log('ALL UNIFIED PREFERENCES & FEED FILTERING TESTS PASSED!');
})();
