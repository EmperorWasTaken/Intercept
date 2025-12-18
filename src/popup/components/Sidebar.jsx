import { useState, useEffect } from 'react';
import { CirclePlus, Search, X } from 'lucide-react';

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
  onToggleEnabled
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showEnabledOnly, setShowEnabledOnly] = useState(false);
  
  const filterItems = (items) => {
    if (!items) return [];
    
    let filtered = items;
    
    if (showEnabledOnly) {
      filtered = filtered.filter(item => item.enabled);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const comment = (item.comment || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        const value = (item.value || '').toLowerCase();
        const from = (item.from || '').toLowerCase();
        const to = (item.to || '').toLowerCase();
        const pattern = (item.pattern || '').toLowerCase();
        
        return comment.includes(query) || 
               name.includes(query) || 
               value.includes(query) ||
               from.includes(query) ||
               to.includes(query) ||
               pattern.includes(query);
      });
    }
    
    return filtered;
  };
  
  return (
    <div className="w-64 bg-bg-secondary border-r border-border flex flex-col h-full">
      <div className="p-3 border-b border-border shrink-0 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rules..."
            className="w-full pl-8 pr-8 py-2 bg-bg-primary text-text-primary border border-border rounded-md text-sm focus:outline-none focus:border-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-text-secondary hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:text-primary">
          <input
            type="checkbox"
            checked={showEnabledOnly}
            onChange={(e) => setShowEnabledOnly(e.target.checked)}
            className="accent-primary cursor-pointer"
          />
          <span>Show enabled only</span>
        </label>
      </div>

      <div className="flex-1 overflow-y-auto">
        <SidebarSection
          title="Request Headers"
          items={filterItems(headers)}
          type="header"
          selectedItem={selectedItem}
          onSelectItem={onSelectItem}
          onAdd={onAddHeader}
          onToggleEnabled={onToggleEnabled}
        />

        <SidebarSection
          title="Response Headers"
          items={filterItems(responseHeaders)}
          type="responseHeader"
          selectedItem={selectedItem}
          onSelectItem={onSelectItem}
          onAdd={onAddResponseHeader}
          onToggleEnabled={onToggleEnabled}
        />

        <SidebarSection
          title="URL Redirects"
          items={filterItems(redirects)}
          type="redirect"
          selectedItem={selectedItem}
          onSelectItem={onSelectItem}
          onAdd={onAddRedirect}
          onToggleEnabled={onToggleEnabled}
        />

        <SidebarSection
          title="Block Requests"
          items={filterItems(blocks)}
          type="block"
          selectedItem={selectedItem}
          onSelectItem={onSelectItem}
          onAdd={onAddBlock}
          onToggleEnabled={onToggleEnabled}
        />

        <SidebarSection
          title="URL Filters"
          items={filterItems(filters)}
          type="filter"
          selectedItem={selectedItem}
          onSelectItem={onSelectItem}
          onAdd={onAddFilter}
          onToggleEnabled={onToggleEnabled}
        />
      </div>
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
    if (type === 'header' || type === 'responseHeader') {
      return item.value ? `${item.value.substring(0, 20)}${item.value.length > 20 ? '...' : ''}` : 'No value';
    }
    if (type === 'redirect') {
      return item.from || 'No URL';
    }
    if (type === 'block') {
      return item.pattern || 'No pattern';
    }
    if (type === 'filter') {
      return item.value || 'No pattern';
    }
  };

  const getName = () => {
    if (item.comment) return item.comment;
    if (type === 'header') return item.name || 'Unnamed Header';
    if (type === 'responseHeader') return item.name || 'Unnamed Response Header';
    if (type === 'redirect') return 'Redirect';
    if (type === 'block') return 'Block';
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
