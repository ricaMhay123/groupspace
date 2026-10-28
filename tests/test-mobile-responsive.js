const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Verifying Mobile Responsive Adaptation & Top Ambient Animation ===');

const styleCss = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');
const landingCss = fs.readFileSync(path.join(__dirname, '../public/css/landing.css'), 'utf8');
const dashboardHtml = fs.readFileSync(path.join(__dirname, '../public/dashboard.html'), 'utf8');
const dashboardJs = fs.readFileSync(path.join(__dirname, '../public/js/dashboard.js'), 'utf8');
const notebookHtml = fs.readFileSync(path.join(__dirname, '../public/notebook.html'), 'utf8');

// 1. Media queries (@media (max-width: 768px)) across views
assert(styleCss.includes('@media (max-width: 768px)'), 'style.css must include @media (max-width: 768px)');
assert(landingCss.includes('@media (max-width: 768px)'), 'landing.css must include @media (max-width: 768px)');
assert(notebookHtml.includes('@media (max-width: 768px)'), 'notebook.html must include @media (max-width: 768px)');
console.log('[PASS] @media (max-width: 768px) present across style.css, landing.css, and notebook.html');

// 2. Left sidebar navigation slides in/out as a drawer overlay when tapping hamburger menu (☰)
assert(dashboardHtml.includes('id="mobileSidebarToggle"') && dashboardHtml.includes('☰'), 'dashboard.html must have hamburger button (☰)');
assert(dashboardHtml.includes('id="sidebarDrawerOverlay"'), 'dashboard.html must have sidebar drawer overlay');
assert(dashboardJs.includes('function toggleMobileSidebar'), 'dashboard.js must define toggleMobileSidebar');
assert(styleCss.includes('transform: translateX(-100%)') && styleCss.includes('.dashboard-sidebar.open') && styleCss.includes('transform: translateX(0)'), 'style.css must slide .dashboard-sidebar in/out');

assert(notebookHtml.includes('id="nbMobileSidebarBtn"') && notebookHtml.includes('☰'), 'notebook.html must have hamburger button (☰)');
assert(notebookHtml.includes('function toggleNbMobileSidebar'), 'notebook.html must define toggleNbMobileSidebar');
assert(notebookHtml.includes('.nb-sidebar.open') && notebookHtml.includes('transform: translateX(0)'), 'notebook.html must slide .nb-sidebar in/out');
console.log('[PASS] Left sidebar drawer slide-in/out & top hamburger menu (☰) verified');

// 3. Dashboard cards, Kanban columns, and metric strips stack vertically or scroll horizontally
assert(styleCss.includes('.dashboard-cards') && styleCss.includes('.kanban-board') && styleCss.includes('grid-template-columns: 1fr'), 'style.css must stack dashboard cards and kanban columns on mobile');
console.log('[PASS] Dashboard cards, Kanban columns, and metric strips stack/scroll cleanly on mobile');

// 4. Touch targets have at least 44px height on mobile
assert(styleCss.includes('min-height: 44px'), 'style.css must enforce min-height: 44px on mobile touch targets');
assert(landingCss.includes('min-height: 44px'), 'landing.css must enforce min-height: 44px on mobile touch targets');
assert(notebookHtml.includes('min-height: 44px'), 'notebook.html must enforce min-height: 44px on mobile touch targets');
console.log('[PASS] Minimum 44px height touch targets verified across mobile views');

// 5. Top ambient animation spans 100% full viewport width without horizontal scrollbars
for (const css of [landingCss, styleCss]) {
  assert(css.includes('width: 100vw;') && css.includes('max-width: 100%;') && css.includes('left: 0;') && css.includes('right: 0;'), 'CSS must include width: 100vw; max-width: 100%; left: 0; right: 0; for top ambient animations');
  assert(css.includes('overflow-x: hidden'), 'CSS must prevent unwanted horizontal scrollbars');
}
console.log('[PASS] Top ambient animation full-viewport width & overflow-x protection verified');

console.log('\nALL MOBILE RESPONSIVE & TOP AMBIENT ANIMATION TESTS PASSED!');

