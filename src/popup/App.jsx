import { useState, useEffect } from 'react';
import ProfileSelector from './components/ProfileSelector';
import Sidebar from './components/Sidebar';
import DetailPanel from './components/DetailPanel';
import ValidationPanel from './components/ValidationPanel';
import StatsPanel from './components/StatsPanel';
import SettingsMenu from './components/SettingsMenu';
import Modal from './components/Modal';
import { createRequestHeader, createResponseHeader, createRedirect, createRequestFilter, createBlock, createProfile as createProfileFactory } from '../types';
import { 
  loadAllProfiles, 
  saveAllProfiles, 
  getActiveProfileId, 
  setActiveProfileId,
  getGlobalEnabled,
  setGlobalEnabled as setGlobalEnabledStorage,
  deleteProfile as deleteProfileStorage
} from '../storage';
import { trackRuleToggle, trackRuleEdit, trackProfileActivation } from '../stats';

function App() {
  const [profiles, setProfiles] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    loadProfiles();
    loadGlobalEnabledState();
    
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

  async function loadGlobalEnabledState() {
    const enabled = await getGlobalEnabled();
    setGlobalEnabled(enabled);
  }

  async function toggleGlobalEnabled() {
    const newValue = !globalEnabled;
    setGlobalEnabled(newValue);
    await setGlobalEnabledStorage(newValue);
    notifyBackgroundToUpdate();
  }

  async function loadProfiles() {
    const loadedProfiles = await loadAllProfiles();
    setProfiles(loadedProfiles);
    
    const activeId = await getActiveProfileId();
    const active = loadedProfiles.find(p => p.id === activeId) || loadedProfiles[0];
    setCurrentProfile(active);
  }

  async function saveProfiles(updatedProfiles, shouldUpdateRules = false) {
    await saveAllProfiles(updatedProfiles);
    setProfiles(updatedProfiles);
    if (shouldUpdateRules) {
      notifyBackgroundToUpdate();
    }
  }

  async function switchProfile(profileId) {
    await setActiveProfileId(profileId);
    const profile = profiles.find(p => p.id === profileId);
    setCurrentProfile(profile);
    setSelectedItem(null);
    await trackProfileActivation(profileId, profile.name);
    notifyBackgroundToUpdate();
  }

  async function createProfile() {
    const name = prompt('Profile name:');
    if (!name) return;

    const newProfile = createProfileFactory(name);

    const updated = [...profiles, newProfile];
    await saveProfiles(updated);
    await setActiveProfileId(newProfile.id);
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
        await deleteProfileStorage(profileId);

        if (profileId === currentProfile.id) {
          const newActive = updated[0];
          await setActiveProfileId(newActive.id);
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
    trackRuleEdit(currentProfile.id, 'header', 'create');
  }

  function updateHeader(id, field, value) {
    const updated = currentProfile.requestHeaders.map(h =>
      h.id === id ? { ...h, [field]: value } : h
    );
    const shouldUpdate = field === 'enabled' || field === 'name' || field === 'value';
    updateCurrentProfile({ requestHeaders: updated }, shouldUpdate);
    
    if (field !== 'enabled') {
      trackRuleEdit(currentProfile.id, 'header', 'update');
    }
    
    if (selectedItem?.item.id === id) {
      setSelectedItem({ ...selectedItem, item: { ...selectedItem.item, [field]: value } });
    }
  }

  function deleteHeader(id) {
    updateCurrentProfile({
      requestHeaders: currentProfile.requestHeaders.filter(h => h.id !== id)
    }, true);
    trackRuleEdit(currentProfile.id, 'header', 'delete');
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

  function addResponseHeader() {
    const newHeader = createResponseHeader('', '');
    updateCurrentProfile({
      responseHeaders: [...(currentProfile.responseHeaders || []), newHeader]
    });
    trackRuleEdit(currentProfile.id, 'responseHeader', 'create');
  }

  function updateResponseHeader(id, field, value) {
    const updated = currentProfile.responseHeaders.map(h =>
      h.id === id ? { ...h, [field]: value } : h
    );
    const shouldUpdate = field === 'enabled' || field === 'name' || field === 'value';
    updateCurrentProfile({ responseHeaders: updated }, shouldUpdate);
    
    if (field !== 'enabled') {
      trackRuleEdit(currentProfile.id, 'responseHeader', 'update');
    }
    
    if (selectedItem?.item.id === id) {
      setSelectedItem({ ...selectedItem, item: { ...selectedItem.item, [field]: value } });
    }
  }

  function deleteResponseHeader(id) {
    updateCurrentProfile({
      responseHeaders: currentProfile.responseHeaders.filter(h => h.id !== id)
    }, true);
    trackRuleEdit(currentProfile.id, 'responseHeader', 'delete');
  }

  function duplicateResponseHeader(id) {
    const header = currentProfile.responseHeaders.find(h => h.id === id);
    if (header) {
      const duplicated = createResponseHeader(header.name, header.value);
      duplicated.enabled = header.enabled;
      duplicated.comment = header.comment;
      updateCurrentProfile({
        responseHeaders: [...currentProfile.responseHeaders, duplicated]
      }, true);
    }
  }

  function addRedirect() {
    const newRedirect = createRedirect('', '');
    updateCurrentProfile({
      redirects: [...(currentProfile.redirects || []), newRedirect]
    });
    trackRuleEdit(currentProfile.id, 'redirect', 'create');
  }

  function updateRedirect(id, field, value) {
    const updated = currentProfile.redirects.map(r =>
      r.id === id ? { ...r, [field]: value } : r
    );
    const shouldUpdate = field === 'enabled' || field === 'from' || field === 'to';
    updateCurrentProfile({ redirects: updated }, shouldUpdate);
    
    if (field !== 'enabled') {
      trackRuleEdit(currentProfile.id, 'redirect', 'update');
    }
    
    if (selectedItem?.item.id === id) {
      setSelectedItem({ ...selectedItem, item: { ...selectedItem.item, [field]: value } });
    }
  }

  function deleteRedirect(id) {
    updateCurrentProfile({
      redirects: currentProfile.redirects.filter(r => r.id !== id)
    }, true);
    trackRuleEdit(currentProfile.id, 'redirect', 'delete');
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
    trackRuleEdit(currentProfile.id, 'filter', 'create');
  }

  function updateFilter(id, field, value) {
    const updated = currentProfile.filters.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    );
    const shouldUpdate = field === 'enabled' || field === 'value';
    updateCurrentProfile({ filters: updated }, shouldUpdate);
    
    if (field !== 'enabled') {
      trackRuleEdit(currentProfile.id, 'filter', 'update');
    }
    
    if (selectedItem?.item.id === id) {
      setSelectedItem({ ...selectedItem, item: { ...selectedItem.item, [field]: value } });
    }
  }

  function deleteFilter(id) {
    updateCurrentProfile({
      filters: currentProfile.filters.filter(f => f.id !== id)
    }, true);
    trackRuleEdit(currentProfile.id, 'filter', 'delete');
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

  function addBlock() {
    const newBlock = createBlock('');
    updateCurrentProfile({
      blocks: [...(currentProfile.blocks || []), newBlock]
    });
    trackRuleEdit(currentProfile.id, 'block', 'create');
  }

  function updateBlock(id, field, value) {
    const updated = currentProfile.blocks.map(b =>
      b.id === id ? { ...b, [field]: value } : b
    );
    const shouldUpdate = field === 'enabled' || field === 'pattern';
    updateCurrentProfile({ blocks: updated }, shouldUpdate);
    
    if (field !== 'enabled') {
      trackRuleEdit(currentProfile.id, 'block', 'update');
    }
    
    if (selectedItem?.item.id === id) {
      setSelectedItem({ ...selectedItem, item: { ...selectedItem.item, [field]: value } });
    }
  }

  function deleteBlock(id) {
    updateCurrentProfile({
      blocks: currentProfile.blocks.filter(b => b.id !== id)
    }, true);
    trackRuleEdit(currentProfile.id, 'block', 'delete');
  }

  function duplicateBlock(id) {
    const block = currentProfile.blocks.find(b => b.id === id);
    if (block) {
      const duplicated = createBlock(block.pattern);
      duplicated.enabled = block.enabled;
      duplicated.comment = block.comment;
      updateCurrentProfile({
        blocks: [...currentProfile.blocks, duplicated]
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
    } else if (selectedItem.type === 'responseHeader') {
      updateResponseHeader(id, field, value);
    } else if (selectedItem.type === 'redirect') {
      updateRedirect(id, field, value);
    } else if (selectedItem.type === 'block') {
      updateBlock(id, field, value);
    } else if (selectedItem.type === 'filter') {
      updateFilter(id, field, value);
    }
  }

  function handleDeleteItem(id) {
    if (!selectedItem) return;
    
    if (selectedItem.type === 'header') {
      deleteHeader(id);
    } else if (selectedItem.type === 'responseHeader') {
      deleteResponseHeader(id);
    } else if (selectedItem.type === 'redirect') {
      deleteRedirect(id);
    } else if (selectedItem.type === 'block') {
      deleteBlock(id);
    } else if (selectedItem.type === 'filter') {
      deleteFilter(id);
    }
    
    setSelectedItem(null);
  }

  function handleDuplicateItem(id) {
    if (!selectedItem) return;
    
    if (selectedItem.type === 'header') {
      duplicateHeader(id);
    } else if (selectedItem.type === 'responseHeader') {
      duplicateResponseHeader(id);
    } else if (selectedItem.type === 'redirect') {
      duplicateRedirect(id);
    } else if (selectedItem.type === 'block') {
      duplicateBlock(id);
    } else if (selectedItem.type === 'filter') {
      duplicateFilter(id);
    }
  }

  function handleToggleEnabled(id, type, checked) {
    if (type === 'header') {
      updateHeader(id, 'enabled', checked);
      trackRuleToggle(currentProfile.id, 'header', checked);
    } else if (type === 'responseHeader') {
      updateResponseHeader(id, 'enabled', checked);
      trackRuleToggle(currentProfile.id, 'responseHeader', checked);
    } else if (type === 'redirect') {
      updateRedirect(id, 'enabled', checked);
      trackRuleToggle(currentProfile.id, 'redirect', checked);
    } else if (type === 'block') {
      updateBlock(id, 'enabled', checked);
      trackRuleToggle(currentProfile.id, 'block', checked);
    } else if (type === 'filter') {
      updateFilter(id, 'enabled', checked);
      trackRuleToggle(currentProfile.id, 'filter', checked);
    }
  }

  function handleManageProfiles() {
    setSelectedItem({ type: 'profiles' });
  }

  function handleValidate() {
    setSelectedItem({ type: 'validate' });
  }

  function handleStats() {
    setSelectedItem({ type: 'stats' });
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
        
        <div className="flex items-center gap-3">
          <ProfileSelector
            profiles={profiles}
            currentProfile={currentProfile}
            onSwitch={switchProfile}
          />
          
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

          <SettingsMenu
            onManageProfiles={handleManageProfiles}
            onValidate={handleValidate}
            onStats={handleStats}
            onImport={() => document.getElementById('importFile').click()}
            onExport={handleExport}
            selectedItem={selectedItem}
          />
          
          <input
            type="file"
            id="importFile"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          headers={currentProfile.requestHeaders || []}
          responseHeaders={currentProfile.responseHeaders || []}
          redirects={currentProfile.redirects || []}
          blocks={currentProfile.blocks || []}
          filters={currentProfile.filters || []}
          selectedItem={selectedItem}
          onSelectItem={handleSelectItem}
          onAddHeader={addHeader}
          onAddResponseHeader={addResponseHeader}
          onAddRedirect={addRedirect}
          onAddBlock={addBlock}
          onAddFilter={addFilter}
          onToggleEnabled={handleToggleEnabled}
        />
        
        {selectedItem?.type === 'validate' ? (
          <ValidationPanel currentProfile={currentProfile} />
        ) : selectedItem?.type === 'stats' ? (
          <StatsPanel />
        ) : (
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
        )}
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
