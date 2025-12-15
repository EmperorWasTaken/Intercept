
const defaultProfile = {
  id: 'default',
  name: 'Default Profile',
  active: true,
  requestHeaders: [],
  redirects: [],
  filters: []
};

chrome.runtime.onInstalled.addListener(async () => {
  const { profiles, activeProfileId } = await chrome.storage.local.get(['profiles', 'activeProfileId']);
  
  if (!profiles) {
    await chrome.storage.local.set({
      profiles: [defaultProfile],
      activeProfileId: 'default'
    });
  }
  
  await loadActiveProfile();
});

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

async function loadActiveProfile() {
  const { profiles, activeProfileId, globalEnabled } = await chrome.storage.local.get(['profiles', 'activeProfileId', 'globalEnabled']);
  
  if (!profiles || !Array.isArray(profiles)) {
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
  }
  
  updateBadge();
}

async function clearAllRules() {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const ruleIdsToRemove = existingRules.map(r => r.id);
  
  if (ruleIdsToRemove.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIdsToRemove,
      addRules: []
    });
  }
}

chrome.runtime.onStartup.addListener(loadActiveProfile);

self.addEventListener('activate', () => {
  loadActiveProfile();
});

loadActiveProfile();

async function applyRules(profile) {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIdsToRemove = existingRules.map(r => r.id);
    
    if (ruleIdsToRemove.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIdsToRemove,
        addRules: []
      });
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const verifyRemoval = await chrome.declarativeNetRequest.getDynamicRules();
    if (verifyRemoval.length > 0) {
      console.error('Intercept: Rules still present after removal, retrying...');
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: verifyRemoval.map(r => r.id),
        addRules: []
      });
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const rulesToAdd = [];
    let ruleId = Math.floor(Date.now() / 1000);
  
    const EXCLUDED_DOMAINS = [
      "microsoft.com",
      "www.microsoft.com",
      "edge.microsoft.com",
      "login.microsoftonline.com",
      "msedge.net",
      "msedge.api.cdp.microsoft.com"
    ];
    
    const activeFilters = (profile.filters || [])
      .filter(f => f.enabled && f.value)
      .map(f => f.value);
    
    if (activeFilters.length === 0) {
      activeFilters.push('*://*/*');
    }
    
    profile.requestHeaders
      .filter(h => h.enabled && h.name && h.value)
      .forEach(header => {
        activeFilters.forEach(filter => {
          const isRegexPattern = /[\[\](){}^$+?|\\]/.test(filter) || /\.\*/.test(filter);
          
          const condition = isRegexPattern
            ? {
                regexFilter: filter,
                resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest'],
                excludedDomains: EXCLUDED_DOMAINS
              }
            : {
                urlFilter: filter,
                resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest'],
                excludedDomains: EXCLUDED_DOMAINS
              };
          
          rulesToAdd.push({
            id: ruleId++,
            priority: 1,
            action: {
              type: 'modifyHeaders',
              requestHeaders: [{
                header: header.name,
                operation: 'set',
                value: header.value
              }]
            },
            condition: condition
          });
        });
      });
    
    profile.redirects
      .filter(r => r.enabled && r.from && r.to)
      .forEach(redirect => {
        const hasSubstitution = /\$\d/.test(redirect.to);
        
        const substitutionUrl = hasSubstitution 
          ? redirect.to.replace(/\$(\d+)/g, '\\$1')
          : redirect.to;
        
        const rule = {
          id: ruleId++,
          priority: 2,
          action: {
            type: 'redirect',
            redirect: hasSubstitution 
              ? { regexSubstitution: substitutionUrl }
              : { url: redirect.to }
          },
          condition: {
            regexFilter: redirect.from,
          resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest'],
          excludedDomains: EXCLUDED_DOMAINS
          }
        };
        
        rulesToAdd.push(rule);
      });
    
    if (rulesToAdd.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rulesToAdd
      });
      console.log(`Intercept: Applied ${rulesToAdd.length} rules`);
    }
  } catch (error) {
    console.error('Intercept: Error applying rules:', error);
    try {
      const rules = await chrome.declarativeNetRequest.getDynamicRules();
      if (rules.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: rules.map(r => r.id),
          addRules: []
        });
      }
    } catch (cleanupError) {
      console.error('Intercept: Error during cleanup:', cleanupError);
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateRules') {
    loadActiveProfile().then(() => sendResponse({ success: true }));
    return true;
  }
});