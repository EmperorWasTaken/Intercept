import { useState, useEffect } from 'react';
import { CirclePlus } from 'lucide-react';

export default function Sidebar({ 
  headers,
  responseHeaders,
  redirects,
  blocks,
  filters, 
  selectedItem, 
  onSelectItem,
  onAddHeader,
  onAddResponseHeader,
  onAddRedirect,
  onAddBlock,
  onAddFilter,
  onToggleEnabled,
  onManageProfiles
}) {
  return (
    <div className="w-64 bg-bg-secondary border-r border-border flex flex-col h-full overflow-y-auto">
      <div className="border-b border-border shrink-0">
        <div 
          className={`flex items-center justify-between p-3 cursor-pointer hover:bg-bg-tertiary ${
            selectedItem?.type === 'profiles' ? 'bg-bg-tertiary border-l-2 border-primary' : ''
          }`}
          onClick={onManageProfiles}
        >
          <span className="text-sm font-medium text-text-primary">Profiles</span>
          <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      <SidebarSection
        title="Request Headers"
        items={headers}
        type="header"
        selectedItem={selectedItem}
        onSelectItem={onSelectItem}
        onAdd={onAddHeader}
        onToggleEnabled={onToggleEnabled}
      />

      <SidebarSection
        title="Response Headers"
        items={responseHeaders}
        type="responseHeader"
        selectedItem={selectedItem}
        onSelectItem={onSelectItem}
        onAdd={onAddResponseHeader}
        onToggleEnabled={onToggleEnabled}
      />

      <SidebarSection
        title="URL Redirects"
        items={redirects}
        type="redirect"
        selectedItem={selectedItem}
        onSelectItem={onSelectItem}
        onAdd={onAddRedirect}
        onToggleEnabled={onToggleEnabled}
      />

      <SidebarSection
        title="Block Requests"
        items={blocks}
        type="block"
        selectedItem={selectedItem}
        onSelectItem={onSelectItem}
        onAdd={onAddBlock}
        onToggleEnabled={onToggleEnabled}
      />

      <SidebarSection
        title="URL Filters"
        items={filters}
        type="filter"
        selectedItem={selectedItem}
        onSelectItem={onSelectItem}
        onAdd={onAddFilter}
        onToggleEnabled={onToggleEnabled}
      />
    </div>
  );
}

function SidebarSection({ title, items, type, selectedItem, onSelectItem, onAdd, onToggleEnabled }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function loadCollapsedState() {
      const storageKey = `sidebar_collapsed_${type}`;
      const data = await chrome.storage.local.get([storageKey]);
      if (data[storageKey] !== undefined) {
        setCollapsed(data[storageKey]);
      }
    }
    loadCollapsedState();
  }, [type]);

  async function toggleCollapsed() {
    const newState = !collapsed;
    setCollapsed(newState);
    const storageKey = `sidebar_collapsed_${type}`;
    await chrome.storage.local.set({ [storageKey]: newState });
  }

  return (
    <div className="border-b border-border">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-bg-tertiary"
        onClick={toggleCollapsed}
      >
        <span className="text-sm font-medium text-text-primary flex items-center gap-2">
          <span className="text-text-secondary">{collapsed ? '▶' : '▼'}</span>
          {title}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          className="text-primary hover:text-primary-light w-6 h-6 flex items-center justify-center rounded hover:bg-bg-tertiary"
        >
          <CirclePlus size={18} />
        </button>
      </div>
      
      {!collapsed && (
        <div className="pb-2">
          {items?.length === 0 ? (
            <div className="text-text-muted text-xs px-3 py-2">No items</div>
          ) : (
            items?.map(item => (
              <SidebarItem
                key={item.id}
                item={item}
                type={type}
                isSelected={selectedItem?.item?.id === item.id && selectedItem?.type === type}
                onSelect={() => onSelectItem(item, type)}
                onToggleEnabled={onToggleEnabled}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SidebarItem({ item, type, isSelected, onSelect, onToggleEnabled }) {
  const getPreview = () => {
    if (type === 'header') {
      return item.value ? `${item.value.substring(0, 20)}${item.value.length > 20 ? '...' : ''}` : 'No value';
    }
    if (type === 'redirect') {
      return item.from || 'No URL';
    }
    if (type === 'filter') {
      return item.value || 'No pattern';
    }
  };

  const getName = () => {
    if (item.comment) return item.comment;
    if (type === 'header') return item.name || 'Unnamed Header';
    if (type === 'redirect') return 'Redirect';
    if (type === 'filter') return 'Filter';
  };

  return (
    <div
      onClick={onSelect}
      className={`px-3 py-2 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-bg-tertiary border-l-2 border-primary'
          : 'hover:bg-bg-tertiary'
      }`}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={item.enabled}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onToggleEnabled(item.id, type, e.target.checked)}
          className="mt-1 accent-primary cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-text-primary truncate">{getName()}</div>
          <div className="text-xs text-text-secondary truncate">{getPreview()}</div>
        </div>
      </div>
    </div>
  );
}
