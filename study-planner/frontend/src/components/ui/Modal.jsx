import React, { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg card p-6 shadow-float animate-slide-up bg-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-600 text-text">{title}</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ghost hover:text-text hover:bg-surface transition"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}
