const EXCLUDED_DOMAINS = [
  "microsoft.com",
  "www.microsoft.com",
  "edge.microsoft.com",
  "login.microsoftonline.com",
  "msedge.net",
  "msedge.api.cdp.microsoft.com"
];

export async function clearAllRules() {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const ruleIdsToRemove = existingRules.map(r => r.id);
  
  if (ruleIdsToRemove.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIdsToRemove,
      addRules: []
    });
  }
}

export async function applyRules(profile) {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    if (existingRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRules.map(r => r.id),
        addRules: []
      });
    }
    
    const rulesToAdd = [];
    let ruleId = Math.floor(Date.now() / 1000);
    
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
        
        rulesToAdd.push({
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
        });
      });
    
    if (rulesToAdd.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rulesToAdd
      });
      console.log(`Intercept: Applied ${rulesToAdd.length} rules`);
    } else {
      console.log('Intercept: No rules to apply');
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
