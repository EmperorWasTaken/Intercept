
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
});

async function loadActiveProfile() {
  const { profiles, activeProfileId } = await chrome.storage.local.get(['profiles', 'activeProfileId']);
  
  if (!profiles || !Array.isArray(profiles)) {
    return;
  }
  
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  
  if (activeProfile) {
    await applyRules(activeProfile);
  }
}

chrome.runtime.onStartup.addListener(loadActiveProfile);
loadActiveProfile();

async function applyRules(profile) {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const ruleIdsToRemove = existingRules.map(r => r.id);
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: ruleIdsToRemove,
    addRules: []
  });
  
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
          condition: {
            urlFilter: filter,
            resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest']
          }
        });
      });
    });
  
  profile.redirects
    .filter(r => r.enabled)
    .forEach(redirect => {
      activeFilters.forEach(filter => {
        rulesToAdd.push({
          id: ruleId++,
          priority: 1,
          action: {
            type: 'redirect',
            redirect: { url: redirect.to }
          },
          condition: {
            urlFilter: filter,
            resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest']
          }
        });
      });
    });
  
  if (rulesToAdd.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rulesToAdd
    });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateRules') {
    loadActiveProfile().then(() => sendResponse({ success: true }));
    return true;
  }
});