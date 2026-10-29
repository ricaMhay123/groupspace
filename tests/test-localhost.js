/**
 * GroupSpace — Comprehensive Localhost & Pre-Push Verification Suite
 *
 * Runs a complete test cycle on localhost before pushing to git:
 * 1. Boots Express backend server on localhost (ephemeral or configured test port)
 * 2. Probes API Health, Neon Database connectivity, and REST endpoints
 * 3. Probes frontend static asset delivery (HTML, CSS, JS)
 * 4. Executes all feature test suites (Notebook, Tasks, Mobile, Co-Leader, Theme Harmony)
 * 5. Verifies Impeccable Design Quality & ensures 0 UI anti-patterns
 * 6. Cleanly terminates the test server and prints pre-push status summary
 */

'use strict';

const path = require('path');
const { execSync } = require('child_process');
const assert = require('assert');

console.log('\n================================================================');
console.log('🧪 GROUPSPACE LOCALHOST & PRE-PUSH VERIFICATION SUITE');
console.log('================================================================\n');

let serverInstance = null;
let testPassed = 0;
let testFailed = 0;

function pass(name, detail = '') {
  testPassed++;
  console.log(`  ✅ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, error) {
  testFailed++;
  console.error(`  ❌ [FAIL] ${name}: ${error.message || error}`);
}

async function runLocalhostTests() {
  const startTime = Date.now();

  try {
    // ── STEP 1: Environment & Dependency Check ──
    console.log('📦 1. Verifying Environment & Configuration:');
    try {
      require('dotenv').config();
      assert(process.version, 'Node.js runtime active');
      pass('Node.js Environment', process.version);
    } catch (err) { fail('Node.js Environment', err); }

    try {
      const hasDbUrl = Boolean(process.env.DATABASE_URL);
      if (hasDbUrl) {
        pass('Database URL configured in environment', 'Neon PostgreSQL');
      } else {
        console.log('  ⚠️ [WARN] DATABASE_URL unset — running in local mock fallback mode.');
      }
    } catch (err) { fail('Database Configuration', err); }

    // ── STEP 2: Boot Local Express Server on Localhost ──
    console.log('\n🌐 2. Starting Localhost Express Server:');
    const app = require('../src/app');
    const port = await new Promise((resolve, reject) => {
      serverInstance = app.listen(0, '127.0.0.1', () => {
        const assignedPort = serverInstance.address().port;
        pass('Localhost Server Bound', `http://127.0.0.1:${assignedPort}`);
        resolve(assignedPort);
      });
      serverInstance.on('error', reject);
    });

    const baseUrl = `http://127.0.0.1:${port}`;

    // ── STEP 3: Probe Backend Health & API Endpoints ──
    console.log('\n🔌 3. Probing Backend & API Endpoints:');
    
    // Test Health
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200, 'Health endpoint must return 200 OK');
      const body = await res.json();
      assert(body.status === 'online', 'Health status must be online');
      pass('GET /api/health', `status: ${body.status}, database: ${body.database}`);
    } catch (err) { fail('GET /api/health', err); }

    // Test API 404 handler
    try {
      const res = await fetch(`${baseUrl}/api/nonexistent-route-for-testing`);
      assert.strictEqual(res.status, 404, 'Unknown API route must return 404');
      const body = await res.json();
      assert(body.success === false, '404 handler must return success: false JSON');
      pass('API 404 Handler', 'Correctly intercepts invalid API requests');
    } catch (err) { fail('API 404 Handler', err); }

    // Test Auth Guard (Protected Endpoint without Token)
    try {
      const res = await fetch(`${baseUrl}/api/user/personal-feed`);
      assert.strictEqual(res.status, 401, 'Protected feed must return 401 without JWT');
      pass('Auth Middleware Guard', 'Rejected unauthenticated request with 401 Unauthorized');
    } catch (err) { fail('Auth Middleware Guard', err); }

    // Test Auth Input Validation (Login with missing fields)
    try {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert(res.status === 400 || res.status === 401, 'Login without credentials must fail safely');
      pass('Auth Validation', 'Rejects empty credentials with appropriate error status');
    } catch (err) { fail('Auth Validation', err); }

    // ── STEP 4: Probe Frontend Static Asset Delivery ──
    console.log('\n📄 4. Probing Frontend Static Asset Delivery:');
    const staticFiles = [
      { path: '/', label: 'Landing Page (index.html)', expected: '<title>' },
      { path: '/dashboard.html', label: 'Main App Dashboard', expected: 'dashboard-layout' },
      { path: '/notebook.html', label: 'Collaborative Notebook', expected: 'nbMainToolbar' },
      { path: '/css/style.css', label: 'Main CSS Stylesheet', expected: ':root' },
      { path: '/js/dashboard.js', label: 'Dashboard Controller Script', expected: 'switchTab' },
      { path: '/js/notebook.js', label: 'Notebook Client Module', expected: 'loadNotebookPages' }
    ];

    for (const item of staticFiles) {
      try {
        const res = await fetch(`${baseUrl}${item.path}`);
        assert.strictEqual(res.status, 200, `${item.label} must return 200 OK`);
        const text = await res.text();
        assert(text.includes(item.expected), `${item.label} must contain expected content (${item.expected})`);
        pass(`Static Asset: ${item.path}`, `${item.label} (Length: ${text.length} bytes)`);
      } catch (err) {
        fail(`Static Asset: ${item.path}`, err);
      }
    }

    // ── STEP 5: Run Existing Feature Test Suites ──
    console.log('\n🧪 5. Running Feature & Regression Test Suites:');
    const testSuites = [
      { script: 'tests/test-strict-tab-isolation.js', name: 'Strict Notebook Tab Isolation' },
      { script: 'tests/test-followup-and-theme-harmony.js', name: 'Follow-Up Button & Dark/Light Mode Harmony' },
      { script: 'tests/test-word-toolbar-suite.js', name: 'MS Word Style Rich Text & Flowchart Suite' },
      { script: 'tests/test-mobile-responsive.js', name: 'Mobile Responsive & Navigation Drawer' },
      { script: 'tests/test-notebook-word-personal.js', name: 'Personal Notebook & Privacy Isolation' },
      { script: 'tests/test-coleader-requests.js', name: 'Co-Leader Role & Member Leadership Workflow' },
      { script: 'tests/test-expense-net-split.js', name: 'Expense Ledger & Net Split Plan' }
    ];

    for (const suite of testSuites) {
      try {
        execSync(`node ${suite.script}`, { stdio: 'pipe', encoding: 'utf8' });
        pass(suite.name, suite.script);
      } catch (err) {
        fail(suite.name, new Error(err.stdout || err.stderr || err.message));
      }
    }

    // ── STEP 6: Run Impeccable Design Quality Detector ──
    console.log('\n🎨 6. Running Impeccable Design Quality Detector:');
    try {
      const detectCmd = process.platform === 'win32'
        ? '.agents\\skills\\impeccable\\scripts\\impeccable.cmd detect public\\dashboard.html public\\css\\style.css --no-advisory'
        : '.agents/skills/impeccable/scripts/impeccable detect public/dashboard.html public/css/style.css --no-advisory';
      
      execSync(detectCmd, { stdio: 'pipe', encoding: 'utf8' });
      pass('Impeccable Design Quality', '0 anti-patterns found (WCAG AA & Craft Floor compliant)');
    } catch (err) {
      fail('Impeccable Design Quality', new Error(err.stdout || err.stderr || err.message));
    }

  } catch (globalErr) {
    console.error('\n💥 Unexpected suite error:', globalErr);
    testFailed++;
  } finally {
    // Gracefully shut down test server
    if (serverInstance) {
      serverInstance.close(() => {
        console.log('\n🛑 Local test server gracefully stopped.');
      });
    }

    // ── STEP 7: Print Summary ──
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n================================================================');
    console.log(`📊 PRE-PUSH LOCALHOST TEST RESULTS (${elapsed}s)`);
    console.log(`   Passed: ${testPassed} | Failed: ${testFailed}`);
    console.log('================================================================');

    if (testFailed === 0) {
      console.log('🎉 ALL LOCALHOST TESTS PASSED! Ready to commit and push to git.\n');
      process.exit(0);
    } else {
      console.error(`❌ ${testFailed} test(s) failed. Please resolve before pushing to git.\n`);
      process.exit(1);
    }
  }
}

runLocalhostTests();
