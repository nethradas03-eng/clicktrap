/**
 * ClickTrap - Dark Pattern Detector
 * content.js - Content Script for Webpage Analysis & Non-Destructive Highlighting
 */

(function () {
  'use strict';

  // Guard against multiple injections
  if (window.__clickTrapInjected) {
    return;
  }
  window.__clickTrapInjected = true;

  let currentScanResults = null;
  let isHighlightActive = false;

  // Instantiate detector with loaded rules
  const detector = new window.ClickTrapDetector(window.ClickTrapRules);

  /**
   * Safe serialize findings to avoid sending DOM nodes over extension message port
   */
  function serializeScanResult(rawResult) {
    const serializedFindings = rawResult.findings.map(f => ({
      id: f.id,
      ruleId: f.ruleId,
      category: f.category,
      categoryName: f.categoryName,
      ruleName: f.ruleName,
      severity: f.severity,
      weight: f.weight,
      evidence: f.evidence,
      fullContext: f.fullContext,
      selector: f.selector,
      explanation: f.explanation,
      recommendedAction: f.recommendedAction
    }));

    return {
      domain: rawResult.domain,
      url: rawResult.url,
      timestamp: rawResult.timestamp,
      score: rawResult.score,
      rawScore: rawResult.rawScore,
      level: rawResult.level,
      findingsCount: rawResult.findingsCount,
      findings: serializedFindings,
      categoryDistribution: rawResult.categoryDistribution,
      summary: rawResult.summary
    };
  }

  /**
   * Scans the active document DOM safely
   */
  function performScan() {
    try {
      const rawResult = detector.scanDocument(document, window.location.href);
      currentScanResults = rawResult;
      return serializeScanResult(rawResult);
    } catch (err) {
      console.error('[ClickTrap Content Script] Scan error:', err);
      return {
        error: 'Scan failed: ' + err.message,
        findingsCount: 0,
        score: 0
      };
    }
  }

  /**
   * Non-destructive element highlighting
   */
  function applyHighlights() {
    if (!currentScanResults || !currentScanResults.findings) return;

    removeHighlights(); // Clean existing highlights first

    currentScanResults.findings.forEach((finding, index) => {
      let target = finding.targetElement;
      
      // If target reference is missing or detached, attempt querySelector
      if (!target && finding.selector) {
        try {
          target = document.querySelector(finding.selector);
        } catch (e) {
          target = null;
        }
      }

      if (target && target.classList) {
        target.classList.add('clicktrap-highlighted');
        target.setAttribute('data-clicktrap-id', finding.id);
        target.setAttribute('data-clicktrap-severity', finding.severity || 'medium');

        // Create discreet floating indicator badge
        const badge = document.createElement('div');
        badge.className = 'clicktrap-badge';
        badge.setAttribute('data-clicktrap-badge-for', finding.id);
        badge.setAttribute('data-tooltip', `[ClickTrap ${finding.categoryName}]: ${finding.explanation}`);

        const dot = document.createElement('span');
        dot.className = 'clicktrap-badge-dot';

        const label = document.createElement('span');
        label.textContent = finding.categoryName;

        badge.appendChild(dot);
        badge.appendChild(label);

        // Position badge relative to target
        try {
          if (target.style.position !== 'relative' && target.style.position !== 'absolute') {
            target.dataset.clicktrapOriginalPosition = target.style.position;
            target.style.position = 'relative';
          }
          target.appendChild(badge);
        } catch (err) {
          // If child append fails (e.g. on input/img), insert after element
          if (target.parentElement) {
            target.parentElement.insertBefore(badge, target.nextSibling);
          }
        }
      }
    });

    isHighlightActive = true;
  }

  /**
   * Reversibly remove all highlights and badges
   */
  function removeHighlights() {
    // Remove highlighted CSS classes
    const highlightedEls = document.querySelectorAll('.clicktrap-highlighted');
    highlightedEls.forEach(el => {
      el.classList.remove('clicktrap-highlighted');
      el.removeAttribute('data-clicktrap-id');
      el.removeAttribute('data-clicktrap-severity');
      if (el.dataset.clicktrapOriginalPosition !== undefined) {
        el.style.position = el.dataset.clicktrapOriginalPosition;
        delete el.dataset.clicktrapOriginalPosition;
      }
    });

    // Remove added badges
    const badges = document.querySelectorAll('.clicktrap-badge');
    badges.forEach(b => b.remove());

    isHighlightActive = false;
  }

  // Listen for messages from popup or background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'PING':
        sendResponse({ active: true, url: window.location.href, title: document.title });
        break;

      case 'RUN_SCAN': {
        const report = performScan();
        sendResponse({ success: true, report, highlightsActive: isHighlightActive });
        break;
      }

      case 'TOGGLE_HIGHLIGHTS': {
        const enable = request.payload !== undefined ? request.payload : !isHighlightActive;
        if (enable) {
          applyHighlights();
        } else {
          removeHighlights();
        }
        sendResponse({ success: true, highlightsActive: isHighlightActive });
        break;
      }

      case 'REMOVE_HIGHLIGHTS': {
        removeHighlights();
        sendResponse({ success: true, highlightsActive: false });
        break;
      }

      default:
        sendResponse({ error: 'Unknown content action: ' + request.action });
    }
    return true;
  });

  console.log('[ClickTrap] Content script loaded and listening for scan requests.');
})();
