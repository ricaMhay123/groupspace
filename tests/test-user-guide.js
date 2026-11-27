const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Verifying User Guide tabs, buttons, and layout polish...\n');

const guideJs = fs.readFileSync(path.join(__dirname, '../public/js/guide.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');

const expectedCategories = [
  'workspaces',
  'tasks',
  'notebook',
  'expenses',
  'discussions',
  'personal'
];
for (const id of expectedCategories) {
  assert(guideJs.includes(`id: '${id}'`), `guide.js defines category '${id}'`);
}
assert(guideJs.includes('role="tab"'), 'guide.js assigns role="tab" on guide buttons');
assert(guideJs.includes('data-guide-tab='), 'guide.js attaches data-guide-tab attribute');
assert(guideJs.includes('window.handleGuideTabKeydown(event)'), 'guide.js wires keyboard navigation on tabs');
assert(guideJs.includes('class="ug-category-meta"'), 'guide.js wraps category heading and summary in .ug-category-meta');
assert(guideJs.includes('modalBody.scrollTop = 0'), 'guide.js resets modal body scroll position on category switch');
console.log('  ✅ 1. guide.js structure, WAI-ARIA tabs, banner meta wrapper, and scroll reset verified');

assert(styleCss.includes('.ug-tabs-strip') && styleCss.includes('flex-wrap: wrap;'), 'style.css wraps .ug-tabs-strip so all 6 tabs stay visible');
assert(styleCss.includes('.ug-tab-btn.active'), 'style.css defines segmented active pill state');
assert(styleCss.includes('.ug-category-banner') && styleCss.includes('flex-wrap: nowrap;'), 'style.css locks desktop banner CTA alignment with flex-wrap: nowrap');
assert(styleCss.includes('.ug-category-meta'), 'style.css defines .ug-category-meta flex shrink-friendly wrapper');
assert(styleCss.includes('.ug-modal-header-actions .modal-close'), 'style.css matches modal header close button size with Full Page link');
assert(styleCss.includes('.ug-card-tag') && styleCss.includes('background: transparent;'), 'style.css renders borderless inline metadata tag above card title');
assert(styleCss.includes('@keyframes ugFadeIn'), 'style.css defines subtle tab fade-in animation');
assert(styleCss.includes('.ug-category-section') && styleCss.includes('prefers-reduced-motion: reduce'), 'style.css guards tab animation under prefers-reduced-motion');
console.log('  ✅ 2. style.css segmented pills, locked CTA, header parity, and clean card tags verified');

for (const file of ['dashboard.html', 'guide.html', 'workspaces.html', 'index.html']) {
  const html = fs.readFileSync(path.join(__dirname, '../public', file), 'utf8');
  assert(html.includes('/css/style.css?v=36.0'), `${file} loads style.css?v=36.0`);
}
console.log('  ✅ 3. HTML stylesheet cache-busters verified (?v=36.0)');

console.log('\n🎉 All User Guide UI polish assertions passed!\n');
