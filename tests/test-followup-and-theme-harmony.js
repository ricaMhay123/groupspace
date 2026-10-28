'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Testing Phase 1: Follow-Up Button Repair & Dark/Light Mode UI Harmony ===');

const tasksJs = fs.readFileSync(path.join(__dirname, '../public/js/tasks.js'), 'utf8');
const dashboardJs = fs.readFileSync(path.join(__dirname, '../public/js/dashboard.js'), 'utf8');
const notebookJs = fs.readFileSync(path.join(__dirname, '../public/js/notebook.js'), 'utf8');
const notebookHtml = fs.readFileSync(path.join(__dirname, '../public/notebook.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');
const taskRoutes = fs.readFileSync(path.join(__dirname, '../src/modules/tasks/task.routes.js'), 'utf8');
const taskController = fs.readFileSync(path.join(__dirname, '../src/modules/tasks/task.controller.js'), 'utf8');

// 1. Verify Follow-Up Button & 2-second Visual Feedback
assert(tasksJs.includes("btn.textContent = 'Follow-Up Sent ✓'"), 'Follow-Up button must immediately set label to "Follow-Up Sent ✓"');
assert(tasksJs.includes('2000'), 'Follow-Up button must revert after 2000ms (2 seconds)');
assert(tasksJs.includes("follow-up-sent"), 'Follow-Up button must toggle .follow-up-sent visual class');
assert(tasksJs.includes('/api/tasks/${taskId}/follow-up'), 'Follow-Up must dispatch ping to /api/tasks/:taskId/follow-up');
assert(tasksJs.includes('window.refreshAppFeed()'), 'Follow-Up must refresh the Personal Feed drawer without reloading the page');
console.log('✓ 1. Follow-Up button 2-second "Follow-Up Sent ✓" visual feedback & Personal Feed ping verified');

// 2. Verify Explicit e.preventDefault() across action button listeners
assert(tasksJs.includes('event.preventDefault()') && tasksJs.includes('e.preventDefault()'), 'tasks.js action buttons must call e.preventDefault()');
assert(dashboardJs.includes('function handlePrimaryAction(e)') && dashboardJs.includes('e.preventDefault()'), 'dashboard.js action handlers must call e.preventDefault()');
assert(taskRoutes.includes("router.patch('/:taskId/flag'") && taskRoutes.includes("router.patch('/:taskId/unflag'"), 'task.routes.js must support PATCH flag/unflag');
assert(taskController.includes("rawDecision === 'accepted' ? 'accept'"), 'task.controller.js must accept both accept/accepted and decline/declined');
console.log('✓ 2. Action button e.preventDefault() and task route compatibility verified');

// 3. Verify Dark & Light (Normal) Mode UI Harmony in CSS & Notebook
assert(styleCss.includes('--background: #f8fafc;') && styleCss.includes('--card: #ffffff;'), 'Light mode (:root) must use #f8fafc / #ffffff containers');
assert(styleCss.includes('--foreground: #0f172a;') && styleCss.includes('--text: #0f172a;'), 'Light mode (:root) must use #0f172a dark text');
assert(styleCss.includes('--border: #cbd5e1;'), 'Light mode (:root) must use #cbd5e1 subtle slate borders');
assert(styleCss.includes('--background:       #0f172a;') && styleCss.includes('--foreground:       #ffffff;'), 'Dark mode (.dark) must use #0f172a slate background and #ffffff crisp white text');
assert(notebookHtml.includes('--nb-tb-bg: #f8fafc;') && notebookHtml.includes('--nb-tb-text: #0f172a;'), 'notebook.html Light Mode toolbar variables must use #f8fafc and #0f172a');
assert(notebookHtml.includes('--nb-tb-bg: #0f172a;') && notebookHtml.includes('--nb-tb-text: #ffffff;'), 'notebook.html Dark Mode toolbar variables must use #0f172a and #ffffff');
assert(notebookJs.includes('var(--toolbar-bg, #f8fafc)') && notebookJs.includes('var(--toolbar-text, #0f172a)'), 'notebook.js embedded toolbar must use theme-harmonized CSS variables');
console.log('✓ 3. Light Mode (#0f172a on #ffffff/#f8fafc with #cbd5e1 border) & Dark Mode (#ffffff on #0f172a) UI harmony verified');

console.log('ALL PHASE 1 TESTS PASSED SUCCESSFULLY!');

