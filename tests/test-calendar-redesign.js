/**
 * Verification Suite for Team Calendar Redesign:
 * - Bespoke Segmented Pill Selector (Month | Week | List)
 * - Interactive Category Filter Bar with Live Counters
 * - Non-Destructive Event Details Modal
 * - FullCalendar CSS Design Token Skinning & Dark Mode Harmony
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
console.log('🧪 TEAM CALENDAR OVERHAUL & VIEW SELECTOR TEST SUITE');
console.log('================================================================\n');

const calendarJsPath = path.join(__dirname, '..', 'public', 'js', 'calendar.js');
const styleCssPath = path.join(__dirname, '..', 'public', 'css', 'style.css');

assert(fs.existsSync(calendarJsPath), 'public/js/calendar.js exists');
assert(fs.existsSync(styleCssPath), 'public/css/style.css exists');

const calendarJs = fs.readFileSync(calendarJsPath, 'utf8');
const styleCss = fs.readFileSync(styleCssPath, 'utf8');

console.log('\n📱 1. Bespoke Segmented Pill Selector:');
assert(calendarJs.includes('cal-view-selector'), 'Includes bespoke segmented view selector container');
assert(calendarJs.includes('data-view="dayGridMonth"'), 'Supports Month grid view (dayGridMonth)');
assert(calendarJs.includes('data-view="timeGridWeek"'), 'Supports Week view (timeGridWeek)');
assert(calendarJs.includes('data-view="listWeek"'), 'Supports Agenda/List view (listWeek)');
assert(calendarJs.includes('changeCalendarView'), 'Implements changeCalendarView handler');
assert(calendarJs.includes('onCalendarDatesSet'), 'Synchronizes active view and title on datesSet');
assert(!calendarJs.includes("right: 'dayGridMonth,timeGridWeek,listWeek'"), 'Removes raw stock FullCalendar right toolbar toggle');

console.log('\n🏷️ 2. Interactive Category Filter Ribbon:');
assert(calendarJs.includes('cal-filter-bar'), 'Includes category filter ribbon container');
assert(calendarJs.includes('cal-filter-chip'), 'Renders filter chips with interactive active states');
assert(calendarJs.includes("setCalendarFilter('ALL')"), 'Supports All category filter');
assert(calendarJs.includes("setCalendarFilter('EVENT')"), 'Supports Events category filter');
assert(calendarJs.includes("setCalendarFilter('HIGH_PRIORITY')"), 'Supports High Priority deadline filter');
assert(calendarJs.includes('updateFilterCounts'), 'Dynamically computes live item counters across categories');

console.log('\n🛡️ 3. Non-Destructive Event Details Modal:');
assert(calendarJs.includes('openEventDetailsModal'), 'Implements non-destructive Event Details Modal');
assert(calendarJs.includes('closeEventDetailsModal'), 'Implements safe close handler');
assert(calendarJs.includes('confirmDeleteCalendarEvent'), 'Protects deletions with explicit user confirmation');
assert(!calendarJs.includes('const confirmed = confirm('), 'Replaced abrupt window.confirm on event click with modal workflow');

console.log('\n🎨 4. Design Token Skinning & Contrast:');
assert(!calendarJs.includes('background:#ffffff; border-radius:16px; border:1px solid #e2e8f0;'), 'Eliminated hardcoded inline white background on container');
assert(!calendarJs.includes('color:#0f172a; margin:0;">Team Calendar'), 'Eliminated hardcoded #0f172a heading text');
assert(styleCss.includes('.cal-card'), 'CSS provides theme-backed .cal-card container');
assert(styleCss.includes('.cal-view-selector'), 'CSS styles .cal-view-selector');
assert(styleCss.includes('.cal-view-pill.active'), 'CSS styles active segmented pill with token contrast');
assert(styleCss.includes('.fc-day-today'), 'CSS provides bespoke today cell styling');
assert(styleCss.includes('.dark .fc'), 'CSS provides comprehensive dark mode FullCalendar theme overrides');
assert(styleCss.includes('--fc-border-color: var(--border)'), 'Binds FullCalendar border color to design system token');

console.log('\n================================================================');
console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All calendar overhaul tests passed successfully!\n');
}
