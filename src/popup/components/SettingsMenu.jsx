import { useState, useRef, useEffect } from 'react';
import { Settings, FolderOpen, Shield, BarChart3, Download, Upload } from 'lucide-react';

export default function SettingsMenu({ 
  onManageProfiles, 
  onValidate, 
  onStats, 
  onImport, 
  onExport,
  selectedItem 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  function handleMenuClick(action) {
    setIsOpen(false);
    action();
  }

  const isActive = (type) => selectedItem?.type === type;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 bg-bg-tertiary hover:bg-bg-primary border border-border text-text-primary rounded-md text-sm transition-colors flex items-center gap-2"
        title="Settings & Tools"
      >
        <Settings size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-bg-secondary border border-border rounded-md shadow-lg z-50">
          <div className="py-1">
            <button
              onClick={() => handleMenuClick(onManageProfiles)}
              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-bg-tertiary flex items-center gap-3 transition-colors ${
                isActive('profiles') ? 'bg-bg-tertiary text-primary' : 'text-text-primary'
              }`}
            >
              <FolderOpen size={16} />
              <span>Manage Profiles</span>
            </button>
            
            <div className="my-1 border-t border-border" />
            
            <button
              onClick={() => handleMenuClick(onValidate)}
              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-bg-tertiary flex items-center gap-3 transition-colors ${
                isActive('validate') ? 'bg-bg-tertiary text-primary' : 'text-text-primary'
              }`}
            >
              <Shield size={16} />
              <span>Validate & Test</span>
            </button>
            
            <button
              onClick={() => handleMenuClick(onStats)}
              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-bg-tertiary flex items-center gap-3 transition-colors ${
                isActive('stats') ? 'bg-bg-tertiary text-primary' : 'text-text-primary'
              }`}
            >
              <BarChart3 size={16} />
              <span>Statistics</span>
            </button>
            
            <div className="my-1 border-t border-border" />
            
            <button
              onClick={() => handleMenuClick(onImport)}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-bg-tertiary flex items-center gap-3 text-text-primary transition-colors"
            >
              <Upload size={16} />
              <span>Import Profile</span>
            </button>
            
            <button
              onClick={() => handleMenuClick(onExport)}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-bg-tertiary flex items-center gap-3 text-text-primary transition-colors"
            >
              <Download size={16} />
              <span>Export Profile</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
