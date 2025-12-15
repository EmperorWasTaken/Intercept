import { applyRules, clearAllRules } from './rules.js';
import { 
  loadAllProfiles, 
  saveAllProfiles, 
  getActiveProfileId, 
  setActiveProfileId,
  getGlobalEnabled,
  migrateFromLocalStorage 
} from './storage.js';
import { trackProfileActivation } from './stats.js';

const defaultProfile = {
  id: 'default',
  name: 'Default Profile',
  active: true,
  requestHeaders: [],
  responseHeaders: [],
  redirects: [],
  blocks: [],
  filters: []
};

async function updateBadge() {
  const globalEnabled = await getGlobalEnabled();
  
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
  const profiles = await loadAllProfiles();
  
  if (!profiles || profiles.length === 0) {
    await saveAllProfiles([defaultProfile]);
    await setActiveProfileId('default');
  }
}

async function loadActiveProfile() {
  try {
    await migrateFromLocalStorage();
    await initializeStorage();
    
    const profiles = await loadAllProfiles();
    const activeProfileId = await getActiveProfileId();
    const globalEnabled = await getGlobalEnabled();
    
    if (!profiles || !Array.isArray(profiles)) {
      console.error('Intercept: No profiles found after initialization');
      return;
    }
    
    if (globalEnabled === false) {
      await clearAllRules();
      await updateBadge();
      return;
    }
    
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    
    if (activeProfile) {
      await applyRules(activeProfile);
      await trackProfileActivation(activeProfile.id, activeProfile.name);
    } else {
      console.error('Intercept: Active profile not found:', activeProfileId);
    }
    
    await updateBadge();
  } catch (error) {
    console.error('Intercept: Failed to load profile:', error);
  }
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
