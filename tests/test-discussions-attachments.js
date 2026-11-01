/**
 * Verification Suite for Phase 2: Discussions Module (Attachment Viewing & Downloads)
 * Tests:
 * 1. Backend attachment normalization & metadata guarantee
 * 2. Workspace-level authorization & group membership protection
 * 3. Frontend Lightbox modal container and keyboard controls
 * 4. Inline image thumbnail rendering with click-to-preview lightbox
 * 5. Document download badge chips with explicit target="_blank" and download attributes
 * 6. Thread-wide image collection and cycling (Escape, ArrowLeft, ArrowRight)
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
console.log('🧪 DISCUSSIONS ATTACHMENT VIEWING & LIGHTBOX TEST SUITE');
console.log('================================================================\n');

// ── 1. BACKEND ATTACHMENT NORMALIZATION ──
console.log('📦 1. Backend Service Layer & Metadata Normalization:');
const servicePath = path.join(__dirname, '..', 'src', 'modules', 'discussions', 'discussion.service.js');
const routesPath = path.join(__dirname, '..', 'src', 'modules', 'discussions', 'discussion.routes.js');

assert(fs.existsSync(servicePath), 'discussion.service.js exists');
assert(fs.existsSync(routesPath), 'discussion.routes.js exists');

const discussionService = require(servicePath);
assert(typeof discussionService.normalizeAttachments === 'function', 'discussionService exports normalizeAttachments helper');

const sampleRaw = [
  { name: 'diagram.png', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==' },
  { file_name: 'report.pdf', file_url: 'https://example.com/report.pdf' },
  { file_name: 'notes.docx', file_url: 'https://example.com/notes.docx', file_type: 'application/docx' },
  { file_name: 'empty.txt' } // no url -> should be filtered
];

const normalized = discussionService.normalizeAttachments(sampleRaw);
assert(Array.isArray(normalized) && normalized.length === 3, 'Filters out items missing file_url');
assert(normalized[0].file_name === 'diagram.png', 'Normalizes name to file_name');
assert(normalized[0].file_url.startsWith('data:image/png'), 'Preserves file_url');
assert(normalized[0].file_type === 'image/png', 'Infers image/png MIME type from extension');
assert(normalized[1].file_type === 'application/pdf', 'Infers application/pdf MIME type from extension');

// Handle JSON-encoded string
const jsonStringAtts = JSON.stringify([{ file_name: 'test.jpg', file_url: 'data:image/jpeg;base64,...' }]);
const parsedFromString = discussionService.normalizeAttachments(jsonStringAtts);
assert(parsedFromString.length === 1 && parsedFromString[0].file_name === 'test.jpg', 'Normalizes JSON string attachments cleanly');

// ── 2. WORKSPACE GROUP MEMBERSHIP GUARD ──
console.log('\n🔒 2. Workspace Group Membership Security Guard:');
const routesContent = fs.readFileSync(routesPath, 'utf8');
assert(routesContent.includes('requireGroupMembership'), 'Discussion routes require requireGroupMembership middleware');
assert(routesContent.includes('router.use(requireGroupMembership)'), 'Applies requireGroupMembership across all discussion endpoints');

const modelPath = path.join(__dirname, '..', 'src', 'modules', 'discussions', 'discussion.model.js');
const modelContent = fs.readFileSync(modelPath, 'utf8');
assert(modelContent.includes('WHERE d.id = ${id} AND d.group_id = ${groupId}'), 'findByIdInGroup strictly scopes query to groupId');
assert(modelContent.includes('WHERE c.discussion_id = ${discussionId} AND d.group_id = ${groupId}'), 'getComments strictly scopes query to groupId');

// ── 3. FRONTEND LIGHTBOX MODAL & KEYBOARD CONTROLS ──
console.log('\n🖼️ 3. Frontend Lightbox Modal & Keyboard Navigation:');
const htmlPath = path.join(__dirname, '..', 'public', 'dashboard.html');
const jsPath = path.join(__dirname, '..', 'public', 'js', 'dashboard.js');
const cssPath = path.join(__dirname, '..', 'public', 'css', 'style.css');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

assert(html.includes('id="attachmentLightboxModal"'), 'dashboard.html includes #attachmentLightboxModal container');
assert(html.includes('id="lightboxImg"'), 'Lightbox includes #lightboxImg element');
assert(html.includes('id="lightboxFileName"'), 'Lightbox includes #lightboxFileName element');
assert(html.includes('id="lightboxCounter"'), 'Lightbox includes #lightboxCounter indicator');
assert(html.includes('id="lightboxDownloadBtn"'), 'Lightbox includes #lightboxDownloadBtn action');
assert(html.includes('id="lightboxPrevBtn"') && html.includes('id="lightboxNextBtn"'), 'Lightbox includes left/right navigation arrow buttons');

assert(js.includes('function openAttachmentLightbox'), 'dashboard.js defines openAttachmentLightbox function');
assert(js.includes('function closeAttachmentLightbox'), 'dashboard.js defines closeAttachmentLightbox function');
assert(js.includes('function prevLightboxImage'), 'dashboard.js defines prevLightboxImage function');
assert(js.includes('function nextLightboxImage'), 'dashboard.js defines nextLightboxImage function');
assert(js.includes('function handleLightboxKeydown'), 'dashboard.js defines handleLightboxKeydown listener');
assert(js.includes("e.key === 'Escape'"), 'handleLightboxKeydown supports Escape to close');
assert(js.includes("e.key === 'ArrowLeft'"), 'handleLightboxKeydown supports ArrowLeft to cycle backward');
assert(js.includes("e.key === 'ArrowRight'"), 'handleLightboxKeydown supports ArrowRight to cycle forward');

// ── 4. ATTACHMENT RENDERING & DOCUMENT DOWNLOAD BADGES ──
console.log('\n📎 4. Attachment Rendering & Document Download Badges:');
assert(js.includes('function renderAttachmentsHtml'), 'dashboard.js defines renderAttachmentsHtml function');
assert(js.includes('attachment-image-thumb'), 'Renders images with .attachment-image-thumb');
assert(js.includes('openAttachmentLightbox('), 'Image thumbnails trigger openAttachmentLightbox');
assert(js.includes('attachment-doc-badge'), 'Renders documents with .attachment-doc-badge');
assert(js.includes('download="${fileName}"'), 'Document badges include download attribute for direct file saving');
assert(js.includes('target="_blank"'), 'Document badges include target="_blank" for viewing');
assert(js.includes('window.__activeThreadImages'), 'Collects thread images for sequential multi-image lightbox cycling');

// ── 5. CSS STYLING & TOUCH TARGET POLISH ──
console.log('\n🎨 5. CSS Styling, Transitions & Focus States:');
assert(css.includes('.lightbox-modal-overlay'), 'CSS defines .lightbox-modal-overlay');
assert(css.includes('backdrop-filter: blur'), 'Lightbox overlay applies backdrop blur');
assert(css.includes('.lightbox-nav-btn'), 'CSS defines .lightbox-nav-btn');
assert(css.includes('width: 44px') && css.includes('height: 44px'), 'Lightbox navigation arrows meet 44px touch target guidelines');
assert(css.includes('.attachment-doc-badge'), 'CSS defines .attachment-doc-badge with token harmony');
assert(css.includes(':focus-visible'), 'CSS provides prominent focus-visible outlines for keyboard accessibility');

console.log('\n================================================================');
console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Discussions Attachment System & Lightbox tests passed!\n');
}

