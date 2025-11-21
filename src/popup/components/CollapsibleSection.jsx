import { useState } from 'react';

export default function CollapsibleSection({ title, onAdd, children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className="section">
      <div 
        className={`section-header ${collapsed ? 'collapsed' : ''}`}
        onClick={() => setCollapsed(!collapsed)}
      >
        <span>{collapsed ? '▶' : '▼'} {title}</span>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
        >
          + Add
        </button>
      </div>
      {!collapsed && (
        <div className="section-content">
          {children}
        </div>
      )}
    </section>
  );
}