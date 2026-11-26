'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const wsHtmlPath = path.join(__dirname, '../public/workspaces.html');
const styleCssPath = path.join(__dirname, '../public/css/style.css');

const wsHtml = fs.readFileSync(wsHtmlPath, 'utf8');
const styleCss = fs.readFileSync(styleCssPath, 'utf8');

console.log('=== Testing Workspaces Directory Layout, Paddings & Grouping ===');

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
console.log('PASS: Task 1 header, layout, and padding selectors');
