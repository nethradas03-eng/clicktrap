/**
 * ClickTrap - Dark Pattern Detector
 * detector.js - Modular Dark Pattern Detection Engine
 * 
 * Inspects webpage text, interactive elements, and DOM structures.
 * Computes transparent, normalized risk scores and actionable explanations.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const rules = require('./rules.js');
    module.exports = factory(rules);
  } else {
    root.ClickTrapDetector = factory(root.ClickTrapRules);
  }
})(typeof self !== 'undefined' ? self : this, function (Rules) {
  'use strict';

  if (!Rules) {
    throw new Error('ClickTrap rules configuration must be loaded before detector.js');
  }

  class DetectorEngine {
    constructor(customRules = null) {
      this.rulesConfig = customRules || Rules;
      this.rules = this.rulesConfig.RULES;
      this.categories = this.rulesConfig.CATEGORIES;
    }

    /**
     * Helper to safely sanitize and trim string snippet
     */
    cleanExcerpt(str, maxLen = 140) {
      if (!str) return '';
      const cleaned = str.replace(/\s+/g, ' ').trim();
      return cleaned.length > maxLen ? cleaned.substring(0, maxLen) + '...' : cleaned;
    }

    /**
     * Generate a unique selector or identifier for DOM elements
     */
    getElementSelector(el) {
      if (!el || typeof el.getAttribute !== 'function') return 'unknown';
      if (el.id) return `#${el.id}`;
      
      const tag = el.tagName ? el.tagName.toLowerCase() : 'element';
      const className = el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).filter(c => !c.startsWith('clicktrap-')).slice(0, 2).join('.')
        : '';
        
      if (el.parentElement) {
        const siblings = Array.from(el.parentElement.children);
        const index = siblings.indexOf(el) + 1;
        return `${tag}${className}:nth-child(${index})`;
      }
      return `${tag}${className}`;
    }

    /**
     * Core Scan Method for a DOM document or simulated container
     */
    scanDocument(doc, targetUrl = '') {
      if (!doc) {
        throw new Error('Valid DOM Document or container element is required for scanning');
      }

      const findings = [];
      const seenSignatures = new Set();

      // 1. Run Pattern Matching Rules
      this.runPatternRules(doc, findings, seenSignatures);

      // 2. Run Heuristic DOM Structure Rules
      this.runHeuristicRules(doc, findings, seenSignatures);

      // 3. Score Normalization & Aggregation
      const scoredResults = this.aggregateAndScore(findings, targetUrl);

      return scoredResults;
    }

    /**
     * Runs pattern-based detection on visible text, buttons, links, headings
     */
    runPatternRules(doc, findings, seenSignatures) {
      // Gather relevant inspectable elements
      const inspectSelectors = [
        'button', 'a', 'p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'label', 'strong', 'em', 'li', '[role="button"]', '[role="alert"]', '.banner', '.modal'
      ];

      // Query elements safely
      let elements = [];
      try {
        elements = Array.from(doc.querySelectorAll(inspectSelectors.join(',')));
      } catch (e) {
        elements = [];
      }

      const patternRules = this.rules.filter(r => r.type === 'pattern' && Array.isArray(r.patterns));

      for (const el of elements) {
        // Skip hidden elements if in browser
        if (typeof el.getBoundingClientRect === 'function') {
          const rect = el.getBoundingClientRect();
          const style = el.ownerDocument && el.ownerDocument.defaultView
            ? el.ownerDocument.defaultView.getComputedStyle(el)
            : null;
          if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) {
            continue;
          }
        }

        // Avoid inspecting huge containers with hundreds of children directly
        if (el.children && el.children.length > 8) {
          continue;
        }

        const text = (el.innerText || el.textContent || '').trim();
        if (!text || text.length > 500) {
          continue;
        }

        for (const rule of patternRules) {
          for (const regex of rule.patterns) {
            const match = text.match(regex);
            if (match) {
              const matchedPhrase = match[0];
              const signature = `${rule.id}:${matchedPhrase.toLowerCase()}`;
              
              if (!seenSignatures.has(signature)) {
                seenSignatures.add(signature);
                findings.push({
                  id: `ct-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                  ruleId: rule.id,
                  category: rule.category,
                  categoryName: this.categories[rule.category.toUpperCase()] ? this.categories[rule.category.toUpperCase()].name : rule.category,
                  ruleName: rule.name,
                  severity: rule.severity,
                  weight: rule.weight,
                  evidence: this.cleanExcerpt(matchedPhrase),
                  fullContext: this.cleanExcerpt(text),
                  selector: this.getElementSelector(el),
                  targetElement: el,
                  explanation: rule.explanation,
                  recommendedAction: rule.recommendedAction
                });
              }
              break; // Don't match multiple regexes of same rule on same element
            }
          }
        }
      }
    }

    /**
     * Runs structural DOM heuristics
     */
    runHeuristicRules(doc, findings, seenSignatures) {
      const heuristicRules = this.rules.filter(r => r.type === 'heuristic');

      for (const rule of heuristicRules) {
        if (typeof this[rule.heuristic] === 'function') {
          try {
            const results = this[rule.heuristic](doc, rule);
            if (Array.isArray(results)) {
              for (const res of results) {
                const sig = `${rule.id}:${res.selector || res.evidence}`;
                if (!seenSignatures.has(sig)) {
                  seenSignatures.add(sig);
                  findings.push({
                    id: `ct-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                    ruleId: rule.id,
                    category: rule.category,
                    categoryName: this.categories[rule.category.toUpperCase()] ? this.categories[rule.category.toUpperCase()].name : rule.category,
                    ruleName: rule.name,
                    severity: rule.severity,
                    weight: rule.weight,
                    evidence: res.evidence,
                    fullContext: res.fullContext || res.evidence,
                    selector: res.selector || 'body',
                    targetElement: res.targetElement || null,
                    explanation: rule.explanation,
                    recommendedAction: rule.recommendedAction
                  });
                }
              }
            }
          } catch (err) {
            console.warn(`ClickTrap Heuristic [${rule.heuristic}] encountered error:`, err);
          }
        }
      }
    }

    /**
     * Heuristic: Countdown Timer Detection
     */
    detectCountdownElement(doc, rule) {
      const results = [];
      const timerCandidates = Array.from(doc.querySelectorAll(
        '[class*="timer"], [class*="countdown"], [id*="timer"], [id*="countdown"], [data-timer], [data-countdown]'
      ));

      // Also look for elements displaying time formats like 05:00, 02:45
      const timeRegex = /\b\d{1,2}\s*:\s*\d{2}(?:\s*:\s*\d{2})?\b/;
      const timeUnitRegex = /\b(?:\d+\s*(?:hrs?|hours?|mins?|minutes?|secs?|seconds?)\s*)+\b/i;

      // Filter candidates or search specific time elements
      const elementsToCheck = timerCandidates.length > 0
        ? timerCandidates
        : Array.from(doc.querySelectorAll('.urgency, [role="timer"], b, span, div')).slice(0, 50);

      for (const el of elementsToCheck) {
        const text = (el.innerText || el.textContent || '').trim();
        if (timeRegex.test(text) || (timeUnitRegex.test(text) && /(?:left|remaining|hurry|expires|ends)/i.test(text))) {
          results.push({
            evidence: this.cleanExcerpt(text, 80),
            fullContext: this.cleanExcerpt(text, 120),
            selector: this.getElementSelector(el),
            targetElement: el
          });
          break; // Avoid spamming multiple timer nodes of the same countdown
        }
      }
      return results;
    }

    /**
     * Heuristic: Cookie Consent Asymmetry
     */
    detectAsymmetricConsent(doc, rule) {
      const results = [];
      const consentContainers = Array.from(doc.querySelectorAll(
        '[class*="cookie"], [id*="cookie"], [class*="consent"], [id*="consent"], [aria-label*="cookie" i], [role="dialog"][class*="cookie" i]'
      ));

      for (const container of consentContainers) {
        // Find accept buttons
        const buttons = Array.from(container.querySelectorAll('button, a, [role="button"]'));
        let acceptBtn = null;
        let rejectBtn = null;
        let manageBtn = null;

        for (const btn of buttons) {
          const btnText = (btn.innerText || btn.textContent || '').trim().toLowerCase();
          if (/\b(?:accept all|agree|allow all|accept cookies|i agree)\b/i.test(btnText)) {
            acceptBtn = btn;
          } else if (/\b(?:reject all|decline|disagree|refuse|reject)\b/i.test(btnText)) {
            rejectBtn = btn;
          } else if (/\b(?:manage|preferences|cookie settings|more options)\b/i.test(btnText)) {
            manageBtn = btn;
          }
        }

        if (acceptBtn) {
          // If Reject button is completely absent from the primary dialog view
          if (!rejectBtn) {
            results.push({
              evidence: `Accept button "${this.cleanExcerpt(acceptBtn.textContent)}" present without an equal "Reject All" option.`,
              fullContext: `Consent container offers immediate accept but hides or lacks reject controls.`,
              selector: this.getElementSelector(container),
              targetElement: acceptBtn
            });
            break;
          }

          // If Reject exists, check visual asymmetry in style or tag
          if (rejectBtn) {
            const isAcceptStyledButton = acceptBtn.tagName.toLowerCase() === 'button' || acceptBtn.className.includes('btn') || acceptBtn.className.includes('primary');
            const isRejectTextLink = rejectBtn.tagName.toLowerCase() === 'a' || rejectBtn.className.includes('link') || rejectBtn.className.includes('secondary');

            if (isAcceptStyledButton && isRejectTextLink) {
              results.push({
                evidence: `Accept option is styled as prominent button while Reject is demoted to a low-contrast text link.`,
                fullContext: `Accept: "${this.cleanExcerpt(acceptBtn.textContent)}" vs Reject: "${this.cleanExcerpt(rejectBtn.textContent)}"`,
                selector: this.getElementSelector(container),
                targetElement: acceptBtn
              });
              break;
            }
          }
        }
      }
      return results;
    }

    /**
     * Heuristic: Missing Direct Reject Option
     */
    detectMissingRejectOption(doc, rule) {
      const results = [];
      const consentContainers = Array.from(doc.querySelectorAll(
        '[class*="cookie"], [id*="cookie"], [class*="consent"], [id*="consent"]'
      ));

      for (const container of consentContainers) {
        const text = (container.innerText || container.textContent || '').toLowerCase();
        // Check if banner discusses cookies
        if (text.includes('cookie') || text.includes('tracking') || text.includes('privacy')) {
          const buttons = Array.from(container.querySelectorAll('button, a, [role="button"]'));
          const hasAccept = buttons.some(b => /\b(?:accept|agree|allow)\b/i.test(b.textContent));
          const hasReject = buttons.some(b => /\b(?:reject|decline|refuse)\b/i.test(b.textContent));

          if (hasAccept && !hasReject) {
            results.push({
              evidence: 'Consent banner requires accepting tracking without a one-click reject option.',
              fullContext: this.cleanExcerpt(container.textContent, 120),
              selector: this.getElementSelector(container),
              targetElement: container
            });
            break;
          }
        }
      }
      return results;
    }

    /**
     * Heuristic: Pre-Selected Non-Essential Consent Checkboxes
     */
    detectPrecheckedConsent(doc, rule) {
      const results = [];
      const checkboxes = Array.from(doc.querySelectorAll('input[type="checkbox"][checked], input[type="checkbox"]:checked'));

      for (const cb of checkboxes) {
        // Find associated label or parent text
        let labelText = '';
        if (cb.id) {
          const label = doc.querySelector(`label[for="${cb.id}"]`);
          if (label) labelText = label.textContent || '';
        }
        if (!labelText && cb.parentElement) {
          labelText = cb.parentElement.textContent || '';
        }

        const lower = labelText.toLowerCase();
        const isNonEssential = /\b(?:marketing|advertising|analytics|profiling|partners|commercial|personalization)\b/i.test(lower);
        const isStrictlyNecessary = /\b(?:strictly necessary|essential|required)\b/i.test(lower);

        if (isNonEssential && !isStrictlyNecessary) {
          results.push({
            evidence: `Pre-checked tracking consent: "${this.cleanExcerpt(labelText, 80)}"`,
            fullContext: this.cleanExcerpt(labelText, 120),
            selector: this.getElementSelector(cb),
            targetElement: cb
          });
        }
      }
      return results;
    }

    /**
     * Heuristic: Pre-Selected Paid Add-ons or Insurance at Checkout
     */
    detectPrecheckedAddons(doc, rule) {
      const results = [];
      const checkboxes = Array.from(doc.querySelectorAll('input[type="checkbox"][checked], input[type="checkbox"]:checked'));

      for (const cb of checkboxes) {
        let text = '';
        if (cb.id) {
          const label = doc.querySelector(`label[for="${cb.id}"]`);
          if (label) text = label.textContent || '';
        }
        if (!text && cb.parentElement) {
          text = cb.parentElement.textContent || '';
        }

        const lower = text.toLowerCase();
        const hasAddonKeyword = /\b(?:insurance|warranty|protection|damage protection|donation|tip|express packaging|rush processing|carbon offset)\b/i.test(lower);
        const hasPrice = /[\$€£₹]\s*\d+(?:\.\d{2})?|\b\d+\s*(?:dollars|usd|eur|gbp)\b/i.test(lower);

        if (hasAddonKeyword && hasPrice) {
          results.push({
            evidence: `Pre-selected paid add-on: "${this.cleanExcerpt(text, 80)}"`,
            fullContext: this.cleanExcerpt(text, 120),
            selector: this.getElementSelector(cb),
            targetElement: cb
          });
        }
      }
      return results;
    }

    /**
     * Aggregates findings, deduplicates related categories, and normalizes score 0-100
     */
    aggregateAndScore(findings, url = '') {
      let rawScore = 0;
      const categoryDistribution = {};
      const uniqueCategoryRulePairs = new Set();

      // Initialize category counters
      Object.keys(this.categories).forEach(k => {
        const catId = this.categories[k].id;
        categoryDistribution[catId] = 0;
      });

      for (const f of findings) {
        const catKey = f.category;
        if (categoryDistribution[catKey] !== undefined) {
          categoryDistribution[catKey]++;
        } else {
          categoryDistribution[catKey] = 1;
        }

        // To prevent runaway scoring from duplicate identical findings:
        // Cap maximum score contribution from a single rule to 1.5x its base weight
        const ruleKey = `${f.category}:${f.ruleId}`;
        if (!uniqueCategoryRulePairs.has(ruleKey)) {
          uniqueCategoryRulePairs.add(ruleKey);
          rawScore += f.weight;
        } else {
          // Diminishing returns for repeated occurrences of same rule
          rawScore += Math.round(f.weight * 0.25);
        }
      }

      // Diminishing returns ceiling normalization
      // Map rawScore (0 to 120+) smoothly onto [0, 100]
      let normalizedScore = 0;
      if (rawScore > 0) {
        // Logistic / non-linear saturation curve
        normalizedScore = Math.min(100, Math.round(100 * (1 - Math.exp(-rawScore / 42))));
      }

      const riskLevel = this.rulesConfig.getRiskLevel(normalizedScore);

      let parsedDomain = 'current-page';
      try {
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          parsedDomain = new URL(url).hostname;
        } else if (url) {
          parsedDomain = url;
        }
      } catch (e) {
        parsedDomain = 'webpage';
      }

      return {
        domain: parsedDomain,
        url: url,
        timestamp: new Date().toISOString(),
        score: normalizedScore,
        rawScore: rawScore,
        level: riskLevel,
        findingsCount: findings.length,
        findings: findings,
        categoryDistribution: categoryDistribution,
        summary: findings.length === 0
          ? 'No suspicious dark patterns were detected on this page.'
          : `Detected ${findings.length} potential dark pattern signal${findings.length > 1 ? 's' : ''} across ${Object.values(categoryDistribution).filter(c => c > 0).length} categories.`
      };
    }
  }

  return DetectorEngine;
});
