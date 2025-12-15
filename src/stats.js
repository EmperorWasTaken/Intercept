
async function getStats() {
  const data = await chrome.storage.local.get(['interceptStats']);
  return data.interceptStats || {
    profileActivations: {},
    ruleToggles: {},
    ruleEdits: {},
    lastReset: Date.now()
  };
}

async function saveStats(stats) {
  await chrome.storage.local.set({ 
    interceptStats: stats,
    lastStatsUpdate: Date.now()
  });
}


export async function trackProfileActivation(profileId, profileName) {
  const stats = await getStats();
  stats.profileActivations = stats.profileActivations || {};
  
  if (!stats.profileActivations[profileId]) {
    stats.profileActivations[profileId] = {
      name: profileName,
      count: 0,
      lastActivated: null
    };
  }
  
  stats.profileActivations[profileId].count++;
  stats.profileActivations[profileId].lastActivated = Date.now();
  stats.profileActivations[profileId].name = profileName;
  
  await saveStats(stats);
}

export async function trackRuleToggle(profileId, ruleType, enabled) {
  const stats = await getStats();
  stats.ruleToggles = stats.ruleToggles || {};
  
  const key = `${profileId}_${ruleType}`;
  if (!stats.ruleToggles[key]) {
    stats.ruleToggles[key] = { enabled: 0, disabled: 0 };
  }
  
  if (enabled) {
    stats.ruleToggles[key].enabled++;
  } else {
    stats.ruleToggles[key].disabled++;
  }
  
  await saveStats(stats);
}

export async function trackRuleEdit(profileId, ruleType, action) {
  const stats = await getStats();
  stats.ruleEdits = stats.ruleEdits || {};
  
  const key = `${profileId}_${ruleType}`;
  if (!stats.ruleEdits[key]) {
    stats.ruleEdits[key] = { created: 0, updated: 0, deleted: 0 };
  }
  
  if (action === 'create' || action === 'duplicate') {
    stats.ruleEdits[key].created++;
  } else if (action === 'update') {
    stats.ruleEdits[key].updated++;
  } else if (action === 'delete') {
    stats.ruleEdits[key].deleted++;
  }
  
  await saveStats(stats);
}

export function getActiveRuleCount(profile) {
  let count = 0;
  
  if (profile.requestHeaders) {
    count += profile.requestHeaders.filter(h => h.enabled).length;
  }
  if (profile.responseHeaders) {
    count += profile.responseHeaders.filter(h => h.enabled).length;
  }
  if (profile.redirects) {
    count += profile.redirects.filter(r => r.enabled).length;
  }
  if (profile.blocks) {
    count += profile.blocks.filter(b => b.enabled).length;
  }
  if (profile.filters) {
    count += profile.filters.filter(f => f.enabled).length;
  }
  
  return count;
}

export async function getStorageStats() {
  const syncUsage = await chrome.storage.sync.getBytesInUse();
  const localUsage = await chrome.storage.local.getBytesInUse();
  
  return {
    sync: {
      used: syncUsage,
      quota: chrome.storage.sync.QUOTA_BYTES,
      percentage: (syncUsage / chrome.storage.sync.QUOTA_BYTES * 100).toFixed(1)
    },
    local: {
      used: localUsage,
      quota: chrome.storage.local.QUOTA_BYTES,
      percentage: (localUsage / chrome.storage.local.QUOTA_BYTES * 100).toFixed(1)
    }
  };
}

export async function getAllStats() {
  const stats = await getStats();
  const data = await chrome.storage.local.get(['lastStatsUpdate']);
  
  return {
    ...stats,
    lastUpdate: data.lastStatsUpdate
  };
}

export async function resetStats() {
  await saveStats({
    profileActivations: {},
    ruleToggles: {},
    ruleEdits: {},
    lastReset: Date.now()
  });
}

export async function exportLogs() {
  const stats = await getAllStats();
  const storageStats = await getStorageStats();
  
  const logs = {
    exportedAt: new Date().toISOString(),
    stats: stats,
    storage: storageStats,
    summary: {
      totalProfileActivations: Object.values(stats.profileActivations || {})
        .reduce((sum, p) => sum + p.count, 0),
      totalRuleToggles: Object.values(stats.ruleToggles || {})
        .reduce((sum, t) => sum + t.enabled + t.disabled, 0),
      totalRuleEdits: Object.values(stats.ruleEdits || {})
        .reduce((sum, e) => sum + e.created + e.updated + e.deleted, 0),
      trackingSince: new Date(stats.lastReset).toISOString()
    }
  };

  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `intercept-stats-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
