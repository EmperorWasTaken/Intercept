import { useState } from 'react';
import { Trash, CopyPlus, CirclePlus, Pencil } from 'lucide-react';

export default function DetailPanel({ 
  selectedItem, 
  onUpdate, 
  onDelete,
  onDuplicate,
  onShowModal,
  profiles,
  currentProfile,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile
}) {
  if (!selectedItem) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-primary">
        <div className="text-text-secondary text-sm">
          Select an item to edit
        </div>
      </div>
    );
  }

  const { item, type } = selectedItem;

  if (type === 'profiles') {
    return (
      <ProfilesPanel
        profiles={profiles}
        currentProfile={currentProfile}
        onCreate={onCreateProfile}
        onUpdate={onUpdateProfile}
        onDelete={onDeleteProfile}
        onShowModal={onShowModal}
      />
    );
  }

  return (
    <div className="flex-1 bg-bg-primary p-6 overflow-auto">
      <div className="max-w-2xl">
        <h2 className="text-lg font-semibold text-text-primary mb-6">
          {type === 'header' && 'Request Header'}
          {type === 'redirect' && 'URL Redirect'}
          {type === 'filter' && 'URL Filter'}
        </h2>

        {type === 'header' && <HeaderForm item={item} onUpdate={onUpdate} onDelete={onDelete} onDuplicate={onDuplicate} />}
        {type === 'redirect' && <RedirectForm item={item} onUpdate={onUpdate} onDelete={onDelete} onDuplicate={onDuplicate} />}
        {type === 'filter' && <FilterForm item={item} onUpdate={onUpdate} onDelete={onDelete} onDuplicate={onDuplicate} />}
      </div>
    </div>
  );
}

