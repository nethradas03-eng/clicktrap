# ClickTrap – Dark Pattern Detector & Web Scanner

> *"See the pattern. Protect your choice."*

![ClickTrap Version](https://img.shields.io/badge/version-1.0.0-teal.svg)
![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-blue.svg)
![Privacy](https://img.shields.io/badge/Privacy-100%25_Local--First-brightgreen.svg)
![Node](https://img.shields.io/badge/Node.js-24+-green.svg)
![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)

---

## 1. Project Overview

**ClickTrap** is a cybersecurity tool and web scanner that helps users identify deceptive user-interface designs (dark patterns) across websites. It detects manipulative countdown timers, hidden checkout fees, artificial scarcity claims, asymmetric cookie banners, and guilt-inducing opt-out buttons.

### Key Ways to Use ClickTrap:
1. **Direct Web Scanner (`dashboard/index.html`):** Simply enter any website URL, pick a test page, or paste HTML code directly to inspect dark patterns.
2. **Chrome Browser Extension (Manifest V3):** Browse normally, click the ClickTrap icon in your browser toolbar, and click **"Scan Webpage Now"** to scan and highlight elements on the live webpage.

---

## 2. Six Supported Detection Categories

| Category | Real-World Example | Detection Mechanism |
| :--- | :--- | :--- |
| **A. Fake Urgency** | *"Offer expires in 01:59! Buy before timer ends!"* | Detects active countdown timers (`\d{1,2}:\d{2}`) & artificial deadline language. |
| **B. Scarcity Manipulation** | *"Only 1 item left in stock! Almost sold out!"* | Detects stock pressure claims & unverified real-time viewer counters. |
| **C. Cookie Consent Traps** | Giant green "Accept All" vs tiny demoted link. | Detects asymmetric choice buttons, missing reject options, and pre-checked boxes. |
| **D. Hidden & Late Costs** | Mandatory $14.50 service fee added at payment. | Detects drip pricing & pre-checked checkout insurance/warranty checkboxes. |
| **E. Confirmshaming** | *"No thanks, I don't care about saving money."* | Detects guilt-inducing opt-out language & double-negative checkboxes. |
| **F. Obstructive Cancellation** | *"To cancel, please call our 1-800 phone line."* | Detects Roach Motel obstacles & deceptive retention cancellation mazes. |

---

## 3. Quick-Start Guide

### Option 1: Run the Web Scanner Dashboard (Scan Any Website Directly)

1. Open your terminal in this folder (`c:\Users\Nethra\OneDrive\Desktop\displi`).
2. Run the local scanner:
   ```bash
   npm start
   ```
3. Open your browser and go to:
   ```
   http://localhost:3000
   ```
4. Enter any website address (e.g. `https://example.com` or test pages) and click **"Scan Website Now"**! ClickTrap fetches the page, scans for deceptive patterns, and gives you an itemized forensic report.

---

### Option 2: Load the Chrome Browser Extension

1. Open Google Chrome and go to `chrome://extensions/`.
2. Turn on **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the project folder: `c:\Users\Nethra\OneDrive\Desktop\displi`.
5. Pin the ClickTrap shield icon in your Chrome toolbar.
6. Browse any webpage (or open one of our [Test Pages](file:///c:/Users/Nethra/OneDrive/Desktop/displi/test-pages/index.html)), click the ClickTrap icon, and hit **Scan Webpage Now**!
7. Click **Highlight on Page** to see colored dashed outlines and category badges directly on the website.

---

## 4. Running Automated Tests

ClickTrap includes a zero-dependency automated unit test suite. Run:

```bash
npm test
```

Expected output:
```
======================================================
  CLICKTRAP DETECTOR ENGINE: AUTOMATED UNIT TESTS
======================================================
[Suite 1: Detection Rules Specification]  ✔ PASS (3/3)
[Suite 2: Pattern Recognition Across All] ✔ PASS (5/5)
[Suite 3: Structural DOM Heuristics]      ✔ PASS (4/4)
[Suite 4: False Positive Controls]        ✔ PASS (2/2)
[Suite 5: Score Normalization]            ✔ PASS (1/1)
======================================================
  SUMMARY: 15/15 Tests Passed (100%)
======================================================
```

---

## 5. Security & Privacy Guarantees

- **100% Local-First:** All text parsing happens directly inside your browser or local machine.
- **Zero Cloud Transmission:** No webpage content, passwords, or browsing activity are transmitted to remote servers or third-party AI APIs.
- **Safe Text Escaping:** All extracted text is sanitized as plain text strings, preventing Cross-Site Scripting (XSS).
- **Non-Destructive:** ClickTrap never submits forms, clicks buttons automatically, or alters website operations.

---

## 6. License

MIT License. See [package.json](package.json) for details.
