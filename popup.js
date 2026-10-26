/**
 * ClickTrap - Dark Pattern Detector
 * popup.js - Extension User Interface Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  // Elements
  const viewInitial = document.getElementById('view-initial');
  const viewLoading = document.getElementById('view-loading');
  const viewResults = document.getElementById('view-results');
  const viewRestricted = document.getElementById('view-restricted');
  const viewSettings = document.getElementById('view-settings');

  const currentDomainEl = document.getElementById('current-domain');
  const scanStatusPill = document.getElementById('scan-status-pill');
  const btnStartScan = document.getElementById('btn-start-scan');
  const btnRescan = document.getElementById('btn-rescan');
  const btnClearScan = document.getElementById('btn-clear-scan');
  const btnToggleHighlight = document.getElementById('btn-toggle-highlight');
  const btnHighlightText = document.getElementById('btn-highlight-text');
  const btnOpenDashboard = document.getElementById('btn-open-dashboard');
  const linkFooterDashboard = document.getElementById('link-footer-dashboard');
  const btnToggleSettings = document.getElementById('btn-toggle-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnClearAllHistory = document.getElementById('btn-clear-all-history');
  const btnTestPage = document.getElementById('btn-test-page');

  const scoreNumberEl = document.getElementById('score-number');
  const gaugeFill = document.getElementById('gauge-fill');
  const riskBadge = document.getElementById('risk-badge');
  const findingsSummary = document.getElementById('findings-summary');
  const findingsCountEl = document.getElementById('findings-count');
  const findingsListEl = document.getElementById('findings-list');
  const findingsCleanState = document.getElementById('findings-clean');

  const toggleHighlightPref = document.getElementById('toggle-highlight-pref');
  const toggleHistoryPref = document.getElementById('toggle-history-pref');

  let activeTab = null;
  let currentReport = null;
  let isHighlightActive = false;
  let userSettings = { highlightingEnabled: true, historyEnabled: true };

  // Load Settings
  try {
    userSettings = await chrome.runtime.sendMessage({ action: 'GET_SETTINGS' });
    if (toggleHighlightPref) toggleHighlightPref.checked = userSettings.highlightingEnabled !== false;
    if (toggleHistoryPref) toggleHistoryPref.checked = userSettings.historyEnabled !== false;
  } catch (err) {
    console.debug('Failed to load settings:', err);
  }

  // Get current active tab
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tabs[0];
  } catch (err) {
    console.error('Error querying active tab:', err);
  }

  if (!activeTab || !activeTab.url) {
    showRestricted('Tab Inaccessible', 'Cannot read active tab information.');
    return;
  }

  const url = activeTab.url;
  const isRestricted = url.startsWith('chrome://') ||
                       url.startsWith('edge://') ||
                       url.startsWith('chrome-extension://') ||
                       url.startsWith('about:') ||
                       url.startsWith('view-source:') ||
                       url.includes('chrome.google.com/webstore');

  let domain = 'unknown';
  try {
    domain = new URL(url).hostname || url;
  } catch (e) {
    domain = url.slice(0, 30);
  }
  currentDomainEl.textContent = domain;

  if (isRestricted) {
    showRestricted('Internal Browser Page', 'Browser security prevents extensions from inspecting internal system pages.');
    return;
  }

  // Setup Event Handlers
  btnStartScan.addEventListener('click', () => runScanOnActiveTab());
  btnRescan.addEventListener('click', () => runScanOnActiveTab());
  btnClearScan.addEventListener('click', () => resetToInitial());
  btnToggleHighlight.addEventListener('click', () => toggleHighlights());
  btnOpenDashboard.addEventListener('click', () => openDashboard());
  linkFooterDashboard.addEventListener('click', (e) => { e.preventDefault(); openDashboard(); });
  btnTestPage.addEventListener('click', () => openTestPages());

  // Settings Drawer Handlers
  btnToggleSettings.addEventListener('click', () => viewSettings.classList.toggle('hidden'));
  btnCloseSettings.addEventListener('click', () => viewSettings.classList.add('hidden'));

  toggleHighlightPref.addEventListener('change', async () => {
    userSettings.highlightingEnabled = toggleHighlightPref.checked;
    await chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', payload: { highlightingEnabled: userSettings.highlightingEnabled } });
  });

  toggleHistoryPref.addEventListener('change', async () => {
    userSettings.historyEnabled = toggleHistoryPref.checked;
    await chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', payload: { historyEnabled: userSettings.historyEnabled } });
  });

  btnClearAllHistory.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete all saved scan history? This action cannot be undone.')) {
      await chrome.runtime.sendMessage({ action: 'CLEAR_SCAN_HISTORY' });
      alert('Local scan history has been cleared.');
      viewSettings.classList.add('hidden');
    }
  });

  /**
   * Run Scan on Active Tab with Injection Fallback
   */
  async function runScanOnActiveTab() {
    switchView('loading');
    scanStatusPill.textContent = 'Scanning';
    scanStatusPill.className = 'status-pill ready';

    try {
      // First attempt direct message
      const response = await sendTabMessage({ action: 'RUN_SCAN' });
      handleScanResponse(response);
    } catch (firstErr) {
      // Content script may not be injected yet on existing tabs
      console.log('Injecting content script programmatically...');
      try {
        await chrome.scripting.insertCSS({
          target: { tabId: activeTab.id },
          files: ['content.css']
        });
        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['rules.js', 'detector.js', 'content.js']
        });

        // Retry scan after injection
        setTimeout(async () => {
          try {
            const retryResponse = await sendTabMessage({ action: 'RUN_SCAN' });
            handleScanResponse(retryResponse);
          } catch (retryErr) {
            showRestricted('Scan Error', 'Unable to inspect page content. Please refresh the page and try again.');
          }
        }, 150);
      } catch (injectionErr) {
        showRestricted('Inspection Blocked', 'Could not inject scanner into this page. It may have strict Content Security Policy restrictions.');
      }
    }
  }

  function sendTabMessage(msg) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(activeTab.id, msg, (response) => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve(response);
      });
    });
  }

  /**
   * Process Scan Response and Render Results
   */
  async function handleScanResponse(response) {
    if (!response || !response.report) {
      showRestricted('Scan Error', 'No data returned from scan engine.');
      return;
    }

    currentReport = response.report;
    renderResults(currentReport);
    switchView('results');

    scanStatusPill.textContent = 'Scanned';
    scanStatusPill.className = 'status-pill scanned';

    // Auto-highlight if setting enabled
    if (userSettings.highlightingEnabled && currentReport.findingsCount > 0) {
      await sendTabMessage({ action: 'TOGGLE_HIGHLIGHTS', payload: true });
      isHighlightActive = true;
      updateHighlightButtonState(true);
    }

    // Save scan result to history
    try {
      await chrome.runtime.sendMessage({ action: 'SAVE_SCAN_RESULT', payload: currentReport });
    } catch (saveErr) {
      console.debug('History save skipped:', saveErr);
    }
  }

  /**
   * Render Results View
   */
  function renderResults(report) {
    const score = report.score || 0;
    scoreNumberEl.textContent = score;

    // Animate circular gauge (0 to 100)
    gaugeFill.setAttribute('stroke-dasharray', `${score}, 100`);

    // Risk badge styling
    const level = report.level || window.ClickTrapRules.getRiskLevel(score);
    riskBadge.textContent = level.label;
    riskBadge.className = `badge ${level.badgeClass}`;
    gaugeFill.style.stroke = level.color;

    findingsSummary.textContent = report.summary;
    findingsCountEl.textContent = report.findingsCount;

    // Render findings cards
    findingsListEl.innerHTML = '';
    if (report.findingsCount === 0) {
      findingsCleanState.classList.remove('hidden');
    } else {
      findingsCleanState.classList.add('hidden');
      report.findings.forEach(finding => {
        const card = createFindingCard(finding);
        findingsListEl.appendChild(card);
      });
    }
  }

  /**
   * Build Individual Finding Card Component
   */
  function createFindingCard(finding) {
    const card = document.createElement('div');
    card.className = 'finding-card';

    const topRow = document.createElement('div');
    topRow.className = 'finding-top';

    const catName = document.createElement('span');
    catName.className = 'finding-cat';
    catName.textContent = finding.categoryName || finding.category;

    const sevBadge = document.createElement('span');
    sevBadge.className = `finding-severity severity-${finding.severity || 'medium'}`;
    sevBadge.textContent = finding.severity || 'Medium';

    topRow.appendChild(catName);
    topRow.appendChild(sevBadge);
    card.appendChild(topRow);

    // Evidence quote box
    if (finding.evidence) {
      const evBox = document.createElement('div');
      evBox.className = 'evidence-box';
      evBox.textContent = `"${finding.evidence}"`;
      card.appendChild(evBox);
    }

    // Explanation
    const expText = document.createElement('p');
    expText.className = 'explanation-text';
    expText.textContent = finding.explanation;
    card.appendChild(expText);

    // Action Advice
    if (finding.recommendedAction) {
      const tipBox = document.createElement('div');
      tipBox.className = 'action-tip';
      tipBox.innerHTML = `<strong>Tip:</strong> <span>${finding.recommendedAction}</span>`;
      card.appendChild(tipBox);
    }

    // Feedback Row
    const fbRow = document.createElement('div');
    fbRow.className = 'finding-feedback';
    fbRow.innerHTML = `<span>Feedback:</span>`;

    const fbBtns = document.createElement('div');
    fbBtns.className = 'feedback-buttons';

    const btnHelpful = document.createElement('button');
    btnHelpful.className = 'fb-btn';
    btnHelpful.title = 'Helpful detection';
    btnHelpful.textContent = '👍 Accurate';
    btnHelpful.onclick = () => recordFeedback(finding, 'helpful', btnHelpful);

    const btnFP = document.createElement('button');
    btnFP.className = 'fb-btn';
    btnFP.title = 'Possible false alarm';
    btnFP.textContent = '⚠️ False Alarm';
    btnFP.onclick = () => recordFeedback(finding, 'false_positive', btnFP);

    fbBtns.appendChild(btnHelpful);
    fbBtns.appendChild(btnFP);
    fbRow.appendChild(fbBtns);
    card.appendChild(fbRow);

    return card;
  }

  /**
   * Handle user feedback
   */
  async function recordFeedback(finding, type, clickedBtn) {
    try {
      await chrome.runtime.sendMessage({
        action: 'RECORD_FEEDBACK',
        payload: {
          findingId: finding.id,
          ruleId: finding.ruleId,
          domain: currentReport?.domain || 'page',
          type: type
        }
      });
      const parent = clickedBtn.parentElement;
      Array.from(parent.children).forEach(b => b.classList.remove('selected'));
      clickedBtn.classList.add('selected');
    } catch (err) {
      console.debug('Feedback error:', err);
    }
  }

  /**
   * Toggle Page Highlighting
   */
  async function toggleHighlights() {
    isHighlightActive = !isHighlightActive;
    try {
      await sendTabMessage({ action: 'TOGGLE_HIGHLIGHTS', payload: isHighlightActive });
      updateHighlightButtonState(isHighlightActive);
    } catch (err) {
      console.debug('Highlight toggle failed:', err);
    }
  }

  function updateHighlightButtonState(active) {
    if (active) {
      btnToggleHighlight.classList.add('active');
      btnHighlightText.textContent = 'Hide Highlights';
    } else {
      btnToggleHighlight.classList.remove('active');
      btnHighlightText.textContent = 'Highlight on Page';
    }
  }

  /**
   * Reset UI to initial ready state
   */
  async function resetToInitial() {
    try {
      await sendTabMessage({ action: 'REMOVE_HIGHLIGHTS' });
    } catch (e) {}
    currentReport = null;
    isHighlightActive = false;
    updateHighlightButtonState(false);
    switchView('initial');
    scanStatusPill.textContent = 'Ready';
    scanStatusPill.className = 'status-pill ready';
  }

  function switchView(viewName) {
    viewInitial.classList.add('hidden');
    viewLoading.classList.add('hidden');
    viewResults.classList.add('hidden');
    viewRestricted.classList.add('hidden');

    if (viewName === 'initial') viewInitial.classList.remove('hidden');
    else if (viewName === 'loading') viewLoading.classList.remove('hidden');
    else if (viewName === 'results') viewResults.classList.remove('hidden');
    else if (viewName === 'restricted') viewRestricted.classList.remove('hidden');
  }

  function showRestricted(title, desc) {
    document.getElementById('restricted-title').textContent = title;
    document.getElementById('restricted-desc').textContent = desc;
    scanStatusPill.textContent = 'Restricted';
    scanStatusPill.className = 'status-pill';
    switchView('restricted');
  }

  function openDashboard() {
    chrome.runtime.sendMessage({ action: 'OPEN_DASHBOARD' });
  }

  function openTestPages() {
    const url = chrome.runtime.getURL('test-pages/index.html');
    chrome.tabs.create({ url });
  }
});
