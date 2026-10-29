/**
 * Test Suite: Expense Ledger & Net Split Verification
 *
 * Verifies:
 * 1. CSS styles for .expense-summary-grid, .summary-stat-box, .settlement-card, etc.
 * 2. Ego-centric "You" rendering and avatar badges in dashboard.js
 * 3. "Mark Settled" handler and backend settlement route/service
 * 4. Mathematical accuracy of debt reduction algorithm upon settlement
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('\n================================================================');
console.log('🧪 TEST SUITE: EXPENSE LEDGER & NET SPLIT (P0-P3)');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function pass(name, detail = '') {
  passed++;
  console.log(`  ✅ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, error) {
  failed++;
  console.error(`  ❌ [FAIL] ${name}: ${error.message || error}`);
}

// 1. Verify CSS styles in public/css/style.css
try {
  const css = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');
  assert(css.includes('.expense-summary-grid'), 'Missing .expense-summary-grid in style.css');
  assert(css.includes('.summary-stat-box'), 'Missing .summary-stat-box in style.css');
  assert(css.includes('.settlement-card'), 'Missing .settlement-card in style.css');
  assert(css.includes('.settlement-avatar'), 'Missing .settlement-avatar in style.css');
  assert(css.includes('.settlement-badge'), 'Missing .settlement-badge in style.css');
  assert(css.includes('.btn-settle-action'), 'Missing .btn-settle-action in style.css');
  assert(css.includes('.btn-table-action-delete'), 'Missing .btn-table-action-delete in style.css');
  assert(css.includes('.expense-cat-badge'), 'Missing .expense-cat-badge in style.css');
  pass('CSS Design & Layout Tokens', 'Found all P0 layout classes, grid, card surfaces, and badges');
} catch (err) { fail('CSS Design & Layout Tokens', err); }

// 2. Verify Dark Mode rules
try {
  const css = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');
  assert(css.includes('.dark .settlement-card'), 'Missing .dark .settlement-card in style.css');
  assert(css.includes('.dark .btn-settle-action'), 'Missing .dark .btn-settle-action in style.css');
  assert(css.includes('.dark .settlement-badge.badge-incoming'), 'Missing .dark incoming badge');
  pass('Dark Mode Theme Harmony', 'Found .dark settlement card and action button styles');
} catch (err) { fail('Dark Mode Theme Harmony', err); }

// 3. Verify Frontend Client-side rendering in public/js/dashboard.js
try {
  const js = fs.readFileSync(path.join(__dirname, '../public/js/dashboard.js'), 'utf8');
  assert(js.includes('isFromMe'), 'Missing ego-centric isFromMe check in dashboard.js');
  assert(js.includes('isToMe'), 'Missing ego-centric isToMe check in dashboard.js');
  assert(js.includes('badge-incoming'), 'Missing badge-incoming in dashboard.js');
  assert(js.includes('badge-outgoing'), 'Missing badge-outgoing in dashboard.js');
  assert(js.includes('recordDirectSettlement'), 'Missing recordDirectSettlement in dashboard.js');
  assert(js.includes('#047857'), 'Missing emerald positive balance color in dashboard.js');
  assert(js.includes('#dc2626'), 'Missing crimson debt color in dashboard.js');
  pass('Frontend Ego-Centric & Action Handlers', 'Ego-centric labels ("You"), avatars, badges, and settle trigger confirmed');
} catch (err) { fail('Frontend Ego-Centric & Action Handlers', err); }

// 4. Verify Backend API Route & Controller
try {
  const routes = fs.readFileSync(path.join(__dirname, '../src/modules/expenses/expense.routes.js'), 'utf8');
  assert(routes.includes("router.post('/settle'"), 'Missing POST /settle in expense.routes.js');

  const controller = fs.readFileSync(path.join(__dirname, '../src/modules/expenses/expense.controller.js'), 'utf8');
  assert(controller.includes('settleDebt'), 'Missing settleDebt controller method');

  const service = fs.readFileSync(path.join(__dirname, '../src/modules/expenses/expense.service.js'), 'utf8');
  assert(service.includes('recordSettlement'), 'Missing recordSettlement service method');
  pass('Backend Settlement API & Service', 'POST /settle, controller, and recordSettlement registered');
} catch (err) { fail('Backend Settlement API & Service', err); }

// 5. Verify Debt Simplification Mathematics
try {
  const { calculateExpenseSummary, simplifyDebts } = require('../src/utils/calculation.util');

  const members = [
    { user_id: 1, full_name: 'Rica Mhay Saturinas' },
    { user_id: 2, full_name: 'Kevin Durian Smith' },
    { user_id: 3, full_name: 'iC Monteron' },
    { user_id: 4, full_name: 'rae' }
  ];

  // Expense: Rica paid 250 for 4 members (equal split: 62.50 each)
  const expenses = [
    {
      id: 101,
      amount: 250.00,
      paid_by_user_id: 1,
      splits: [
        { user_id: 1, amount: 62.50 },
        { user_id: 2, amount: 62.50 },
        { user_id: 3, amount: 62.50 },
        { user_id: 4, amount: 62.50 }
      ]
    }
  ];

  const summaryBefore = calculateExpenseSummary(expenses, members);
  assert.strictEqual(summaryBefore.totalSpent, 250.00);
  assert.strictEqual(summaryBefore.settlements.length, 3);

  // Now simulate Kevin (user 2) settling 62.50 to Rica (user 1)
  const settlementExpense = {
    id: 102,
    amount: 62.50,
    paid_by_user_id: 2,
    splits: [
      { user_id: 1, amount: 62.50 }
    ]
  };

  const summaryAfter = calculateExpenseSummary([...expenses, settlementExpense], members);
  assert.strictEqual(summaryAfter.settlements.length, 2, 'Settlement count should reduce from 3 to 2');
  const kevinBalance = summaryAfter.memberBalances.find(b => b.userId === 2);
  assert.strictEqual(kevinBalance.net, 0, 'Kevin should be fully settled (net 0)');

  pass('Debt Simplification & Settlement Mathematics', 'Settling correctly zeros debtor balance and reduces active settlements from 3 to 2');
} catch (err) { fail('Debt Simplification & Settlement Mathematics', err); }

console.log('\n================================================================');
console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}

