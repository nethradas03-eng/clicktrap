/**
 * ClickTrap - Detection Accuracy Evaluation Module
 * Evaluates detector against the labeled synthetic dataset
 * Computes Confusion Matrix (TP, FP, TN, FN), Precision, Recall, and F1 Score
 */

const fs = require('fs');
const path = require('path');
const Rules = require('../rules.js');
const DetectorEngine = require('../detector.js');
const { parseHtmlToMockDoc } = require('./dom-mock.js');

function evaluateDataset(datasetPath) {
  const rawData = fs.readFileSync(datasetPath, 'utf8');
  const testCases = JSON.parse(rawData);

  const detector = new DetectorEngine(Rules);

  let tp = 0; // True Positive: Actual Dark Pattern detected as Dark Pattern
  let fp = 0; // False Positive: Actual Benign flagged as Dark Pattern
  let tn = 0; // True Negative: Actual Benign correctly identified as clean
  let fn = 0; // False Negative: Actual Dark Pattern missed

  const categoryStats = {};
  const caseResults = [];

  for (const tc of testCases) {
    const doc = parseHtmlToMockDoc(tc.input);
    const result = detector.scanDocument(doc, `https://test-${tc.id.toLowerCase()}.local`);

    const predictedDarkPattern = result.findings.length > 0;
    const actualDarkPattern = tc.isDarkPattern;

    let outcome = '';
    if (actualDarkPattern && predictedDarkPattern) {
      tp++;
      outcome = 'TP';
    } else if (!actualDarkPattern && predictedDarkPattern) {
      fp++;
      outcome = 'FP';
    } else if (!actualDarkPattern && !predictedDarkPattern) {
      tn++;
      outcome = 'TN';
    } else {
      fn++;
      outcome = 'FN';
    }

    // Per category breakdown
    const cat = tc.category;
    if (!categoryStats[cat]) {
      categoryStats[cat] = { total: 0, detected: 0, missed: 0, falseAlarms: 0 };
    }
    categoryStats[cat].total++;
    if (tc.isDarkPattern) {
      if (predictedDarkPattern) categoryStats[cat].detected++;
      else categoryStats[cat].missed++;
    } else {
      if (predictedDarkPattern) categoryStats[cat].falseAlarms++;
    }

    caseResults.push({
      id: tc.id,
      category: tc.category,
      actual: actualDarkPattern ? 'Dark Pattern' : 'Benign',
      predicted: predictedDarkPattern ? 'Dark Pattern' : 'Benign',
      outcome,
      score: result.score,
      findingsCount: result.findings.length,
      description: tc.description
    });
  }

  // Calculate Metrics
  const precision = (tp + fp) > 0 ? (tp / (tp + fp)) : 0;
  const recall = (tp + fn) > 0 ? (tp / (tp + fn)) : 0;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy = (testCases.length > 0) ? (tp + tn) / testCases.length : 0;

  return {
    totalCases: testCases.length,
    confusionMatrix: { tp, fp, tn, fn },
    metrics: {
      precision: parseFloat(precision.toFixed(4)),
      recall: parseFloat(recall.toFixed(4)),
      f1: parseFloat(f1.toFixed(4)),
      accuracy: parseFloat(accuracy.toFixed(4))
    },
    categoryStats,
    caseResults
  };
}

// If run from command line
if (require.main === module) {
  const datasetPath = path.join(__dirname, 'dataset.json');
  console.log('\n================================================================');
  console.log('   CLICKTRAP: DETECTION ACCURACY & BENCHMARK EVALUATION');
  console.log('================================================================\n');

  const report = evaluateDataset(datasetPath);

  console.log(`Evaluated ${report.totalCases} labeled test fixtures.\n`);

  console.log('--- CONFUSION MATRIX ---');
  console.log(`  True Positives  (TP) : ${report.confusionMatrix.tp}  (Deceptive patterns correctly flagged)`);
  console.log(`  False Positives (FP) : ${report.confusionMatrix.fp}  (Benign patterns falsely flagged)`);
  console.log(`  True Negatives  (TN) : ${report.confusionMatrix.tn}  (Benign pages correctly passed)`);
  console.log(`  False Negatives (FN) : ${report.confusionMatrix.fn}  (Deceptive patterns missed)\n`);

  console.log('--- STATISTICAL PERFORMANCE METRICS ---');
  console.log(`  Accuracy  : ${(report.metrics.accuracy * 100).toFixed(1)}%`);
  console.log(`  Precision : ${(report.metrics.precision * 100).toFixed(1)}%`);
  console.log(`  Recall    : ${(report.metrics.recall * 100).toFixed(1)}%`);
  console.log(`  F1-Score  : ${(report.metrics.f1 * 100).toFixed(1)}%\n`);

  console.log('--- CATEGORY RECALL BREAKDOWN ---');
  Object.keys(report.categoryStats).forEach(cat => {
    const s = report.categoryStats[cat];
    if (cat === 'benign') {
      console.log(`  ${cat.padEnd(25)} : Clean Passes: ${s.total - s.falseAlarms}/${s.total} (False Alarms: ${s.falseAlarms})`);
    } else {
      const rec = s.total > 0 ? ((s.detected / s.total) * 100).toFixed(0) : '0';
      console.log(`  ${cat.padEnd(25)} : Detected: ${s.detected}/${s.total} (${rec}% Recall)`);
    }
  });

  console.log('\n================================================================\n');

  // Also save evaluation results JSON to be shared with dashboard
  const outJson = path.join(__dirname, '..', 'dashboard', 'evaluation-data.js');
  const jsContent = `/**
 * ClickTrap Auto-Generated Evaluation Benchmark Data
 * Exported for display in the Web Dashboard Evaluation View
 */
window.ClickTrapEvaluationData = ${JSON.stringify(report, null, 2)};
`;
  fs.writeFileSync(outJson, jsContent, 'utf8');
  console.log(`Exported benchmark metrics to dashboard/evaluation-data.js`);
}

module.exports = { evaluateDataset };
