/**
 * ClickTrap - Dark Pattern Detector
 * Unit Test Suite
 */

const assert = require('assert');
const Rules = require('../rules.js');
const DetectorEngine = require('../detector.js');
const { parseHtmlToMockDoc } = require('./dom-mock.js');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  \x1b[32m✔ PASS\x1b[0m ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m ${testName}`);
    console.error(`    Error: ${err.message}`);
  }
}

console.log('\n======================================================');
console.log('  CLICKTRAP DETECTOR ENGINE: AUTOMATED UNIT TESTS');
console.log('======================================================\n');

const detector = new DetectorEngine(Rules);

// --- 1. Rules Configuration Tests ---
console.log('[Suite 1: Detection Rules Specification]');

runTest('Should verify all 6 required dark pattern categories exist', () => {
  const catKeys = Object.keys(Rules.CATEGORIES);
  assert.ok(catKeys.includes('FAKE_URGENCY'));
  assert.ok(catKeys.includes('SCARCITY_MANIPULATION'));
  assert.ok(catKeys.includes('COOKIE_CONSENT'));
  assert.ok(catKeys.includes('HIDDEN_COSTS'));
  assert.ok(catKeys.includes('CONFIRMSHAMING'));
  assert.ok(catKeys.includes('OBSTRUCTIVE_CANCELLATION'));
});

runTest('Every rule must have an id, category, weight, explanation, and action', () => {
  for (const rule of Rules.RULES) {
    assert.ok(rule.id, `Rule missing id`);
    assert.ok(rule.category, `Rule ${rule.id} missing category`);
    assert.ok(rule.weight > 0, `Rule ${rule.id} missing positive weight`);
    assert.ok(rule.explanation, `Rule ${rule.id} missing explanation`);
    assert.ok(rule.recommendedAction, `Rule ${rule.id} missing recommendedAction`);
  }
});

runTest('Risk levels must correctly map scores to levels', () => {
  assert.strictEqual(Rules.getRiskLevel(15).level, 'low');
  assert.strictEqual(Rules.getRiskLevel(35).level, 'moderate');
  assert.strictEqual(Rules.getRiskLevel(65).level, 'high');
  assert.strictEqual(Rules.getRiskLevel(85).level, 'very-high');
});

// --- 2. Pattern Matching Tests ---
console.log('\n[Suite 2: Pattern Recognition Across Categories]');

runTest('Category A: Detects artificial deadline / urgency', () => {
  const doc = parseHtmlToMockDoc('<p>Hurry! Offer expires in 2 minutes!</p>');
  const res = detector.scanDocument(doc, 'https://test-shop.com');
  assert.ok(res.findings.length > 0);
  assert.ok(res.findings.some(f => f.category === 'fake_urgency'));
});

runTest('Category B: Detects scarcity manipulation', () => {
  const doc = parseHtmlToMockDoc('<span>Only 1 item left in stock!</span>');
  const res = detector.scanDocument(doc, 'https://store.example');
  assert.ok(res.findings.some(f => f.category === 'scarcity_manipulation'));
});

runTest('Category D: Detects late-stage hidden fee disclosure', () => {
  const doc = parseHtmlToMockDoc('<div class="fee">Mandatory service fee added at checkout</div>');
  const res = detector.scanDocument(doc, 'https://travel-deals.example');
  assert.ok(res.findings.some(f => f.category === 'hidden_costs'));
});

runTest('Category E: Detects confirmshaming guilt opt-out', () => {
  const doc = parseHtmlToMockDoc('<button>No thanks, I don\'t care about saving money</button>');
  const res = detector.scanDocument(doc, 'https://deals.example');
  assert.ok(res.findings.some(f => f.category === 'confirmshaming'));
});

runTest('Category F: Detects obstructive cancellation hurdle', () => {
  const doc = parseHtmlToMockDoc('<p>To cancel, please call our 1-800 support line between 9am-10am</p>');
  const res = detector.scanDocument(doc, 'https://service.example');
  assert.ok(res.findings.some(f => f.category === 'obstructive_cancellation'));
});

// --- 3. Structural Heuristics Tests ---
console.log('\n[Suite 3: Structural DOM Heuristics]');

runTest('Heuristic: Detects countdown timer element', () => {
  const doc = parseHtmlToMockDoc('<div class="timer">04:59</div>');
  const res = detector.scanDocument(doc);
  assert.ok(res.findings.some(f => f.ruleId === 'FU_COUNTDOWN_TMR'));
});

runTest('Heuristic: Detects asymmetric cookie consent (button vs link)', () => {
  const doc = parseHtmlToMockDoc(`
    <div class="cookie-banner">
      <p>We use tracking cookies.</p>
      <button class="btn-primary">Accept All</button>
      <a href="#" class="link-secondary">Reject</a>
    </div>
  `);
  const res = detector.scanDocument(doc);
  assert.ok(res.findings.some(f => f.category === 'cookie_consent'));
});

runTest('Heuristic: Detects pre-checked non-essential tracking checkbox', () => {
  const doc = parseHtmlToMockDoc(`
    <div class="consent-box">
      <label for="track">Marketing and Advertising Tracking</label>
      <input type="checkbox" id="track" checked />
    </div>
  `);
  const res = detector.scanDocument(doc);
  assert.ok(res.findings.some(f => f.ruleId === 'CC_PRESELECTED_BOXES'));
});

runTest('Heuristic: Detects pre-checked paid add-on checkbox', () => {
  const doc = parseHtmlToMockDoc(`
    <div class="checkout">
      <label><input type="checkbox" checked /> Add Damage Protection Warranty for $4.99</label>
    </div>
  `);
  const res = detector.scanDocument(doc);
  assert.ok(res.findings.some(f => f.ruleId === 'HC_PRECHECKED_ADDON'));
});

// --- 4. Benign Content & False Positive Control ---
console.log('\n[Suite 4: False Positive Controls]');

runTest('Benign page with standard text produces zero dark pattern findings', () => {
  const doc = parseHtmlToMockDoc(`
    <header><h1>Welcome to CleanStore</h1></header>
    <main>
      <p>Free standard shipping on orders over $50.</p>
      <button>Add to Cart</button>
    </main>
    <footer><p>&copy; 2026 CleanStore. Privacy Policy.</p></footer>
  `);
  const res = detector.scanDocument(doc);
  assert.strictEqual(res.findings.length, 0);
  assert.strictEqual(res.score, 0);
  assert.strictEqual(res.level.level, 'low');
});

runTest('Balanced cookie consent with equal buttons does not trigger missing reject', () => {
  const doc = parseHtmlToMockDoc(`
    <div class="cookie-banner">
      <p>We use cookies to improve your experience.</p>
      <button>Accept All</button>
      <button>Reject All</button>
    </div>
  `);
  const res = detector.scanDocument(doc);
  assert.strictEqual(res.findings.filter(f => f.ruleId === 'CC_MISSING_REJECT').length, 0);
});

// --- 5. Scoring & Normalization ---
console.log('\n[Suite 5: Score Saturation and Normalization]');

runTest('Normalized score is strictly bounded between 0 and 100', () => {
  const doc = parseHtmlToMockDoc(`
    <p>Hurry! Offer expires in 2 minutes!</p>
    <p>Only 1 item left in stock!</p>
    <p>Mandatory service fee added at checkout</p>
    <p>No thanks, I don't care about saving money</p>
    <p>To cancel, please call our 1-800 support line</p>
  `);
  const res = detector.scanDocument(doc);
  assert.ok(res.score >= 0 && res.score <= 100);
  assert.ok(res.score >= 50); // Multiple heavy dark patterns should yield high score
});

console.log('\n======================================================');
console.log(`  SUMMARY: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('======================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
