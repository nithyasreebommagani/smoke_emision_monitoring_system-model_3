import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const NotificationToast = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast-alert glass-panel" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <AlertTriangle size={20} color="var(--color-danger)" style={{ marginTop: '2px' }} />
          <div className="toast-body">
            <div className="toast-title">Smoke Violation Alert!</div>
            <div className="toast-desc">
              Vehicle <b>{toast.plate_number}</b> detected with excessive smoke emissions at {toast.camera_name || 'Toll Plaza'}.
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Time Offset: {toast.timestamp} | Confidence: {(toast.confidence * 100).toFixed(0)}%
            </div>
          </div>
          <button 
            onClick={() => onDismiss(toast.id)} 
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', alignSelf: 'flex-start' }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