function ProfilesPanel({ profiles, currentProfile, onCreate, onUpdate, onDelete, onShowModal }) {
  const [newProfileName, setNewProfileName] = useState('');

  function handleCreate() {
    if (newProfileName.trim()) {
      onCreate(newProfileName.trim());
      setNewProfileName('');
    }
  }

  return (
    <div className="flex-1 bg-bg-primary p-6 overflow-auto">
      <div className="max-w-2xl">
        <h2 className="text-lg font-semibold text-text-primary mb-6">Manage Profiles</h2>

        <div className="mb-6 space-y-3">
          <h3 className="text-sm font-medium text-text-primary">Create New Profile</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
              placeholder="Profile name"
              className="flex-1 bg-bg-secondary text-text-primary border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            >
              <CirclePlus size={16} />
              Create
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-primary">All Profiles ({profiles.length})</h3>
          <div className="space-y-2">
            {profiles.map(profile => (
              <ProfileItem
                key={profile.id}
                profile={profile}
                isActive={profile.id === currentProfile.id}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onShowModal={onShowModal}
                canDelete={profiles.length > 1}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileItem({ profile, isActive, onUpdate, onDelete, onShowModal, canDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile.name);

  function handleSave() {
    if (editName.trim() && editName !== profile.name) {
      onUpdate(profile.id, 'name', editName.trim());
    }
    setIsEditing(false);
  }

  function handleCancel() {
    setEditName(profile.name);
    setIsEditing(false);
  }

  return (
    <div className={`border border-border rounded-md p-4 ${isActive ? 'bg-bg-tertiary border-primary' : 'bg-bg-secondary'}`}>
      <div className="flex items-center justify-between gap-3">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
            className="flex-1 bg-bg-primary text-text-primary border border-border rounded-md px-3 py-1.5 focus:outline-none focus:border-primary"
            autoFocus
          />
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <span className="text-text-primary font-medium">{profile.name}</span>
            {isActive && (
              <span className="text-xs bg-primary text-white px-2 py-0.5 rounded">Active</span>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-md text-sm transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 bg-bg-tertiary hover:bg-bg-primary border border-border text-text-primary rounded-md text-sm transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 bg-bg-tertiary hover:bg-bg-primary border border-border text-text-primary rounded-md transition-colors"
                title="Rename"
              >
                <Pencil size={16} />
              </button>
              {canDelete && (
                <button
                  onClick={() => {
                    onShowModal(
                      "Delete Profile",
                      `Are you sure you want to delete "${profile.name}"? This action cannot be undone.`,
                      () => onDelete(profile.id),
                      "Delete"
                    );
                  }}
                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                  title="Delete"
                >
                  <Trash size={16} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="mt-3 flex gap-4 text-xs text-text-secondary">
        <span>{profile.requestHeaders?.length || 0} headers</span>
        <span>{profile.redirects?.length || 0} redirects</span>
        <span>{profile.filters?.length || 0} filters</span>
      </div>
    </div>
  );
}

function HeaderForm({ item, onUpdate, onDelete, onDuplicate }) {
  return (
    <div className="space-y-4">
      <FormField label="Header Name">
        <input
          type="text"
          value={item.name}
          onChange={(e) => onUpdate(item.id, 'name', e.target.value)}
          placeholder="e.g., Authorization"
          className="w-full bg-bg-secondary text-text-primary border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary"
        />
      </FormField>

      <FormField label="Header Value">
        <input
          type="text"
          value={item.value}
          onChange={(e) => onUpdate(item.id, 'value', e.target.value)}
          placeholder="e.g., Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          className="w-full bg-bg-secondary text-text-primary border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary font-mono text-sm"
        />
      </FormField>

      <FormField label="Comment (optional)">
        <textarea
          value={item.comment || ''}
          onChange={(e) => onUpdate(item.id, 'comment', e.target.value)}
          placeholder=""
          rows={3}
          className="w-full bg-bg-secondary text-text-primary border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary resize-y"
        />
      </FormField>

      <div className="pt-4 flex gap-2">
        <button
          onClick={() => onDuplicate(item.id)}
          className="px-4 py-2 bg-bg-tertiary hover:bg-bg-primary border border-border text-text-primary rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          title="Duplicate"
        >
          <CopyPlus size={16} />
          Duplicate
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          title="Delete"
        >
          <Trash size={16} />
          Delete
        </button>
      </div>
    </div>
  );
}

function RedirectForm({ item, onUpdate, onDelete, onDuplicate }) {
  return (
    <div className="space-y-4">
      <FormField label="From URL">
        <input
          type="text"
          value={item.from}
          onChange={(e) => onUpdate(item.id, 'from', e.target.value)}
          placeholder="e.g., https://example.com/old-path"
          className="w-full bg-bg-secondary text-text-primary border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary"
        />
      </FormField>

      <FormField label="To URL">
        <input
          type="text"
          value={item.to}
          onChange={(e) => onUpdate(item.id, 'to', e.target.value)}
          placeholder="e.g., https://example.com/new-path"
          className="w-full bg-bg-secondary text-text-primary border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary"
        />
      </FormField>

      <FormField label="Comment (optional)">
        <textarea
          value={item.comment || ''}
          onChange={(e) => onUpdate(item.id, 'comment', e.target.value)}
          placeholder=""
          rows={3}
          className="w-full bg-bg-secondary text-text-primary border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary resize-y"
        />
      </FormField>

      <div className="pt-4 flex gap-2">
        <button
          onClick={() => onDuplicate(item.id)}
          className="px-4 py-2 bg-bg-tertiary hover:bg-bg-primary border border-border text-text-primary rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          title="Duplicate"
        >
          <CopyPlus size={16} />
          Duplicate
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          title="Delete"
        >
          <Trash size={16} />
          Delete
        </button>
      </div>
    </div>
  );
}

function FilterForm({ item, onUpdate, onDelete, onDuplicate }) {
  return (
    <div className="space-y-4">

      <FormField label="URL Pattern">
        <input
          type="text"
          value={item.value}
          onChange={(e) => onUpdate(item.id, 'value', e.target.value)}
          placeholder="e.g., *://*.example.com/*"
          className="w-full bg-bg-secondary text-text-primary border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary font-mono text-sm"
        />
      </FormField>

      <FormField label="Comment (optional)">
        <textarea
          value={item.comment || ''}
          onChange={(e) => onUpdate(item.id, 'comment', e.target.value)}
          placeholder=""
          rows={3}
          className="w-full bg-bg-secondary text-text-primary border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary resize-y"
        />
      </FormField>

      <div className="pt-4 flex gap-2">
        <button
          onClick={() => onDuplicate(item.id)}
          className="px-4 py-2 bg-bg-tertiary hover:bg-bg-primary border border-border text-text-primary rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          title="Duplicate"
        >
          <CopyPlus size={16} />
          Duplicate
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          title="Delete"
        >
          <Trash size={16} />
          Delete
        </button>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
