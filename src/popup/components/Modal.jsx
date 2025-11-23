import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, message, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel', confirmStyle = 'danger' }) {
  if (!isOpen) return null;

  const confirmClasses = confirmStyle === 'danger' 
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-primary hover:bg-primary-dark text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      
      <div 
        className="relative bg-bg-secondary border border-border rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <p className="text-text-secondary text-sm">{message}</p>
        </div>

        <div className="flex gap-3 p-4 border-t border-border">
          <button
            onClick={() => {
              onConfirm?.();
              onClose();
            }}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${confirmClasses}`}
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-bg-tertiary hover:bg-bg-primary border border-border text-text-primary rounded-md text-sm font-medium transition-colors"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
