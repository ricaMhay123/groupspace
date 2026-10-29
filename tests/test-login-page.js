const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTests() {
  console.log('🧪 Testing GroupSpace Login Page Centered Redesign & Polish...');
  let passed = 0;
  let failed = 0;

  function test(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const loginPath = path.join(__dirname, '..', 'public', 'login.html');
  const content = fs.readFileSync(loginPath, 'utf8');

  // Test 1: Centered container layout
  test(
    content.includes('class="login-center-wrap"') && content.includes('max-width: 440px'),
    'Login layout uses centered single-column container (max-width: 440px)'
  );

  // Test 2: Elimination of cluttered preview mockup column
  test(
    !content.includes('login-preview-col') && !content.includes('preview-dashboard-card'),
    'Cluttered macOS mockup card and inert preview column eliminated'
  );

  // Test 3: Balanced header typography
  test(
    content.includes('<h1 class="login-hero-title" id="loginHeading">Welcome back</h1>') &&
    content.includes('class="login-hero-sub"'),
    'Page header stack is balanced and accessible with semantic <h1>'
  );

  // Test 4: Accessible password toggle touch target (44px) and keyboard reachable
  test(
    content.includes('class="pwd-toggle-btn-custom"') &&
    !content.includes('id="toggleLoginPassword"\n                  class="pwd-toggle-btn-custom"\n                  tabindex="-1"') &&
    content.includes('width: 44px;') &&
    content.includes('height: 44px;'),
    'Password toggle button has accessible 44px touch target and is keyboard navigable'
  );

  // Test 5: Accessible 44px input height
  test(
    content.includes('.form-control-custom') && content.includes('height: 44px;'),
    'Form inputs meet standard 44px touch and ergonomic click height'
  );

  // Test 6: Autofocus on email input for power users
  test(
    content.includes('id="email"') && content.includes('autofocus'),
    'Email input has autofocus for immediate keyboard readiness'
  );

  // Test 7: Absence of sub-11px micro-text
  test(
    !content.includes('0.58rem') && !content.includes('0.68rem') && !content.includes('font-size: 10px'),
    'Eliminates all sub-11px micro-text from login interface'
  );

  // Test 8: Semantic heading outline for modal (no skipped headings)
  test(
    content.includes('<h2 class="modal-title fw-bold fs-5" id="resetPasswordLabel"') &&
    !content.includes('<h5 class="modal-title fw-bold" id="resetPasswordLabel"'),
    'Modal title upgraded to <h2> ensuring continuous document heading outline'
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();

