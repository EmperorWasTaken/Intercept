import { useState, useEffect } from 'react';
import ProfileSelector from './components/ProfileSelector';
import Sidebar from './components/Sidebar';
import DetailPanel from './components/DetailPanel';
import Modal from './components/Modal';
import { createRequestHeader, createRedirect, createRequestFilter, createProfile as createProfileFactory } from '../types';

function App() {
  const [profiles, setProfiles] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    loadProfiles();
    loadGlobalEnabled();
    
    // Listen for rule errors from background script
    const handleMessage = (message) => {
      if (message.action === 'ruleError') {
        alert(`Error applying rules: ${message.error}\n\nCheck your regex patterns for headers, redirects, and filters.`);
      }
    };
    
    chrome.runtime.onMessage.addListener(handleMessage);
    
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  async function loadGlobalEnabled() {
    const data = await chrome.storage.local.get(['globalEnabled']);
    setGlobalEnabled(data.globalEnabled !== false);
  }

  async function toggleGlobalEnabled() {
    const newValue = !globalEnabled;
    setGlobalEnabled(newValue);
    await chrome.storage.local.set({ globalEnabled: newValue });
    notifyBackgroundToUpdate();
  }

  async function loadProfiles() {
    const data = await chrome.storage.local.get(['profiles', 'activeProfileId']);
    const loadedProfiles = data.profiles || [];
    setProfiles(loadedProfiles);
    
    const activeId = data.activeProfileId;
    const active = loadedProfiles.find(p => p.id === activeId) || loadedProfiles[0];
    setCurrentProfile(active);
  }

  async function saveProfiles(updatedProfiles, shouldUpdateRules = false) {
    await chrome.storage.local.set({ profiles: updatedProfiles });
    setProfiles(updatedProfiles);
    if (shouldUpdateRules) {
      notifyBackgroundToUpdate();
    }
  }

  async function switchProfile(profileId) {
    await chrome.storage.local.set({ activeProfileId: profileId });
    const profile = profiles.find(p => p.id === profileId);
    setCurrentProfile(profile);
    setSelectedItem(null);
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
    setSelectedItem(null);
  }

  function showModal(title, message, onConfirm, confirmText = 'Confirm', confirmStyle = 'danger') {
    setModal({ isOpen: true, title, message, onConfirm, confirmText, confirmStyle });
  }

  function closeModal() {
    setModal({ isOpen: false, title: '', message: '', onConfirm: null });
  }

  async function deleteProfile(profileId) {
    if (profiles.length === 1) {
      alert('Cannot delete the last profile!');
      return;
    }

    showModal(
      'Delete Profile',
      'Are you sure you want to delete this profile? This action cannot be undone.',
      async () => {
        const updated = profiles.filter(p => p.id !== profileId);
        await saveProfiles(updated);

        if (profileId === currentProfile.id) {
          const newActive = updated[0];
          await chrome.storage.local.set({ activeProfileId: newActive.id });
          setCurrentProfile(newActive);
          setSelectedItem(null);
        }
      },
      'Delete'
    );
  }

  function updateCurrentProfile(updates, shouldUpdateRules = false) {
    const updated = profiles.map(p => 
      p.id === currentProfile.id ? { ...p, ...updates } : p
    );
    setCurrentProfile({ ...currentProfile, ...updates });
    saveProfiles(updated, shouldUpdateRules);
  }

  function addHeader() {
    const newHeader = createRequestHeader('', '');
    updateCurrentProfile({
      requestHeaders: [...(currentProfile.requestHeaders || []), newHeader]
    });
  }

  function updateHeader(id, field, value) {
    const updated = currentProfile.requestHeaders.map(h =>
      h.id === id ? { ...h, [field]: value } : h
    );
    const shouldUpdate = field === 'enabled' || field === 'name' || field === 'value';
    updateCurrentProfile({ requestHeaders: updated }, shouldUpdate);
    
    if (selectedItem?.item.id === id) {
      setSelectedItem({ ...selectedItem, item: { ...selectedItem.item, [field]: value } });
    }
  }

  function deleteHeader(id) {
    updateCurrentProfile({
      requestHeaders: currentProfile.requestHeaders.filter(h => h.id !== id)
    }, true);
  }

  function duplicateHeader(id) {
    const header = currentProfile.requestHeaders.find(h => h.id === id);
    if (header) {
      const duplicated = createRequestHeader(header.name, header.value);
      duplicated.enabled = header.enabled;
      duplicated.comment = header.comment;
      updateCurrentProfile({
        requestHeaders: [...currentProfile.requestHeaders, duplicated]
      }, true);
    }
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
    const shouldUpdate = field === 'enabled' || field === 'from' || field === 'to';
    updateCurrentProfile({ redirects: updated }, shouldUpdate);
    
    if (selectedItem?.item.id === id) {
      setSelectedItem({ ...selectedItem, item: { ...selectedItem.item, [field]: value } });
    }
  }

  function deleteRedirect(id) {
    updateCurrentProfile({
      redirects: currentProfile.redirects.filter(r => r.id !== id)
    }, true);
  }

  function duplicateRedirect(id) {
    const redirect = currentProfile.redirects.find(r => r.id === id);
    if (redirect) {
      const duplicated = createRedirect(redirect.from, redirect.to);
      duplicated.enabled = redirect.enabled;
      duplicated.comment = redirect.comment;
      updateCurrentProfile({
        redirects: [...currentProfile.redirects, duplicated]
      }, true);
    }
  }

  async function addFilter() {
    let filterPattern = '*://*/*';
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        const url = new URL(tab.url);
        filterPattern = `.*://${url.hostname}/.*`;
      }
    } catch (error) {
      console.error('Failed to get current tab URL:', error);
    }
    
    const newFilter = createRequestFilter(filterPattern);
    updateCurrentProfile({
      filters: [...(currentProfile.filters || []), newFilter]
    }, true);
  }

  function updateFilter(id, field, value) {
    const updated = currentProfile.filters.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    );
    const shouldUpdate = field === 'enabled' || field === 'value';
    updateCurrentProfile({ filters: updated }, shouldUpdate);
    
    if (selectedItem?.item.id === id) {
      setSelectedItem({ ...selectedItem, item: { ...selectedItem.item, [field]: value } });
    }
  }

  function deleteFilter(id) {
    updateCurrentProfile({
      filters: currentProfile.filters.filter(f => f.id !== id)
    }, true);
  }

  function duplicateFilter(id) {
    const filter = currentProfile.filters.find(f => f.id === id);
    if (filter) {
      const duplicated = createRequestFilter(filter.value);
      duplicated.enabled = filter.enabled;
      duplicated.comment = filter.comment;
      updateCurrentProfile({
        filters: [...currentProfile.filters, duplicated]
      }, true);
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const existingProfiles = profiles;
      let newProfiles = [];
      
      if (Array.isArray(data)) {
      newProfiles = data.map(modHeaderProfile => {
        const profile = createProfileFactory(modHeaderProfile.title || 'Imported Profile');
        
        profile.requestHeaders = (modHeaderProfile.headers || [])
          .filter(h => h.name)
          .map(h => ({
            id: crypto.randomUUID(),
            enabled: h.enabled !== false,
            name: h.name,
            value: h.value || '',
            comment: h.comment || ''
          }));
        
        profile.redirects = (modHeaderProfile.urlReplacements || [])
          .filter(r => r.name && r.value)
          .map(r => ({
            id: crypto.randomUUID(),
            enabled: r.enabled !== false,
            from: r.name,
            to: r.value,
            comment: r.comment || ''
          }));
        
        profile.filters = (modHeaderProfile.urlFilters || [])
          .filter(f => f.urlRegex)
          .map(f => ({
            id: crypto.randomUUID(),
            enabled: f.enabled !== false,
            value: f.urlRegex,
            comment: f.comment || ''
          }));
        
        return profile;
      });
    } else {
      newProfiles = data.profiles || [];
    }
    
    const combinedProfiles = [...existingProfiles, ...newProfiles];
    await saveProfiles(combinedProfiles, true);
    
    if (newProfiles.length > 0) {
      await chrome.storage.local.set({ activeProfileId: newProfiles[0].id });
      setCurrentProfile(newProfiles[0]);
    }
    } catch (error) {
      alert('Invalid file format. Please select a valid JSON file.');
      console.error('Import error:', error);
    }
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

  function handleSelectItem(item, type) {
    setSelectedItem({ item, type });
  }

  function handleUpdateItem(id, field, value) {
    if (!selectedItem) return;
    
    if (selectedItem.type === 'header') {
      updateHeader(id, field, value);
    } else if (selectedItem.type === 'redirect') {
      updateRedirect(id, field, value);
    } else if (selectedItem.type === 'filter') {
      updateFilter(id, field, value);
    }
  }

  function handleDeleteItem(id) {
    if (!selectedItem) return;
    
    if (selectedItem.type === 'header') {
      deleteHeader(id);
    } else if (selectedItem.type === 'redirect') {
      deleteRedirect(id);
    } else if (selectedItem.type === 'filter') {
      deleteFilter(id);
    }
    
    setSelectedItem(null);
  }

  function handleDuplicateItem(id) {
    if (!selectedItem) return;
    
    if (selectedItem.type === 'header') {
      duplicateHeader(id);
    } else if (selectedItem.type === 'redirect') {
      duplicateRedirect(id);
    } else if (selectedItem.type === 'filter') {
      duplicateFilter(id);
    }
  }

  function handleToggleEnabled(id, type, checked) {
    if (type === 'header') {
      updateHeader(id, 'enabled', checked);
    } else if (type === 'redirect') {
      updateRedirect(id, 'enabled', checked);
    } else if (type === 'filter') {
      updateFilter(id, 'enabled', checked);
    }
  }

  function handleManageProfiles() {
    setSelectedItem({ type: 'profiles' });
  }

  function handleCreateProfile(name) {
    if (!name || !name.trim()) return;

    const newProfile = createProfileFactory(name.trim());
    const updated = [...profiles, newProfile];
    saveProfiles(updated);
    chrome.storage.local.set({ activeProfileId: newProfile.id });
    setCurrentProfile(newProfile);
  }

  function handleUpdateProfile(id, field, value) {
    const updated = profiles.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    );
    saveProfiles(updated);
    if (id === currentProfile.id) {
      setCurrentProfile({ ...currentProfile, [field]: value });
    }
  }

  function handleDeleteProfileFromPanel(profileId) {
    if (profiles.length === 1) {
      return;
    }

    const updated = profiles.filter(p => p.id !== profileId);
    saveProfiles(updated);

    if (profileId === currentProfile.id) {
      const newActive = updated[0];
      chrome.storage.local.set({ activeProfileId: newActive.id });
      setCurrentProfile(newActive);
    }
    
    setSelectedItem({ type: 'profiles' });
  }

  if (!currentProfile) {
    return (
      <div className="w-screen h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-[800px] h-[600px] bg-bg-primary text-text-primary flex flex-col">
      <div className="bg-bg-secondary border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Intercept</h1>
        
        <div className="flex items-center gap-4">
          <button
            onClick={toggleGlobalEnabled}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              globalEnabled 
                ? 'bg-primary hover:bg-primary-dark text-white' 
                : 'bg-bg-tertiary hover:bg-bg-primary border border-border text-text-secondary'
            }`}
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              {globalEnabled ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            {globalEnabled ? 'Enabled' : 'Disabled'}
          </button>

          <div className="flex gap-2">
            <button 
              onClick={() => document.getElementById('importFile').click()}
              className="px-3 py-1.5 bg-bg-tertiary hover:bg-bg-primary border border-border text-text-primary rounded-md text-sm transition-colors"
            >
              Import
            </button>
            <button 
              onClick={handleExport}
              className="px-3 py-1.5 bg-bg-tertiary hover:bg-bg-primary border border-border text-text-primary rounded-md text-sm transition-colors"
            >
              Export
            </button>
            <input
              type="file"
              id="importFile"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
          
          <ProfileSelector
            profiles={profiles}
            currentProfile={currentProfile}
            onSwitch={switchProfile}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          headers={currentProfile.requestHeaders || []}
          redirects={currentProfile.redirects || []}
          filters={currentProfile.filters || []}
          selectedItem={selectedItem}
          onSelectItem={handleSelectItem}
          onAddHeader={addHeader}
          onAddRedirect={addRedirect}
          onAddFilter={addFilter}
          onToggleEnabled={handleToggleEnabled}
          onManageProfiles={handleManageProfiles}
        />
        
        <DetailPanel
          selectedItem={selectedItem}
          onUpdate={handleUpdateItem}
          onDelete={handleDeleteItem}
          onDuplicate={handleDuplicateItem}
          onShowModal={showModal}
          profiles={profiles}
          currentProfile={currentProfile}
          onCreateProfile={handleCreateProfile}
          onUpdateProfile={handleUpdateProfile}
          onDeleteProfile={handleDeleteProfileFromPanel}
        />
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        confirmText={modal.confirmText}
        confirmStyle={modal.confirmStyle}
      />
    </div>
  );
}

export default App;
