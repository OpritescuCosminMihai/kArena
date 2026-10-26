import { useEffect } from 'react';

export default function Modal({ onClose, labelledBy, children, onSubmit }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy} noValidate
        onSubmit={(e) => { e.preventDefault(); onSubmit && onSubmit(); }}>
        {children}
      </form>
    </div>
  );
}
