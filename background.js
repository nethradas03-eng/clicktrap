/**
 * ClickTrap - Dark Pattern Detector
 * background.js - Extension Service Worker (Manifest V3)
 */

const DEFAULT_SETTINGS = {
  highlightingEnabled: true,
  historyEnabled: true,
  maxHistoryItems: 100,
  theme: 'dark',
  lastUpdated: new Date().toISOString()
};

// Initialize default storage on installation
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[ClickTrap] Extension installed/updated:', details.reason);
  const data = await chrome.storage.local.get(['settings', 'scanHistory', 'userFeedback']);
  
  if (!data.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  if (!data.scanHistory) {
    await chrome.storage.local.set({ scanHistory: [] });
  }
  if (!data.userFeedback) {
    await chrome.storage.local.set({ userFeedback: [] });
  }
});

// Central Message Dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleAsyncMessage = async () => {
    switch (message.action) {
      case 'GET_SETTINGS': {
        const { settings } = await chrome.storage.local.get('settings');
        return settings || DEFAULT_SETTINGS;
      }

      case 'UPDATE_SETTINGS': {
        const { settings } = await chrome.storage.local.get('settings');
        const updated = { ...settings, ...message.payload, lastUpdated: new Date().toISOString() };
        await chrome.storage.local.set({ settings: updated });
        return updated;
      }

      case 'SAVE_SCAN_RESULT': {
        const { settings } = await chrome.storage.local.get('settings');
        if (settings && settings.historyEnabled === false) {
          return { saved: false, reason: 'history_disabled' };
        }

        const { scanHistory = [] } = await chrome.storage.local.get('scanHistory');
        const newRecord = {
          id: `scan-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          ...message.payload,
          storedAt: new Date().toISOString()
        };

        // Maintain size cap
        const maxItems = settings?.maxHistoryItems || 100;
        const updatedHistory = [newRecord, ...scanHistory].slice(0, maxItems);
        await chrome.storage.local.set({ scanHistory: updatedHistory });

        // Update badge text if tabId is provided
        if (sender.tab && sender.tab.id && newRecord.score !== undefined) {
          updateBadge(sender.tab.id, newRecord.score, newRecord.level?.color);
        }

        return { saved: true, record: newRecord };
      }

      case 'GET_SCAN_HISTORY': {
        const { scanHistory = [] } = await chrome.storage.local.get('scanHistory');
        return scanHistory;
      }

      case 'CLEAR_SCAN_HISTORY': {
        await chrome.storage.local.set({ scanHistory: [] });
        return { success: true };
      }

      case 'DELETE_SCAN_ITEM': {
        const { scanHistory = [] } = await chrome.storage.local.get('scanHistory');
        const filtered = scanHistory.filter(item => item.id !== message.payload.id);
        await chrome.storage.local.set({ scanHistory: filtered });
        return { success: true, remaining: filtered.length };
      }

      case 'RECORD_FEEDBACK': {
        const { userFeedback = [] } = await chrome.storage.local.get('userFeedback');
        const feedbackEntry = {
          id: `fb-${Date.now()}`,
          findingId: message.payload.findingId,
          ruleId: message.payload.ruleId,
          domain: message.payload.domain,
          feedbackType: message.payload.type, // 'helpful' | 'false_positive' | 'missed'
          notes: message.payload.notes || '',
          timestamp: new Date().toISOString()
        };
        const updatedFeedback = [feedbackEntry, ...userFeedback];
        await chrome.storage.local.set({ userFeedback: updatedFeedback });
        return { success: true, feedback: feedbackEntry };
      }

      case 'OPEN_DASHBOARD': {
        const url = chrome.runtime.getURL('dashboard/index.html');
        chrome.tabs.create({ url });
        return { success: true, url };
      }

      default:
        return { error: 'Unknown action: ' + message.action };
    }
  };

  handleAsyncMessage()
    .then(sendResponse)
    .catch(err => {
      console.error('[ClickTrap Background Error]', err);
      sendResponse({ error: err.message });
    });

  return true; // Keep message channel open for async response
});

/**
 * Updates extension icon badge with risk indicator
 */
function updateBadge(tabId, score, color) {
  try {
    const text = score > 0 ? `${score}` : '✓';
    chrome.action.setBadgeText({ tabId, text });
    
    let badgeColor = '#35D6C2';
    if (score >= 75) badgeColor = '#FF6B6B';
    else if (score >= 50) badgeColor = '#FF922B';
    else if (score >= 25) badgeColor = '#F59F00';

    chrome.action.setBadgeBackgroundColor({ tabId, color: badgeColor });
  } catch (err) {
    console.debug('Badge update ignored:', err);
  }
}
