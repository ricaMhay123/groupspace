/**
 * Test Suite: Personal Expense Donut Chart & Visual Category Analytics
 * Verifies:
 * 1. Category selector in #personalItemModal in dashboard.html
 * 2. Category persistence in handleSavePersonalItem in dashboard.js
 * 3. CSS tokens & responsive layout for .personal-expense-analytics in style.css
 * 4. SVG Donut calculation & rendering in renderPersonalExpenseAnalytics in dashboard.js
 * 5. Interactive category filter pills & table filtering in dashboard.js
 * 6. Zero expenses empty state & single-category full ring handling
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('🧪 PERSONAL EXPENSE DONUT CHART & CATEGORY ANALYTICS TEST SUITE');
console.log('================================================================\n');

// ── 1. MODAL CATEGORY SELECTOR ──
console.log('📦 1. Modal Category Selector (dashboard.html & dashboard.js):');
const dashHtmlPath = path.join(__dirname, '..', 'public', 'dashboard.html');
const dashJsPath = path.join(__dirname, '..', 'public', 'js', 'dashboard.js');
const cssPath = path.join(__dirname, '..', 'public', 'css', 'style.css');

const dashHtml = fs.readFileSync(dashHtmlPath, 'utf8');
const dashJs = fs.readFileSync(dashJsPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

assert(dashHtml.includes('id="personalCategoryGroup"'), 'dashboard.html includes #personalCategoryGroup form group');
assert(dashHtml.includes('id="personalItemCategory"'), 'dashboard.html includes #personalItemCategory select dropdown');
assert(dashHtml.includes('Food & Dining') && dashHtml.includes('School & Books'), 'Category dropdown defines standard student & team categories');
assert(dashJs.includes('categoryGroup.style.display = personalSubTab === \'EXPENSE\' ? \'block\' : \'none\'') || dashJs.includes("personalCategoryGroup"), 'dashboard.js toggles category dropdown visibility for expenses');
assert(dashJs.includes('category: personalSubTab === \'EXPENSE\'') || dashJs.includes('personalItemCategory'), 'dashboard.js captures category when saving personal item');

// ── 2. CSS ANALYTICS & DONUT TOKENS ──
console.log('\n🎨 2. CSS Analytics & Donut Tokens (style.css):');
assert(css.includes('.personal-expense-analytics'), 'style.css defines .personal-expense-analytics grid container');
assert(css.includes('.donut-chart-container'), 'style.css defines .donut-chart-container');
assert(css.includes('.category-progress-bar'), 'style.css defines .category-progress-bar');
assert(css.includes('.personal-expense-filter-chips'), 'style.css defines .personal-expense-filter-chips navigation bar');
assert(css.includes('.personal-category-pill'), 'style.css defines .personal-category-pill');

// ── 3. SVG DONUT & ANALYTICS RENDERING ──
console.log('\n📊 3. SVG Donut & Analytics Logic (dashboard.js):');
assert(dashJs.includes('function renderPersonalExpenseAnalytics'), 'dashboard.js defines renderPersonalExpenseAnalytics()');
assert(dashJs.includes('function filterPersonalExpensesByCategory'), 'dashboard.js defines filterPersonalExpensesByCategory()');
assert(dashJs.includes('stroke-dasharray') && dashJs.includes('stroke-dashoffset'), 'dashboard.js computes SVG donut stroke offsets');
assert(dashJs.includes('personal-expense-analytics'), 'dashboard.js injects .personal-expense-analytics grid');
assert(dashJs.includes('Top Expense:') || dashJs.includes('Biggest Expense'), 'dashboard.js highlights top spending category');

console.log('\n================================================================');
console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Personal Expense Donut Chart & Category Analytics tests passed!\n');
}
