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
import { validateStoredLicense } from './license.js';
import { supabase } from './supabase.js';

const defaultProfile = {
  id: crypto.randomUUID(),
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
    await setActiveProfileId(defaultProfile.id);
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
  validateStoredLicense();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'updateRules') {
    loadActiveProfile().then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.action === 'startGoogleSignIn') {
    (async () => {
      try {
        const redirectTo = chrome.identity.getRedirectURL();

        const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { skipBrowserRedirect: true, redirectTo },
        });
        if (oauthError) throw oauthError;

        const callbackUrl = await new Promise((resolve, reject) => {
          chrome.identity.launchWebAuthFlow({ url: oauthData.url, interactive: true }, (resultUrl) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else if (!resultUrl) reject(new Error('No callback URL returned'));
            else resolve(resultUrl);
          });
        });

        const cbUrl = new URL(callbackUrl);
        const hashParams = new URLSearchParams(cbUrl.hash.slice(1));
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');

        let user;
        if (access_token) {
          const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          user = data.user;
        } else {
          const { data, error } = await supabase.auth.exchangeCodeForSession(callbackUrl);
          if (error) throw error;
          user = data.user;
        }

        sendResponse({ success: true, user });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.action === 'importSharedProfile') {
    const incoming = message.profile;
    if (!incoming?.name) {
      sendResponse({ success: false });
      return true;
    }
    (async () => {
      try {
        const profiles = await loadAllProfiles();
        const imported = { ...incoming, id: crypto.randomUUID() };
        await saveAllProfiles([...profiles, imported]);
        chrome.runtime.sendMessage({ action: 'profileImported' }).catch(() => {});
        sendResponse({ success: true });
      } catch {
        sendResponse({ success: false });
      }
    })();
    return true;
  }
});
