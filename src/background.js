
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
  
  updateBadge();
});

async function updateBadge() {
  const { globalEnabled } = await chrome.storage.local.get(['globalEnabled']);
  
  if (globalEnabled === false) {
    chrome.action.setBadgeText({ text: '  ' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  } else {
    chrome.action.setBadgeText({ text: '  ' });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
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
loadActiveProfile();

async function applyRules(profile) {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const ruleIdsToRemove = existingRules.map(r => r.id);
  
  if (ruleIdsToRemove.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIdsToRemove,
      addRules: []
    });
  }
  
  const rulesToAdd = [];
  let ruleId = 1;
  
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
              resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest']
            }
          : {
              urlFilter: filter,
              resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest']
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
          resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest']
        }
      };
      
      rulesToAdd.push(rule);
    });
  
  if (rulesToAdd.length > 0) {
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rulesToAdd
      });
    } catch (error) {
      console.error('Error applying rules:', error);
      
      chrome.runtime.sendMessage({ 
        action: 'ruleError', 
        error: error.message 
      }).catch(() => {

      });
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateRules') {
    loadActiveProfile().then(() => sendResponse({ success: true }));
    return true;
  }
});