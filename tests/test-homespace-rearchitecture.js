const fs = require('fs');
const path = require('path');

function runTests() {
  console.log('🧪 Testing Homespace Command Center Re-architecture & Polish...');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const cssPath = path.join(__dirname, '..', 'public', 'css', 'style.css');
  const jsPath = path.join(__dirname, '..', 'public', 'js', 'dashboard.js');
  const htmlPath = path.join(__dirname, '..', 'public', 'dashboard.html');

  const cssContent = fs.readFileSync(cssPath, 'utf8');
  const jsContent = fs.readFileSync(jsPath, 'utf8');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Test 1: Grid layout in CSS
  assert(
    cssContent.includes('.dashboard-grid') &&
    cssContent.includes('grid-template-columns: 1fr 1fr') &&
    cssContent.includes('gap: 20px'),
    '.dashboard-grid uses balanced 2-column layout (1fr 1fr) with 20px gap'
  );

  // Test 2: Elimination of double margin
  assert(
    cssContent.includes('.dashboard-grid .dashboard-panel') &&
    cssContent.includes('margin-bottom: 0'),
    '.dashboard-grid .dashboard-panel sets margin-bottom: 0 to eliminate double-margin'
  );

  // Test 3: KPI stat typography
  assert(
    cssContent.includes('.dashboard-card .stat-number') &&
    cssContent.includes('font-size: 1.65rem') &&
    cssContent.includes('font-variant-numeric: tabular-nums'),
    '.dashboard-card .stat-number scales to 1.65rem with tabular numerals'
  );

  // Test 4: Border-top stripe removal in Homespace
  const leaderHsMatch = jsContent.match(/function renderLeaderHomespace[\s\S]*?^}/m);
  const memberHsMatch = jsContent.match(/function renderMemberHomespace[\s\S]*?^}/m);
  const scratchpadMatch = jsContent.match(/function renderHomespaceScratchpadHtml[\s\S]*?^}/m);

  const hsCode = (leaderHsMatch ? leaderHsMatch[0] : '') + (memberHsMatch ? memberHsMatch[0] : '') + (scratchpadMatch ? scratchpadMatch[0] : '');

  assert(
    !hsCode.includes('border-top:3px solid') && !hsCode.includes('border-top: 3px solid'),
    'Homespace panels eliminate legacy border-top: 3px solid stripes'
  );

  // Test 5: Legibility floor (no font-size:10px in homespace rendering)
  assert(
    !hsCode.includes('font-size:10px') && !hsCode.includes('font-size: 10px'),
    'Homespace satisfies 11px minimum legibility floor (no 10px micro-text)'
  );

  // Test 6: Removal of redundant settings panels from homespace overview
  assert(
    !hsCode.includes('leaderWsNameInput') && !hsCode.includes('saveMemberConstraints'),
    'Redundant workspace settings forms removed from homespace overview (delegated to Settings modal)'
  );

  // Test 7: Standardized 32px avatar sizes in roster
  assert(
    hsCode.includes('width:32px; height:32px;'),
    'Roster avatars standardized to consistent 32px dimensions'
  );

  // Test 8: HTML loading state uses design token
  assert(
    !htmlContent.includes('color:var(--gray);') || htmlContent.includes('color:var(--muted-foreground);'),
    'Dashboard loading state uses semantic tokens'
  );

  // Test 9: Activity feed typography is smaller, simpler, and matches Roster container
  assert(
    cssContent.includes('.activity-item h4') &&
    cssContent.includes('font-size: 13px !important') &&
    cssContent.includes('font-weight: 500 !important'),
    'Activity feed items are refined with 13px font-size and normal 500 weight (no loud headings)'
  );

  // Test 10: Activity icon badge satisfies 11px legibility floor
  const actIconMatch = jsContent.match(/function getActivityIcon[\s\S]*?^}/m);
  const actIconCode = actIconMatch ? actIconMatch[0] : '';
  assert(
    !actIconCode.includes('font-size:10px') && !actIconCode.includes('font-size: 10px'),
    'Activity badges satisfy 11px minimum legibility floor'
  );

  // Test 11: Activity feed uses clean list layout with custom scrollbar
  assert(
    cssContent.includes('.activity-feed::-webkit-scrollbar') &&
    cssContent.includes('.activity-item:last-child'),
    'Activity feed includes sleek scrollbars and divider termination'
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

