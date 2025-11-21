import { useState, useEffect } from 'react';
import ProfileSelector from './components/ProfileSelector';
import CollapsibleSection from './components/CollapsibleSection';
import HeaderItem from './components/HeaderItem';
import RedirectItem from './components/RedirectItem';
import FilterItem from './components/FilterItem';
import { createRequestHeader, createRedirect, createRequestFilter, createProfile as createProfileFactory } from '../types';

function App() {
  const [profiles, setProfiles] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    const data = await chrome.storage.local.get(['profiles', 'activeProfileId']);
    const loadedProfiles = data.profiles || [];
    setProfiles(loadedProfiles);
    
    const activeId = data.activeProfileId;
    const active = loadedProfiles.find(p => p.id === activeId) || loadedProfiles[0];
    setCurrentProfile(active);
  }

  async function saveProfiles(updatedProfiles) {
    await chrome.storage.local.set({ profiles: updatedProfiles });
    setProfiles(updatedProfiles);
    notifyBackgroundToUpdate();
  }

  async function switchProfile(profileId) {
    await chrome.storage.local.set({ activeProfileId: profileId });
    const profile = profiles.find(p => p.id === profileId);
    setCurrentProfile(profile);
    notifyBackgroundToUpdate();
  }

  async function createProfile() {
    const name = prompt('Profile name:');
    if (!name) return;

    const newProfile = createProfileFactory(name);

    const updated = [...profiles, newProfile];
    await saveProfiles(updated);
    await chrome.storage.local.set({ activeProfileId: newProfile.id });
    setCurrentProfile(newProfile);
  }

  async function deleteProfile(profileId) {
    if (profiles.length === 1) {
      alert('Cannot delete the last profile!');
      return;
    }

    if (!confirm('Delete this profile?')) return;

    const updated = profiles.filter(p => p.id !== profileId);
    await saveProfiles(updated);

    if (profileId === currentProfile.id) {
      const newActive = updated[0];
      await chrome.storage.local.set({ activeProfileId: newActive.id });
      setCurrentProfile(newActive);
    }
  }

  function updateCurrentProfile(updates) {
    const updated = profiles.map(p => 
      p.id === currentProfile.id ? { ...p, ...updates } : p
    );
    setCurrentProfile({ ...currentProfile, ...updates });
    saveProfiles(updated);
  }

  function addHeader() {
    const newHeader = createRequestHeader('', '');
    updateCurrentProfile({
      requestHeaders: [...(currentProfile.requestHeaders || []), newHeader]
    });
  }

  function updateHeader(id, field, value) {
    const updated = currentProfile.requestHeaders.map(h =>
      h.id === id 
        ? { ...h, [field]: field === 'filters' ? value.split(',').map(f => f.trim()) : value }
        : h
    );
    updateCurrentProfile({ requestHeaders: updated });
  }

  function deleteHeader(id) {
    updateCurrentProfile({
      requestHeaders: currentProfile.requestHeaders.filter(h => h.id !== id)
    });
  }

  function addRedirect() {
    const newRedirect = createRedirect('', '');
    updateCurrentProfile({
      redirects: [...(currentProfile.redirects || []), newRedirect]
    });
  }

  function updateRedirect(id, field, value) {
    const updated = currentProfile.redirects.map(r =>
      r.id === id ? { ...r, [field]: value } : r
    );
    updateCurrentProfile({ redirects: updated });
  }

  function deleteRedirect(id) {
    updateCurrentProfile({
      redirects: currentProfile.redirects.filter(r => r.id !== id)
    });
  }

  function addFilter() {
    const newFilter = createRequestFilter('*://*/*');
    updateCurrentProfile({
      filters: [...(currentProfile.filters || []), newFilter]
    });
  }

  function updateFilter(id, field, value) {
    const updated = currentProfile.filters.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    );
    updateCurrentProfile({ filters: updated });
  }

  function deleteFilter(id) {
    updateCurrentProfile({
      filters: currentProfile.filters.filter(f => f.id !== id)
    });
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    const imported = JSON.parse(text);
    await chrome.storage.local.set({
      profiles: imported.profiles,
      activeProfileId: imported.activeProfileId || imported.profiles[0].id
    });
    loadProfiles();
  }

  async function handleExport() {
    const data = await chrome.storage.local.get(['profiles', 'activeProfileId']);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intercept-${Date.now()}.json`;
    a.click();
  }

  function notifyBackgroundToUpdate() {
    chrome.runtime.sendMessage({ action: 'updateRules' });
  }

  if (!currentProfile) return <div>Loading...</div>;

  return (
    <div className="container">
      <header>
        <h1>Intercept</h1>
        <ProfileSelector
          profiles={profiles}
          currentProfile={currentProfile}
          onSwitch={switchProfile}
          onCreate={createProfile}
          onDelete={deleteProfile}
        />
      </header>

      <div className="actions">
        <button onClick={() => document.getElementById('importFile').click()}>
          Import
        </button>
        <button onClick={handleExport}>Export</button>
        <input
          type="file"
          id="importFile"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
      </div>

      <CollapsibleSection title="Request Headers" onAdd={addHeader}>
        {currentProfile.requestHeaders.map(header => (
          <HeaderItem
            key={header.id}
            header={header}
            onUpdate={updateHeader}
            onDelete={deleteHeader}
          />
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="URL Redirects" onAdd={addRedirect}>
        {currentProfile.redirects.map(redirect => (
          <RedirectItem
            key={redirect.id}
            redirect={redirect}
            onUpdate={updateRedirect}
            onDelete={deleteRedirect}
          />
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Request URL Filters" onAdd={addFilter}>
        {(currentProfile.filters || []).map(filter => (
          <FilterItem
            key={filter.id}
            filter={filter}
            onUpdate={updateFilter}
            onDelete={deleteFilter}
          />
        ))}
      </CollapsibleSection>
    </div>
  );
}

export default App;