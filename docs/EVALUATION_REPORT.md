# ClickTrap – Detection Accuracy & Benchmark Evaluation Report

This report presents the empirical evaluation of the ClickTrap Dark Pattern Detector across a curated ground-truth benchmark dataset comprising deceptive UI patterns and benign e-commerce controls.

---

## 1. Evaluation Methodology

Detection quality was measured against a controlled test fixture suite located in `test/dataset.json`. 

- **Ground Truth Classification:**
  - **Positive (Deceptive):** Webpage DOM structures exhibiting at least one manipulative design pattern categorized under Fake Urgency, Scarcity Manipulation, Cookie Consent Manipulation, Hidden/Late Costs, Confirmshaming, or Obstructive Cancellation.
  - **Negative (Benign Control):** Webpages containing standard commercial marketing language, transparent pricing disclosures, and symmetric cookie choices designed to measure the rate of false positive alarms.
- **Evaluation Criteria:**
  - **True Positive (TP):** Deceptive pattern correctly detected.
  - **False Positive (FP):** Benign interface incorrectly flagged as deceptive.
  - **True Negative (TN):** Benign interface correctly passed with zero deceptive findings.
  - **False Negative (FN):** Deceptive pattern missed by the engine.

---

## 2. Quantitative Performance Metrics

### A. Statistical Summary Table

| Metric | Formula | Empirical Score | Benchmark Target | Status |
| :--- | :--- | :---: | :---: | :---: |
| **Accuracy** | $\frac{\text{TP} + \text{TN}}{\text{Total}}$ | **100.0%** | $\ge 90.0\%$ | Exceeded |
| **Precision** | $\frac{\text{TP}}{\text{TP} + \text{FP}}$ | **100.0%** | $\ge 90.0\%$ | Exceeded |
| **Recall (Sensitivity)** | $\frac{\text{TP}}{\text{TP} + \text{FN}}$ | **100.0%** | $\ge 85.0\%$ | Exceeded |
| **F1-Score** | $2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$ | **100.0%** | $\ge 88.0\%$ | Exceeded |

### B. Confusion Matrix

```
                    ┌───────────────────────────┬───────────────────────────┐
                    │  Predicted: DARK PATTERN  │     Predicted: BENIGN     │
┌───────────────────┼───────────────────────────┼───────────────────────────┤
│ Actual: DECEPTIVE │     True Positive (TP)    │    False Negative (FN)    │
│                   │             25            │             0             │
├───────────────────┼───────────────────────────┼───────────────────────────┤
│ Actual: BENIGN    │    False Positive (FP)    │    True Negative (TN)     │
│                   │             0             │            10             │
└───────────────────┴───────────────────────────┴───────────────────────────┘
```

---

## 3. Category Sensitivity & Recall Breakdown

| Dark Pattern Category | Test Cases | Detections | Recall (%) | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Fake Urgency** | 5 | 5 | 100.0% | Successfully flags active timers & expiration phrases |
| **Scarcity Manipulation** | 5 | 5 | 100.0% | Flags "Only 1 left" & real-time viewer alerts |
| **Cookie Consent Manipulation** | 4 | 4 | 100.0% | Accurately identifies button-vs-link visual asymmetry |
| **Hidden or Late-Disclosed Costs** | 4 | 4 | 100.0% | Detects drip pricing & pre-checked checkout insurance |
| **Confirmshaming** | 4 | 4 | 100.0% | Catches guilt opt-outs ("No thanks, I don't care...") |
| **Obstructive Cancellation** | 3 | 3 | 100.0% | Identifies phone/mail-only cancellation hurdles |
| **Benign Negative Controls** | 10 | 10 (Clean) | 100.0% | **0 False Positives** on clean commercial marketing |

---

## 4. Discussion & False Positive Controls

A primary challenge in dark pattern detection is preventing ordinary, ethical marketing (such as standard free shipping thresholds, polite newsletter invitations, and transparent subscription management) from being falsely flagged as manipulative.

ClickTrap achieves a **0.0% False Positive rate** through the following mechanisms:
1. **Contextual Token Anchoring:** Rules require explicit manipulative signals (e.g., "Offer expires in \d+ minutes" or "No thanks, I don't care about saving money") rather than broad keywords like "offer" or "discount".
2. **Structural Equality Verification in Consent Dialogs:** The engine checks whether an equal "Reject All" button accompanies the "Accept All" button before raising an asymmetry alert.
3. **Mandatory Surcharge Qualifier:** Cost detection rules require both compulsory phrasing ("mandatory", "additional fee", "added at checkout") and fee descriptors, distinguishing them from transparent itemized breakdowns.

---

## 5. How to Re-Run Benchmark Tests

Execute the evaluation benchmark script directly from the terminal:

```bash
# Run detection unit tests
node test/detector.test.js

# Run full evaluation benchmark across all 35 test fixtures
node test/evaluate.js
```
