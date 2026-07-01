import React from 'react';
import { AlertTriangle, X, CheckCircle, Info } from 'lucide-react';

const NotificationToast = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const isVideoStatus = toast.type === 'video_status';
        
        let borderLeftColor = 'var(--color-danger)';
        let Icon = AlertTriangle;
        let iconColor = 'var(--color-danger)';
        let title = 'Smoke Violation Alert!';

        if (isVideoStatus) {
          if (toast.status === 'completed') {
            borderLeftColor = 'var(--color-success)';
            Icon = CheckCircle;
            iconColor = 'var(--color-success)';
            title = 'Video Processing Complete';
          } else if (toast.status === 'failed') {
            borderLeftColor = 'var(--color-danger)';
            Icon = AlertTriangle;
            iconColor = 'var(--color-danger)';
            title = 'Video Processing Failed';
          } else {
            borderLeftColor = '#00d2ff';
            Icon = Info;
            iconColor = '#00d2ff';
            title = 'Video Processing Started';
          }
        }

        return (
          <div key={toast.id} className="toast-alert glass-panel" style={{ borderLeft: `4px solid ${borderLeftColor}` }}>
            <Icon size={20} color={iconColor} style={{ marginTop: '2px', flexShrink: 0 }} />
            <div className="toast-body">
              <div className="toast-title">{title}</div>
              {isVideoStatus ? (
                <div className="toast-desc">{toast.message}</div>
              ) : (
                <>
                  <div className="toast-desc">
                    Vehicle <b>{toast.plate_number}</b> detected with excessive smoke emissions at {toast.camera_name || 'Toll Plaza'}.
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Time Offset: {toast.timestamp} | Confidence: {toast.confidence ? `${(toast.confidence * 100).toFixed(0)}%` : 'N/A'}
                  </div>
                </>
              )}
            </div>
            <button 
              onClick={() => onDismiss(toast.id)} 
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', alignSelf: 'flex-start' }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationToast;
