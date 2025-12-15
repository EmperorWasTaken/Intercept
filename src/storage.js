import LZString from 'lz-string';

function compressProfile(profile) {
  return LZString.compressToUTF16(JSON.stringify(profile));
}

function decompressProfile(compressed) {
  if (!compressed) return null;
  try {
    return JSON.parse(LZString.decompressFromUTF16(compressed));
  } catch (error) {
    console.error('Failed to decompress profile:', error);
    return null;
  }
}

export async function saveProfile(profile) {
  const compressed = compressProfile(profile);
  await chrome.storage.sync.set({
    [`profile_${profile.id}`]: compressed
  });
}

export async function loadProfile(profileId) {
  const key = `profile_${profileId}`;
  const data = await chrome.storage.sync.get(key);
  return decompressProfile(data[key]);
}

export async function loadAllProfiles() {
  const { profileIds } = await chrome.storage.sync.get('profileIds');
  if (!profileIds || profileIds.length === 0) return [];
  
  const keys = profileIds.map(id => `profile_${id}`);
  const data = await chrome.storage.sync.get(keys);
  
  const profiles = [];
  for (const key of keys) {
    const profile = decompressProfile(data[key]);
    if (profile) {
      profiles.push(profile);
    }
  }
  
  return profiles;
}

export async function saveAllProfiles(profiles) {
  const profileIds = profiles.map(p => p.id);
  
  await chrome.storage.sync.set({ profileIds });
  
  const savePromises = profiles.map(profile => saveProfile(profile));
  await Promise.all(savePromises);
}

export async function deleteProfile(profileId) {
  const { profileIds } = await chrome.storage.sync.get('profileIds');
  const updatedIds = (profileIds || []).filter(id => id !== profileId);
  await chrome.storage.sync.set({ profileIds: updatedIds });
  
  await chrome.storage.sync.remove(`profile_${profileId}`);
}

export async function getActiveProfileId() {
  const { activeProfileId } = await chrome.storage.sync.get('activeProfileId');
  return activeProfileId;
}

export async function setActiveProfileId(profileId) {
  await chrome.storage.sync.set({ activeProfileId: profileId });
}

export async function getGlobalEnabled() {
  const { globalEnabled } = await chrome.storage.sync.get('globalEnabled');
  return globalEnabled !== false;
}

export async function setGlobalEnabled(enabled) {
  await chrome.storage.sync.set({ globalEnabled: enabled });
}

export async function migrateFromLocalStorage() {
  const { migrated } = await chrome.storage.sync.get('migrated');
  if (migrated) return;
  
  console.log('Migrating from local storage to sync storage...');
  
  const localData = await chrome.storage.local.get(['profiles', 'activeProfileId', 'globalEnabled']);
  
  if (localData.profiles && localData.profiles.length > 0) {
    await saveAllProfiles(localData.profiles);
    
    if (localData.activeProfileId) {
      await setActiveProfileId(localData.activeProfileId);
    }
    
    if (localData.globalEnabled !== undefined) {
      await setGlobalEnabled(localData.globalEnabled);
    }
    
    console.log(`Migrated ${localData.profiles.length} profiles to sync storage`);
  }
  
  await chrome.storage.sync.set({ migrated: true });
}

export async function getStorageInfo() {
  const bytesInUse = await chrome.storage.sync.getBytesInUse();
  const { profileIds } = await chrome.storage.sync.get('profileIds');
  
  const info = {
    totalBytes: bytesInUse,
    totalLimit: chrome.storage.sync.QUOTA_BYTES,
    profileCount: profileIds?.length || 0,
    percentUsed: ((bytesInUse / chrome.storage.sync.QUOTA_BYTES) * 100).toFixed(1)
  };
  
  console.log('Storage Info:', info);
  return info;
}
