import { applyRules, clearAllRules } from './rules.js';

const defaultProfile = {
  id: 'default',
  name: 'Default Profile',
  active: true,
  requestHeaders: [],
  redirects: [],
  filters: []
};

async function updateBadge() {
  const { globalEnabled } = await chrome.storage.local.get(['globalEnabled']);
  
  if (globalEnabled === false) {
    chrome.action.setIcon({
      path: {
        "16": "images/logo_disabled_16.png",
        "48": "images/logo_disabled_48.png",
        "128": "images/logo_disabled_128.png"
      }
    });
  } else {
    chrome.action.setIcon({
      path: {
        "16": "images/logo_enabled_16.png",
        "48": "images/logo_enabled_48.png",
        "128": "images/logo_enabled_128.png"
      }
    });
  }
}

async function initializeStorage() {
  const { profiles, activeProfileId } = await chrome.storage.local.get(['profiles', 'activeProfileId']);
  
  if (!profiles) {
    await chrome.storage.local.set({
      profiles: [defaultProfile],
      activeProfileId: 'default'
    });
  }
}

async function loadActiveProfile() {
  await initializeStorage();
  
  const { profiles, activeProfileId, globalEnabled } = await chrome.storage.local.get(['profiles', 'activeProfileId', 'globalEnabled']);
  
  if (!profiles || !Array.isArray(profiles)) {
    console.error('Intercept: No profiles found after initialization');
    return;
  }
  
  if (globalEnabled === false) {
    await clearAllRules();
    updateBadge();
    return;
  }
  
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  
  if (activeProfile) {
    await applyRules(activeProfile);
  } else {
    console.error('Intercept: Active profile not found:', activeProfileId);
  }
  
  updateBadge();
}

chrome.runtime.onInstalled.addListener(async () => {
  console.log('Intercept: Extension installed/updated');
  await loadActiveProfile();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('Intercept: Browser started');
  await loadActiveProfile();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateRules') {
    loadActiveProfile().then(() => sendResponse({ success: true }));
    return true;
  }
});
