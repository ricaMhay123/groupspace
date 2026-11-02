/**
 * Test Suite: Expense Split Types & Partial Debt Settlements Overhaul
 *
 * Verifies:
 * 1. Split type constants (EQUAL, SUBSET, EXACT, PERCENT, SHARES)
 * 2. HTML elements for split breakdown & Settle Up partial payment modal
 * 3. CSS styling for split member breakdown and quick fraction chips
 * 4. JavaScript controller handlers for real-time split calculations and modal management
 * 5. Mathematical accuracy of multi-stage partial debt settlements (1/4, 1/2, full)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('\n================================================================');
console.log('🧪 TEST SUITE: EXPENSE SPLIT TYPES & PARTIAL SETTLEMENTS');
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

// 1. Verify Split Type Constants
try {
  const { EXPENSE_SPLIT_TYPE } = require('../src/config/constants');
  assert(EXPENSE_SPLIT_TYPE.EQUAL, 'Missing EQUAL split type');
  assert(EXPENSE_SPLIT_TYPE.SUBSET, 'Missing SUBSET split type');
  assert(EXPENSE_SPLIT_TYPE.EXACT, 'Missing EXACT split type');
  assert(EXPENSE_SPLIT_TYPE.PERCENT, 'Missing PERCENT split type');
  assert(EXPENSE_SPLIT_TYPE.SHARES, 'Missing SHARES split type');
  pass('Expense Split Constants', 'All 5 split types registered in constants.js');
} catch (err) { fail('Expense Split Constants', err); }

// 2. Verify HTML UI Components in dashboard.html
try {
  const html = fs.readFileSync(path.join(__dirname, '../public/dashboard.html'), 'utf8');

  // Create Expense Modal split options
  assert(html.includes('value="EQUAL"'), 'Missing EQUAL in dashboard.html');
  assert(html.includes('value="SUBSET"'), 'Missing SUBSET in dashboard.html');
  assert(html.includes('value="EXACT"'), 'Missing EXACT in dashboard.html');
  assert(html.includes('value="PERCENT"'), 'Missing PERCENT in dashboard.html');
  assert(html.includes('value="SHARES"'), 'Missing SHARES in dashboard.html');
  assert(html.includes('id="expSplitBreakdownContainer"'), 'Missing #expSplitBreakdownContainer');
  assert(html.includes('id="expSplitSummaryBadge"'), 'Missing #expSplitSummaryBadge');

  // Settle Up Modal elements
  assert(html.includes('id="settleUpModal"'), 'Missing #settleUpModal in dashboard.html');
  assert(html.includes('id="settlePayerToRecipient"'), 'Missing #settlePayerToRecipient');
  assert(html.includes('id="settleTotalDebtDisplay"'), 'Missing #settleTotalDebtDisplay');
  assert(html.includes('class="settle-fraction-chips"'), 'Missing .settle-fraction-chips');
  assert(html.includes('applySettleFraction(0.125'), 'Missing 1/8 chip in settleUpModal');
  assert(html.includes('applySettleFraction(0.25'), 'Missing 1/4 chip in settleUpModal');
  assert(html.includes('applySettleFraction(0.5'), 'Missing 1/2 chip in settleUpModal');
  assert(html.includes('applySettleFraction(0.75'), 'Missing 3/4 chip in settleUpModal');
  assert(html.includes('id="settleAmountInput"'), 'Missing #settleAmountInput');
  assert(html.includes('id="settleRemainingBalanceDisplay"'), 'Missing #settleRemainingBalanceDisplay');
  assert(html.includes('id="settleProgressBar"'), 'Missing #settleProgressBar');
  assert(html.includes('id="settleNotesInput"'), 'Missing #settleNotesInput');

  pass('Dashboard HTML Modals & Affordances', 'All split options, breakdown containers, and Settle Up modal verified');
} catch (err) { fail('Dashboard HTML Modals & Affordances', err); }

// 3. Verify CSS Design Tokens & Classes
try {
  const css = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');
  assert(css.includes('.split-member-row'), 'Missing .split-member-row in style.css');
  assert(css.includes('.split-member-avatar'), 'Missing .split-member-avatar in style.css');
  assert(css.includes('.split-member-input'), 'Missing .split-member-input in style.css');
  assert(css.includes('.settle-chip'), 'Missing .settle-chip in style.css');
  assert(css.includes('.settle-chip.active'), 'Missing .settle-chip.active in style.css');
  pass('CSS Design Tokens & Styles', 'Found split member rows, inputs, and fraction chip styles');
} catch (err) { fail('CSS Design Tokens & Styles', err); }

// 4. Verify JavaScript Handlers & Controller Logic
try {
  const js = fs.readFileSync(path.join(__dirname, '../public/js/dashboard.js'), 'utf8');
  assert(js.includes('renderExpenseSplitBreakdown'), 'Missing renderExpenseSplitBreakdown in dashboard.js');
  assert(js.includes('updateSubsetSplitTotal'), 'Missing updateSubsetSplitTotal in dashboard.js');
  assert(js.includes('updateExactSplitTotal'), 'Missing updateExactSplitTotal in dashboard.js');
  assert(js.includes('updatePercentSplitTotal'), 'Missing updatePercentSplitTotal in dashboard.js');
  assert(js.includes('updateSharesSplitTotal'), 'Missing updateSharesSplitTotal in dashboard.js');
  assert(js.includes('openSettleUpModal'), 'Missing openSettleUpModal in dashboard.js');
  assert(js.includes('applySettleFraction'), 'Missing applySettleFraction in dashboard.js');
  assert(js.includes('handleSettleAmountInput'), 'Missing handleSettleAmountInput in dashboard.js');
  assert(js.includes('handleConfirmSettlePayment'), 'Missing handleConfirmSettlePayment in dashboard.js');
  assert(js.includes('recordDirectSettlement'), 'Missing recordDirectSettlement in dashboard.js');
  pass('JavaScript Split & Settle Controllers', 'Dynamic split breakdown and partial settlement handlers confirmed');
} catch (err) { fail('JavaScript Split & Settle Controllers', err); }

// 5. Mathematical Verification: Multi-Stage Partial Debt Settlements
try {
  const { calculateExpenseSummary } = require('../src/utils/calculation.util');

  const members = [
    { user_id: 1, full_name: 'Rica Mhay Saturinas' },
    { user_id: 2, full_name: 'Kevin Durian Smith' }
  ];

  // Step A: Rica paid 800 for project equipment for Kevin (Kevin owes Rica 800)
  const initialExpense = [
    {
      id: 201,
      amount: 800.00,
      paid_by_user_id: 1,
      splits: [
        { user_id: 2, amount: 800.00 }
      ]
    }
  ];

  const summaryInitial = calculateExpenseSummary(initialExpense, members);
  assert.strictEqual(summaryInitial.settlements.length, 1);
  assert.strictEqual(summaryInitial.settlements[0].fromUserId, 2);
  assert.strictEqual(summaryInitial.settlements[0].toUserId, 1);
  assert.strictEqual(summaryInitial.settlements[0].amount, 800.00);

  // Step B: Kevin pays 1/4 (200.00) partial settlement
  const payment1 = {
    id: 202,
    amount: 200.00,
    paid_by_user_id: 2,
    splits: [
      { user_id: 1, amount: 200.00 }
    ]
  };

  const summaryAfterPay1 = calculateExpenseSummary([...initialExpense, payment1], members);
  assert.strictEqual(summaryAfterPay1.settlements.length, 1);
  assert.strictEqual(summaryAfterPay1.settlements[0].amount, 600.00, 'Remaining debt after 1/4 payment should be 600.00');

  // Step C: Kevin pays 1/2 (400.00) partial settlement
  const payment2 = {
    id: 203,
    amount: 400.00,
    paid_by_user_id: 2,
    splits: [
      { user_id: 1, amount: 400.00 }
    ]
  };

  const summaryAfterPay2 = calculateExpenseSummary([...initialExpense, payment1, payment2], members);
  assert.strictEqual(summaryAfterPay2.settlements.length, 1);
  assert.strictEqual(summaryAfterPay2.settlements[0].amount, 200.00, 'Remaining debt after second payment should be 200.00');

  // Step D: Kevin pays remaining 200.00
  const payment3 = {
    id: 204,
    amount: 200.00,
    paid_by_user_id: 2,
    splits: [
      { user_id: 1, amount: 200.00 }
    ]
  };

  const summaryFinal = calculateExpenseSummary([...initialExpense, payment1, payment2, payment3], members);
  assert.strictEqual(summaryFinal.settlements.length, 0, 'All balances should be fully settled (0 active settlements)');

  pass('Mathematical Accuracy (Installments)', 'Multi-stage partial settlements (1/4 -> 1/2 -> full) reduce debt accurately to 0');
} catch (err) { fail('Mathematical Accuracy (Installments)', err); }

console.log('\n================================================================');
console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}
