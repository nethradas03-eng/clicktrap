/**
 * ClickTrap - Companion Web Dashboard Controller
 * Simple, direct website scanner, report inspector, history manager, and dark pattern handbook.
 */

document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  // Navigation Items
  const navItems = document.querySelectorAll('.nav-item');
  const viewPanels = document.querySelectorAll('.view-panel');
  const pageHeading = document.getElementById('page-title');
  const pageSubheading = document.getElementById('page-sub');

  // Scanner Form Elements
  const urlScanForm = document.getElementById('url-scan-form');
  const targetUrlInput = document.getElementById('target-url-input');
  const btnSubmitUrlScan = document.getElementById('btn-submit-url-scan');
  const scanBtnIcon = document.getElementById('scan-btn-icon');
  const scanBtnText = document.getElementById('scan-btn-text');
  const scanStatusAlert = document.getElementById('scan-status-alert');

  // HTML Paste Elements
  const btnTogglePaste = document.getElementById('btn-toggle-paste');
  const pasteHtmlContainer = document.getElementById('paste-html-container');
  const rawHtmlInput = document.getElementById('raw-html-input');
  const btnScanRawHtml = document.getElementById('btn-scan-raw-html');

  // Quick Test Fixture Pills
  const samplePillBtns = document.querySelectorAll('.sample-pill-btn');

  // Modals & Triggers
  const guideModal = document.getElementById('guide-modal');
  const btnQuickScanGuide = document.getElementById('btn-quick-scan-guide');
  const btnCloseGuide = document.getElementById('btn-close-guide');

  // Overview Stats
  const statTotalScans = document.getElementById('stat-total-scans');
  const statUniqueSites = document.getElementById('stat-unique-sites');
  const statTotalFindings = document.getElementById('stat-total-findings');
  const statAvgScore = document.getElementById('stat-avg-score');
  const categoryBarsContainer = document.getElementById('category-bars-container');
  const riskDistributionContainer = document.getElementById('risk-distribution-container');
  const overviewRecentTableBody = document.getElementById('overview-recent-table-body');

  // History Elements
  const historySearchInput = document.getElementById('history-search-input');
  const historyRiskFilter = document.getElementById('history-risk-filter');
  const historyTableBody = document.getElementById('history-table-body');
  const btnExportHistory = document.getElementById('btn-export-history');
  const btnClearHistoryPage = document.getElementById('btn-clear-history-page');

  // Report Elements
  const reportEmptyState = document.getElementById('report-empty-state');
  const reportActiveContainer = document.getElementById('report-active-container');
  const reportDomain = document.getElementById('report-domain');
  const reportUrl = document.getElementById('report-url');
  const reportTimestamp = document.getElementById('report-timestamp');
  const reportScoreNum = document.getElementById('report-score-num');
  const reportRiskBadge = document.getElementById('report-risk-badge');
  const reportRawPoints = document.getElementById('report-raw-points');
  const reportSummaryText = document.getElementById('report-summary-text');
  const reportCategoryTags = document.getElementById('report-category-tags');
  const reportFindingsCount = document.getElementById('report-findings-count');
  const reportFindingsList = document.getElementById('report-findings-list');

  // Settings Elements
  const dashPrefHighlight = document.getElementById('dash-pref-highlight');
  const dashPrefHistory = document.getElementById('dash-pref-history');
  const btnDashClearData = document.getElementById('btn-dash-clear-data');

  // Initialize Detector in browser
  const detector = new window.ClickTrapDetector(window.ClickTrapRules);

  // State
  let storedScans = [];
  let userSettings = { highlightingEnabled: true, historyEnabled: true };
  let selectedScanReport = null;

  // -------------------------------------------------------------
  // 1. DATA ACCESS & STORAGE ADAPTER
  // -------------------------------------------------------------
  async function loadData() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const data = await chrome.storage.local.get(['scanHistory', 'settings']);
        storedScans = data.scanHistory || [];
        userSettings = data.settings || userSettings;
      } catch (err) {
        fallbackLocalStorage();
      }
    } else {
      fallbackLocalStorage();
    }

    if (dashPrefHighlight) dashPrefHighlight.checked = userSettings.highlightingEnabled !== false;
    if (dashPrefHistory) dashPrefHistory.checked = userSettings.historyEnabled !== false;

    renderOverview();
    renderHistoryTable();
  }

  function fallbackLocalStorage() {
    try {
      const scansStr = localStorage.getItem('clicktrap_scans');
      storedScans = scansStr ? JSON.parse(scansStr) : [];
      const setStr = localStorage.getItem('clicktrap_settings');
      userSettings = setStr ? JSON.parse(setStr) : userSettings;
    } catch (e) {
      storedScans = [];
    }
  }

  async function persistScans() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ scanHistory: storedScans });
    } else {
      localStorage.setItem('clicktrap_scans', JSON.stringify(storedScans));
    }
    renderOverview();
    renderHistoryTable();
  }

  async function persistSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ settings: userSettings });
    } else {
      localStorage.setItem('clicktrap_settings', JSON.stringify(userSettings));
    }
  }

  // -------------------------------------------------------------
  // 2. NAVIGATION & TABS
  // -------------------------------------------------------------
  const pageTitles = {
    scanner: { title: 'Scan Any Website', sub: 'Enter a website URL or select a test page to inspect deceptive UI patterns.' },
    overview: { title: 'Overview Dashboard', sub: 'Real-time telemetry and deceptive pattern distribution across inspected websites.' },
    report: { title: 'Forensic Scan Report', sub: 'In-depth evidence, element selectors, and actionable advice for a specific webpage.' },
    history: { title: 'Local Scan History', sub: 'Filter, inspect, and manage forensic scans stored securely on your machine.' },
    learn: { title: 'Dark Pattern Defense Handbook', sub: 'Educational cards and defense strategies for all six recognized deception categories.' },
    settings: { title: 'Settings & Privacy Transparency', sub: 'Client-side permission breakdowns, storage controls, and data erasure.' }
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const pageKey = item.getAttribute('data-page');
      switchPage(pageKey);
    });
  });

  function switchPage(pageKey) {
    navItems.forEach(n => n.classList.toggle('active', n.getAttribute('data-page') === pageKey));
    viewPanels.forEach(p => p.classList.toggle('active', p.id === `page-${pageKey}`));

    if (pageTitles[pageKey]) {
      if (pageHeading) pageHeading.textContent = pageTitles[pageKey].title;
      if (pageSubheading) pageSubheading.textContent = pageTitles[pageKey].sub;
    }

    if (pageKey === 'overview') renderOverview();
    if (pageKey === 'history') renderHistoryTable();
    if (pageKey === 'learn') renderEducationalCards();
  }

  // -------------------------------------------------------------
  // 3. SCANNER ENGINE: SCAN ANY WEBSITE
  // -------------------------------------------------------------
  if (urlScanForm) {
    urlScanForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const targetUrl = targetUrlInput.value.trim();
      if (!targetUrl) return;
      await executeWebsiteScan(targetUrl);
    });
  }

  // Quick sample pill buttons
  samplePillBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const sampleUrl = btn.getAttribute('data-url');
      if (sampleUrl) {
        targetUrlInput.value = sampleUrl;
        await executeWebsiteScan(sampleUrl);
      }
    });
  });

  // Toggle HTML paste box
  if (btnTogglePaste && pasteHtmlContainer) {
    btnTogglePaste.addEventListener('click', () => {
      pasteHtmlContainer.classList.toggle('hidden');
      btnTogglePaste.textContent = pasteHtmlContainer.classList.contains('hidden')
        ? 'Show HTML Paste Box'
        : 'Hide HTML Paste Box';
    });
  }

  // Scan raw HTML button
  if (btnScanRawHtml && rawHtmlInput) {
    btnScanRawHtml.addEventListener('click', () => {
      const rawHtml = rawHtmlInput.value.trim();
      if (!rawHtml) {
        showScanAlert('Please paste some HTML code to inspect.', 'error');
        return;
      }
      scanHtmlLocally(rawHtml, 'Pasted HTML Snippet');
    });
  }

  /**
   * Main scan routine: Handles live remote websites, local server API, and local test files
   */
  async function executeWebsiteScan(rawUrl) {
    let targetUrl = rawUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('../') && !targetUrl.startsWith('./')) {
      targetUrl = 'https://' + targetUrl;
    }

    setScanLoading(true, `Analyzing ${targetUrl}...`);
    showScanAlert(`Connecting to ${targetUrl}...`, 'info');

    try {
      // 1. If URL is a local test fixture or relative file
      if (targetUrl.startsWith('../test-pages/') || targetUrl.startsWith('./test-pages/') || targetUrl.includes('.html')) {
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error(`Could not load local fixture (${response.status})`);
        const html = await response.text();
        scanHtmlLocally(html, targetUrl);
        setScanLoading(false);
        return;
      }

      // 2. If running with ClickTrap local backend server (server.js on localhost)
      // Check if server API endpoint is accessible
      try {
        const apiResponse = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl }),
          signal: AbortSignal.timeout(12000)
        });

        if (apiResponse.ok) {
          const result = await apiResponse.json();
          if (result.report) {
            handleScanSuccess(result.report);
            setScanLoading(false);
            return;
          }
        }
      } catch (serverErr) {
        // If server is not running, proceed to client fallback
      }

      // 3. Fallback: Direct browser fetch or public CORS proxy
      try {
        const directResp = await fetch(targetUrl, { signal: AbortSignal.timeout(8000) });
        if (directResp.ok) {
          const html = await directResp.text();
          scanHtmlLocally(html, targetUrl);
          setScanLoading(false);
          return;
        }
      } catch (corsErr) {
        // Attempt fetch via free public CORS proxy for live demonstration
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        const proxyResp = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
        if (proxyResp.ok) {
          const html = await proxyResp.text();
          scanHtmlLocally(html, targetUrl);
          setScanLoading(false);
          return;
        }
      }

      throw new Error('Browser blocked cross-origin access. Start the local server by running `npm start` in your terminal to scan any live URL, or use our pre-built test pages below!');

    } catch (err) {
      console.error('[ClickTrap Scanner Error]', err);
      showScanAlert(`Scan notice: ${err.message}`, 'error');
      setScanLoading(false);
    }
  }

  /**
   * Parse HTML string in browser DOM and run detector engine
   */
  function scanHtmlLocally(htmlString, sourceUrl) {
    try {
      const parser = new DOMParser();
      const parsedDoc = parser.parseFromString(htmlString, 'text/html');
      const report = detector.scanDocument(parsedDoc, sourceUrl);

      // Clean serialized report
      const cleanReport = {
        id: `scan-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        domain: report.domain || 'webpage',
        url: sourceUrl,
        timestamp: new Date().toISOString(),
        score: report.score,
        rawScore: report.rawScore,
        level: report.level,
        findingsCount: report.findingsCount,
        summary: report.summary,
        categoryDistribution: report.categoryDistribution,
        findings: report.findings.map(f => ({
          id: f.id,
          ruleId: f.ruleId,
          ruleName: f.ruleName,
          category: f.category,
          categoryName: f.categoryName,
          severity: f.severity,
          weight: f.weight,
          evidence: f.evidence,
          explanation: f.explanation,
          recommendedAction: f.recommendedAction
        }))
      };

      handleScanSuccess(cleanReport);
    } catch (e) {
      showScanAlert(`Failed to analyze HTML: ${e.message}`, 'error');
    }
  }

  /**
   * Save successful scan, notify user, and transition to report view
   */
  async function handleScanSuccess(report) {
    showScanAlert(`Scan complete! Found ${report.findingsCount} signals (${report.level.label}). Opening report...`, 'success');

    // Add to history
    storedScans = [report, ...storedScans.filter(s => s.url !== report.url)].slice(0, 100);
    await persistScans();

    setTimeout(() => {
      openReport(report);
      scanStatusAlert.classList.add('hidden');
    }, 600);
  }

  function setScanLoading(loading, message = 'Scanning...') {
    if (loading) {
      btnSubmitUrlScan.disabled = true;
      scanBtnIcon.textContent = '⏳';
      scanBtnText.textContent = message;
    } else {
      btnSubmitUrlScan.disabled = false;
      scanBtnIcon.textContent = '🔍';
      scanBtnText.textContent = 'Scan Website Now';
    }
  }

  function showScanAlert(text, type = 'info') {
    scanStatusAlert.textContent = text;
    scanStatusAlert.className = `scan-alert ${type}`;
    scanStatusAlert.classList.remove('hidden');
  }

  // -------------------------------------------------------------
  // 4. OVERVIEW STATS & CHARTS
  // -------------------------------------------------------------
  function renderOverview() {
    const total = storedScans.length;
    const uniqueDomains = new Set(storedScans.map(s => s.domain)).size;
    let totalFindings = 0;
    let scoreSum = 0;

    const catCounts = {
      fake_urgency: 0,
      scarcity_manipulation: 0,
      cookie_consent: 0,
      hidden_costs: 0,
      confirmshaming: 0,
      obstructive_cancellation: 0
    };

    const riskTiers = { low: 0, moderate: 0, high: 0, 'very-high': 0 };

    storedScans.forEach(scan => {
      scoreSum += (scan.score || 0);
      totalFindings += (scan.findingsCount || 0);

      const levelKey = scan.level?.level || 'low';
      if (riskTiers[levelKey] !== undefined) riskTiers[levelKey]++;

      if (scan.categoryDistribution) {
        Object.keys(scan.categoryDistribution).forEach(k => {
          if (catCounts[k] !== undefined) catCounts[k] += scan.categoryDistribution[k];
        });
      }
    });

    const avgScore = total > 0 ? Math.round(scoreSum / total) : 0;

    if (statTotalScans) statTotalScans.textContent = total;
    if (statUniqueSites) statUniqueSites.textContent = uniqueDomains;
    if (statTotalFindings) statTotalFindings.textContent = totalFindings;
    if (statAvgScore) statAvgScore.textContent = `${avgScore}/100`;

    // Render Category Distribution Bars
    if (categoryBarsContainer) {
      categoryBarsContainer.innerHTML = '';
      const categoriesDef = window.ClickTrapRules.CATEGORIES;
      const maxCount = Math.max(1, ...Object.values(catCounts));

      Object.keys(categoriesDef).forEach(k => {
        const cat = categoriesDef[k];
        const count = catCounts[cat.id] || 0;
        const pct = Math.round((count / maxCount) * 100);

        const row = document.createElement('div');
        row.className = 'cat-bar-item';
        row.innerHTML = `
          <div class="cat-bar-meta">
            <span class="cat-bar-name">${cat.name}</span>
            <span class="cat-bar-count">${count} detected</span>
          </div>
          <div class="cat-bar-track">
            <div class="cat-bar-fill" style="width: ${pct}%; background-color: ${cat.color};"></div>
          </div>
        `;
        categoryBarsContainer.appendChild(row);
      });
    }

    // Render Risk Tiers Grid
    if (riskDistributionContainer) {
      riskDistributionContainer.innerHTML = `
        <div class="risk-tier-box tier-low">
          <span class="risk-tier-label" style="color: var(--risk-low);">Low Suspicion (0-24)</span>
          <span class="risk-tier-count">${riskTiers['low']}</span>
        </div>
        <div class="risk-tier-box tier-moderate">
          <span class="risk-tier-label" style="color: var(--risk-mod);">Moderate Suspicion (25-49)</span>
          <span class="risk-tier-count">${riskTiers['moderate']}</span>
        </div>
        <div class="risk-tier-box tier-high">
          <span class="risk-tier-label" style="color: var(--risk-high);">High Suspicion (50-74)</span>
          <span class="risk-tier-count">${riskTiers['high']}</span>
        </div>
        <div class="risk-tier-box tier-very-high">
          <span class="risk-tier-label" style="color: var(--risk-very-high);">Very High (75-100)</span>
          <span class="risk-tier-count">${riskTiers['very-high']}</span>
        </div>
      `;
    }

    // Render Recent Table (Last 5)
    if (overviewRecentTableBody) {
      overviewRecentTableBody.innerHTML = '';
      const recentScans = storedScans.slice(0, 5);

      if (recentScans.length === 0) {
        overviewRecentTableBody.innerHTML = `
          <tr><td colspan="6" class="text-center text-muted">No scan history recorded yet. Enter a website URL on the Scan Website tab to start.</td></tr>
        `;
      } else {
        recentScans.forEach(scan => {
          const tr = document.createElement('tr');
          const dateStr = scan.timestamp ? new Date(scan.timestamp).toLocaleDateString() : 'Recent';
          const badgeClass = scan.level?.badgeClass || 'badge-low';
          const badgeLabel = scan.level?.label || 'Low Suspicion';

          tr.innerHTML = `
            <td class="domain-cell">${escapeHtml(scan.domain || 'webpage')}</td>
            <td>${dateStr}</td>
            <td><strong>${scan.score || 0}</strong></td>
            <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
            <td>${scan.findingsCount || 0}</td>
            <td>
              <button class="btn btn-secondary btn-sm inspect-btn">Inspect Report</button>
            </td>
          `;

          tr.querySelector('.inspect-btn').addEventListener('click', () => {
            openReport(scan);
          });

          overviewRecentTableBody.appendChild(tr);
        });
      }
    }
  }

  // -------------------------------------------------------------
  // 5. SCAN REPORT VIEW
  // -------------------------------------------------------------
  function openReport(scan) {
    selectedScanReport = scan;
    switchPage('report');

    if (!scan) {
      reportEmptyState.classList.remove('hidden');
      reportActiveContainer.classList.add('hidden');
      return;
    }

    reportEmptyState.classList.add('hidden');
    reportActiveContainer.classList.remove('hidden');

    reportDomain.textContent = scan.domain || 'Scanned Domain';
    reportUrl.textContent = scan.url || scan.domain || '';
    reportTimestamp.textContent = `Scanned on ${scan.timestamp ? new Date(scan.timestamp).toLocaleString() : 'Recent'}`;

    const score = scan.score || 0;
    reportScoreNum.textContent = score;

    const level = scan.level || window.ClickTrapRules.getRiskLevel(score);
    reportRiskBadge.textContent = level.label;
    reportRiskBadge.className = `badge ${level.badgeClass}`;
    reportRawPoints.textContent = `Raw weight: ${scan.rawScore || score} pts`;

    const dial = document.querySelector('.report-dial');
    if (dial) dial.style.borderColor = level.color;

    reportSummaryText.textContent = scan.summary || 'Scan completed.';
    reportFindingsCount.textContent = scan.findingsCount || 0;

    // Render Category Tags
    reportCategoryTags.innerHTML = '';
    if (scan.categoryDistribution) {
      Object.keys(scan.categoryDistribution).forEach(catId => {
        const count = scan.categoryDistribution[catId];
        if (count > 0) {
          const catDef = Object.values(window.ClickTrapRules.CATEGORIES).find(c => c.id === catId);
          const tag = document.createElement('span');
          tag.className = 'cat-tag-pill';
          tag.textContent = `${catDef ? catDef.name : catId} (${count})`;
          reportCategoryTags.appendChild(tag);
        }
      });
    }

    // Render Itemized Findings List
    reportFindingsList.innerHTML = '';
    if (!scan.findings || scan.findings.length === 0) {
      reportFindingsList.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-secondary);">
          Clean layout verified. No manipulative interface signals were detected during this scan.
        </div>
      `;
    } else {
      scan.findings.forEach(finding => {
        const fCard = document.createElement('div');
        fCard.className = 'forensic-card';

        fCard.innerHTML = `
          <div class="forensic-header">
            <span class="forensic-rule-name">${escapeHtml(finding.ruleName || finding.ruleId)}</span>
            <span class="badge ${finding.severity === 'high' ? 'badge-very-high' : finding.severity === 'medium' ? 'badge-high' : 'badge-low'}">
              ${escapeHtml(finding.severity || 'Medium')}
            </span>
          </div>
          ${finding.evidence ? `<div class="evidence-quote">"${escapeHtml(finding.evidence)}"</div>` : ''}
          <p class="forensic-desc">${escapeHtml(finding.explanation)}</p>
          ${finding.recommendedAction ? `
            <div class="forensic-action-box">
              <strong>Consumer Defense Tip:</strong> ${escapeHtml(finding.recommendedAction)}
            </div>
          ` : ''}
        `;
        reportFindingsList.appendChild(fCard);
      });
    }
  }

  // -------------------------------------------------------------
  // 6. SCAN HISTORY TABLE & ACTIONS
  // -------------------------------------------------------------
  function renderHistoryTable() {
    if (!historyTableBody) return;
    historyTableBody.innerHTML = '';

    const query = (historySearchInput?.value || '').trim().toLowerCase();
    const filterTier = historyRiskFilter?.value || 'all';

    let filtered = storedScans.filter(s => {
      const matchesQuery = !query ||
        (s.domain && s.domain.toLowerCase().includes(query)) ||
        (s.url && s.url.toLowerCase().includes(query)) ||
        (s.summary && s.summary.toLowerCase().includes(query));

      const matchesTier = filterTier === 'all' || s.level?.level === filterTier;
      return matchesQuery && matchesTier;
    });

    if (filtered.length === 0) {
      historyTableBody.innerHTML = `
        <tr><td colspan="6" class="text-center text-muted">No scans matching criteria.</td></tr>
      `;
      return;
    }

    filtered.forEach(scan => {
      const tr = document.createElement('tr');
      const dateStr = scan.timestamp ? new Date(scan.timestamp).toLocaleString() : 'Unknown';
      const badgeClass = scan.level?.badgeClass || 'badge-low';
      const badgeLabel = scan.level?.label || 'Low Suspicion';

      tr.innerHTML = `
        <td>
          <span class="domain-cell">${escapeHtml(scan.domain)}</span>
          <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(scan.url || '')}</div>
        </td>
        <td>${dateStr}</td>
        <td><strong>${scan.score}</strong>/100</td>
        <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
        <td>${scan.findingsCount} signals</td>
        <td>
          <div class="action-row-btns">
            <button class="btn btn-secondary btn-sm btn-view-rep">Report</button>
            <button class="btn btn-danger-outline btn-sm btn-del-scan" title="Delete entry">&times;</button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-view-rep').addEventListener('click', () => openReport(scan));
      tr.querySelector('.btn-del-scan').addEventListener('click', async () => {
        if (confirm(`Delete scan for ${scan.domain}?`)) {
          storedScans = storedScans.filter(s => s.id !== scan.id);
          await persistScans();
        }
      });

      historyTableBody.appendChild(tr);
    });
  }

  if (historySearchInput) historySearchInput.addEventListener('input', renderHistoryTable);
  if (historyRiskFilter) historyRiskFilter.addEventListener('change', renderHistoryTable);

  if (btnClearHistoryPage) {
    btnClearHistoryPage.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete all stored scan history? This action cannot be reversed.')) {
        storedScans = [];
        await persistScans();
      }
    });
  }

  if (btnExportHistory) {
    btnExportHistory.addEventListener('click', () => {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(storedScans, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `clicktrap-scan-history-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }

  // -------------------------------------------------------------
  // 7. LEARN ABOUT DARK PATTERNS & INTERACTIVE QUIZ
  // -------------------------------------------------------------
  const EDU_DATA = [
    {
      category: 'fake_urgency',
      name: 'Fake Urgency',
      color: '#FF6B6B',
      definition: 'Artificial time limits or countdown timers that simulate imminent expiration to induce purchase panic without an authentic operational cutoff.',
      example: '"Offer expires in 01:59 minutes! Buy now before the timer ends!"',
      psychology: 'Exploits Scarcity Heuristic and Loss Aversion. Urgency narrows cognitive focus, suppressing deliberative price comparisons.',
      howToSpot: 'Notice if refreshing the browser resets the clock or if identical deals persist hours later.',
      defense: 'Recognize the adrenaline spike as an engineered trigger. Bookmark the item and return after 30 minutes to evaluate rational necessity.'
    },
    {
      category: 'scarcity_manipulation',
      name: 'Scarcity Manipulation',
      color: '#FFA94D',
      definition: 'Fabricated or exaggerated claims of minimal remaining stock, limited seats, or competing real-time viewers.',
      example: '"Only 1 room left at this price! 18 people are viewing this right now!"',
      psychology: 'Triggers Social Proof and Fear of Missing Out (FOMO). We subconsciously equate high demand with superior value.',
      howToSpot: 'Look for generalized alerts that appear instantaneously on every single product page without real inventory variation.',
      defense: 'Assume social proof counters are unverified marketing assertions. Check secondary retailer listings to verify true inventory.'
    },
    {
      category: 'cookie_consent',
      name: 'Cookie Consent Manipulation',
      color: '#748FFC',
      definition: 'Interface asymmetry in privacy dialogs where accepting tracking is a 1-click prominent action, while rejecting is buried in nested menus.',
      example: 'A vibrant green "Accept All" button paired with a tiny, low-contrast gray text link labeled "Manage Options".',
      psychology: 'Exploits Friction Asymmetry and Status Quo Bias. Users choose the path of least physical effort when fatigued by popups.',
      howToSpot: 'Examine whether rejecting tracking takes equal or more clicks than accepting.',
      defense: 'Click "Manage Preferences" and ensure advertising and profiling cookies are toggled off.'
    },
    {
      category: 'hidden_costs',
      name: 'Hidden or Late-Disclosed Costs (Drip Pricing)',
      color: '#F59F00',
      definition: 'Revealing compulsory service fees, handling surcharges, or pre-checking paid add-ons at the final stage of payment.',
      example: '$35 room advertised, but a mandatory $18 resort fee and $5.99 pre-checked insurance are appended at payment.',
      psychology: 'Exploits Sunk Cost Fallacy. After investing 15 minutes entering shipping details, users feel reluctant to abandon the checkout.',
      howToSpot: 'Compare the initial advertised search price against the final invoice line item total.',
      defense: 'Calculate the true all-inclusive cost before providing credit card information.'
    },
    {
      category: 'confirmshaming',
      name: 'Confirmshaming & Manipulative Language',
      color: '#E64980',
      definition: 'Emotionally manipulative opt-out language designed to make users feel foolish, reckless, or guilty for declining an offer.',
      example: '"No thanks, I don\'t care about saving money" or "No, I prefer paying full price".',
      psychology: 'Appeals to Social Approval and Ego Preservation. Declining is framed as an admission of personal deficiency.',
      howToSpot: 'Refusal links phrased as negative first-person admissions ("I hate discounts", "I don\'t want success").',
      defense: 'Decline without emotional hesitation; this is an automated manipulation script designed by marketing behavioral teams.'
    },
    {
      category: 'obstructive_cancellation',
      name: 'Obstructive Cancellation (Roach Motel)',
      color: '#9775FA',
      definition: 'Interfaces that make entering a recurring paid subscription instant and frictionless online, but make canceling arduous.',
      example: 'Sign up in 30 seconds online, but cancellation requires calling a restricted phone desk or sending postal mail.',
      psychology: 'Exploits Procedural Friction. Making cancellation tedious causes subscribers to delay action, paying months of unused fees.',
      howToSpot: 'Review cancellation terms before entering payment credentials during signup.',
      defense: 'Document all cancellation attempts. If blocked by artificial barriers, contact payment providers to halt recurring authorization.'
    }
  ];

  function renderEducationalCards() {
    const container = document.getElementById('edu-cards-container');
    if (!container) return;
    container.innerHTML = '';

    EDU_DATA.forEach(item => {
      const card = document.createElement('div');
      card.className = 'edu-card';
      card.innerHTML = `
        <div class="edu-cat-header">
          <span class="edu-color-pip" style="background-color: ${item.color};"></span>
          <h3>${escapeHtml(item.name)}</h3>
        </div>
        <p class="edu-def">${escapeHtml(item.definition)}</p>

        <div class="edu-section-title">Realistic Deceptive Example</div>
        <div class="edu-example-box">${escapeHtml(item.example)}</div>

        <div class="edu-section-title">Cognitive Mechanism</div>
        <p class="edu-desc-item">${escapeHtml(item.psychology)}</p>

        <div class="edu-section-title">Red Flag Identification</div>
        <p class="edu-desc-item">${escapeHtml(item.howToSpot)}</p>

        <div class="edu-tip-box">
          <strong>Recommended Defense:</strong> ${escapeHtml(item.defense)}
        </div>
      `;
      container.appendChild(card);
    });
  }

  // Interactive Quiz
  const QUIZ_QUESTIONS = [
    {
      q: 'You are reserving a hotel room. A banner says "Only 1 room left! 14 people are viewing this right now." Which pattern is this?',
      options: ['Fake Urgency', 'Scarcity Manipulation', 'Obstructive Cancellation', 'Confirmshaming'],
      correct: 1,
      explanation: 'Scarcity Manipulation leverages artificial inventory limitations and fake social viewer counts to induce FOMO.'
    },
    {
      q: 'A newsletter modal asks for your email. The decline button reads "No thanks, I prefer paying full price." Which pattern is this?',
      options: ['Confirmshaming', 'Hidden Costs', 'Cookie Manipulation', 'Fake Urgency'],
      correct: 0,
      explanation: 'Confirmshaming uses guilt-inducing or humiliating language on opt-out buttons to coerce compliance.'
    },
    {
      q: 'A cookie banner offers a giant green "Accept All" button, but the only way to decline is a tiny gray link labeled "Settings". Which pattern is this?',
      options: ['Drip Pricing', 'Cookie Consent Manipulation (Asymmetry)', 'Roach Motel', 'Sneak into Basket'],
      correct: 1,
      explanation: 'Visual asymmetry nudges users into accepting pervasive tracking by making the reject option visually subdued.'
    },
    {
      q: 'You can subscribe to a magazine online with 1 click, but the cancellation terms state "Cancellations only accepted via physical letter to our headquarters." What is this?',
      options: ['Obstructive Cancellation (Roach Motel)', 'Scarcity Manipulation', 'Confirmshaming', 'Ethical Marketing'],
      correct: 0,
      explanation: 'The Roach Motel makes joining effortless while placing severe friction hurdles on cancellation.'
    }
  ];

  let currentQuizIdx = 0;
  const quizQuestion = document.getElementById('quiz-question');
  const quizOptions = document.getElementById('quiz-options');
  const quizFeedback = document.getElementById('quiz-feedback');
  const btnNextQuiz = document.getElementById('btn-next-quiz');

  function renderQuizQuestion() {
    if (!quizQuestion || !quizOptions) return;
    const qData = QUIZ_QUESTIONS[currentQuizIdx];
    quizQuestion.textContent = `${currentQuizIdx + 1}. ${qData.q}`;
    quizOptions.innerHTML = '';
    quizFeedback.classList.add('hidden');
    btnNextQuiz.classList.add('hidden');

    qData.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.textContent = opt;
      btn.onclick = () => selectQuizAnswer(idx, qData);
      quizOptions.appendChild(btn);
    });
  }

  function selectQuizAnswer(selectedIdx, qData) {
    const buttons = quizOptions.querySelectorAll('.quiz-opt-btn');
    buttons.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === qData.correct) btn.classList.add('correct');
      else if (idx === selectedIdx) btn.classList.add('incorrect');
    });

    const isCorrect = selectedIdx === qData.correct;
    quizFeedback.classList.remove('hidden');
    quizFeedback.style.backgroundColor = isCorrect ? 'rgba(53, 214, 194, 0.15)' : 'rgba(255, 107, 107, 0.15)';
    quizFeedback.style.border = `1px solid ${isCorrect ? 'var(--accent-teal)' : 'var(--risk-very-high)'}`;
    quizFeedback.style.color = isCorrect ? 'var(--accent-teal)' : 'var(--risk-very-high)';
    quizFeedback.innerHTML = `<strong>${isCorrect ? 'Correct!' : 'Incorrect.'}</strong> ${qData.explanation}`;

    btnNextQuiz.classList.remove('hidden');
  }

  if (btnNextQuiz) {
    btnNextQuiz.addEventListener('click', () => {
      currentQuizIdx = (currentQuizIdx + 1) % QUIZ_QUESTIONS.length;
      renderQuizQuestion();
    });
  }

  // -------------------------------------------------------------
  // 8. SETTINGS & GUIDE CONTROLS
  // -------------------------------------------------------------
  if (btnQuickScanGuide) btnQuickScanGuide.addEventListener('click', () => guideModal.classList.remove('hidden'));
  if (btnCloseGuide) btnCloseGuide.addEventListener('click', () => guideModal.classList.add('hidden'));
  if (guideModal) {
    guideModal.addEventListener('click', (e) => {
      if (e.target === guideModal) guideModal.classList.add('hidden');
    });
  }

  if (dashPrefHighlight) {
    dashPrefHighlight.addEventListener('change', async () => {
      userSettings.highlightingEnabled = dashPrefHighlight.checked;
      await persistSettings();
    });
  }

  if (dashPrefHistory) {
    dashPrefHistory.addEventListener('change', async () => {
      userSettings.historyEnabled = dashPrefHistory.checked;
      await persistSettings();
    });
  }

  if (btnDashClearData) {
    btnDashClearData.addEventListener('click', async () => {
      if (confirm('Are you sure you want to erase all ClickTrap data, scans, and settings?')) {
        storedScans = [];
        userSettings = { highlightingEnabled: true, historyEnabled: true };
        await persistScans();
        await persistSettings();
        alert('All local ClickTrap data has been erased.');
      }
    });
  }

  // Utility to escape HTML strings safely
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial Load
  await loadData();
  renderQuizQuestion();
  renderEducationalCards();
});
