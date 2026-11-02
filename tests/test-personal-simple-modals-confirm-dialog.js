'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Testing Simple Personal To-Do / Expense Modals & Minimal Centered Confirm Dialog ===\n');

const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const dashboardJs = read('public/js/dashboard.js');
const apiJs = read('public/js/api.js');
const calendarJs = read('public/js/calendar.js');
const notebookHtml = read('public/notebook.html');

// 1. Personal To-Do / Expense modals are simple (no notebook editor)
assert(dashboardJs.includes("contentGroup.style.display = personalSubTab === 'NOTE' ? 'block' : 'none'"),
  'Note Canvas group must be hidden for To-Do and Expense modals');
assert(dashboardJs.includes("modalToolbar.innerHTML = ''") && dashboardJs.includes("personalSubTab === 'NOTE'"),
  'Rich-text toolbar must only render for NOTE items');
assert(dashboardJs.includes("personalSubTab === 'NOTE' ? (document.getElementById('personalItemContent')"),
  'To-Do / Expense saves must not send editor content');
assert(dashboardJs.includes('Please enter an amount greater than 0.'), 'Expense requires a valid amount');
console.log('  ✅ Log Expense / Add To-Do modals are simple forms (no notebook editor)');

// 2. Minimal centered confirm dialog replaces native confirm()
assert(apiJs.includes('window.gsConfirm') && apiJs.includes('gs-confirm-overlay') && apiJs.includes("role', 'alertdialog'"),
  'api.js must define the accessible centered gsConfirm dialog');
assert(apiJs.includes("e.key === 'Escape'"), 'gsConfirm must close on Escape');
[['dashboard.js', dashboardJs], ['calendar.js', calendarJs], ['notebook.html', notebookHtml]].forEach(([name, src]) => {
  assert(!/[^.\w]confirm\(/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')) && !src.includes('window.confirm('),
    `${name} must not use native confirm()`);
  assert(src.includes('gsConfirm('), `${name} must use gsConfirm`);
});
console.log('  ✅ Yes/No decisions use the minimal centered gsConfirm popup');

console.log('\n🎉 ALL PERSONAL SIMPLE MODALS & CONFIRM DIALOG TESTS PASSED!\n');

