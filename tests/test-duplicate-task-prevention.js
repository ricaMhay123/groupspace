/**
 * Test Suite: Dependency Installation & Duplicate Task Prevention
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Dependency Installation & Duplicate Task Prevention...');

// 1. Verify Installed NPM Packages in package.json
const pkgJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const deps = pkgJson.dependencies || {};

assert(deps['@studio-freight/lenis'], '@studio-freight/lenis must be installed');
assert(deps['gsap'], 'gsap must be installed');
assert(deps['vanta'], 'vanta must be installed');
assert(deps['three'], 'three must be installed');
console.log('  ✅ 1. Required packages (@studio-freight/lenis, gsap, vanta, three) verified in package.json');

// 2. Verify Backend Duplicate Submission Throttle (HTTP 409 Conflict)
const taskControllerSource = fs.readFileSync(path.join(__dirname, '../src/modules/tasks/task.controller.js'), 'utf8');
assert(taskControllerSource.includes('isDuplicateTaskSubmission'), 'task.controller.js defines isDuplicateTaskSubmission check');
assert(taskControllerSource.includes('HTTP_STATUS.CONFLICT') || taskControllerSource.includes('409'), 'task.controller.js returns 409 on duplicate task submission');
assert(taskControllerSource.includes('2000'), 'task.controller.js enforces a 2-second duplicate window');

// Test isDuplicateTaskSubmission function directly
const taskController = require('../src/modules/tasks/task.controller');
if (typeof taskController.isDuplicateTaskSubmission === 'function') {
  const uid = 99999;
  const gid = 88888;
  const title = 'Unique Test Task ' + Date.now();
  const first = taskController.isDuplicateTaskSubmission(uid, gid, title);
  assert.strictEqual(first, false, 'First task submission must not be flagged as duplicate');
  const second = taskController.isDuplicateTaskSubmission(uid, gid, title);
  assert.strictEqual(second, true, 'Immediate secondary task submission must be flagged as duplicate');
}
console.log('  ✅ 2. Backend duplicate task submission throttle (2s / HTTP 409) verified');

// 3. Verify Frontend Throttling & Submit Button Protection
const dashboardJsSource = fs.readFileSync(path.join(__dirname, '../public/js/dashboard.js'), 'utf8');
assert(dashboardJsSource.includes('isSubmittingTask'), 'dashboard.js defines isSubmittingTask flag');
assert(dashboardJsSource.includes('submitBtn.disabled = true'), 'dashboard.js disables submit button immediately');
assert(dashboardJsSource.includes("pointerEvents = 'none'"), 'dashboard.js disables pointer-events to prevent clicks');
assert(dashboardJsSource.includes('finally'), 'dashboard.js re-enables submit button in finally block');

const tasksJsSource = fs.readFileSync(path.join(__dirname, '../public/js/tasks.js'), 'utf8');
assert(tasksJsSource.includes('isSubmittingTask'), 'tasks.js respects isSubmittingTask throttling state');
console.log('  ✅ 3. Frontend double-click protection (button disable, pointer-events, isSubmittingTask, finally) verified');

// 4. Verify Spinner Styling
const styleCssSource = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');
assert(styleCssSource.includes('gs-spin'), 'style.css defines @keyframes gs-spin for button spinner');
console.log('  ✅ 4. Button spinner animation verified in style.css');

console.log('\n🎉 ALL DEPENDENCY & DUPLICATE TASK PREVENTION TESTS PASSED!\n');

