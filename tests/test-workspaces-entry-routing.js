'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const authJs = fs.readFileSync(path.join(__dirname, '../public/js/auth.js'), 'utf8');
const dashboardJs = fs.readFileSync(path.join(__dirname, '../public/js/dashboard.js'), 'utf8');

console.log('=== Testing Workspaces-First Entry, Login, Signup & Dashboard Guard ===');

// 1. Landing page (index.html) directs signed-in visitors to /workspaces.html (not /dashboard.html)
assert(!indexHtml.includes('href="/dashboard.html"'), 'index.html must not route signed-in CTA directly to /dashboard.html');
assert(indexHtml.includes('href="/workspaces.html"') && indexHtml.includes('Open Workspaces'), 'index.html signed-in CTA points to /workspaces.html ("Open Workspaces")');
assert(indexHtml.includes('#heroCTA') || indexHtml.includes('heroCTA'), 'index.html updates hero CTA for signed-in visitors');
assert(indexHtml.includes('mobile-menu-auth'), 'index.html updates mobile menu auth CTA for signed-in visitors');
console.log('PASS: 1. index.html routes signed-in visitors to /workspaces.html');

// 2. Auth gateway (auth.js) guards existing sessions and clears stale active group on fresh auth
assert(authJs.includes("window.location.href = 'workspaces.html'"), 'auth.js redirects login/register completion to workspaces.html');
assert(authJs.includes('/api/auth/me') && authJs.includes("window.location.replace('workspaces.html')"), 'auth.js redirects already-signed-in visitors on login/register to workspaces.html after validating session');
assert(authJs.includes("localStorage.removeItem('groupspace_active_group_id')"), 'auth.js clears stale groupspace_active_group_id on login/register');
console.log('PASS: 2. auth.js validates existing tokens and routes to workspaces.html');

// 3. Dashboard guard (dashboard.js) sends direct /dashboard.html visits without ?groupId to workspaces.html
assert(dashboardJs.includes("window.location.replace('workspaces.html')"), 'dashboard.js redirects direct dashboard visits without ?groupId to workspaces.html');
assert(dashboardJs.includes("url.searchParams.set('groupId', currentGroupId)"), 'dashboard.js syncs ?groupId in URL when switching workspaces');
console.log('PASS: 3. dashboard.js requires explicit workspace selection before loading a workspace');

console.log('\nALL WORKSPACES-FIRST ENTRY ROUTING TESTS PASSED!');
