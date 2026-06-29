import React, { useState, useEffect } from 'react';
import { Check, X, ShieldAlert, Clock, Image, Video, Loader } from 'lucide-react';
import { violationService } from '../services/api';

const Evidence = ({ violationId, onClose, onRefresh }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMedia, setActiveMedia] = useState('video'); // 'video' or 'frame'

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const data = await violationService.getViolationDetails(violationId);
        setDetails(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load evidence files.');
      } finally {
        setLoading(false);
      }
    };
    if (violationId) fetchDetails();
  }, [violationId]);

  const handleAction = async (status) => {
    try {
      await violationService.updateStatus(violationId, status);
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to update ticket status.');
    }
  };

  if (!violationId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '350px', gap: '16px' }}>
            <Loader className="spin" size={32} color="var(--color-primary)" />
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Retrieving High-Res Evidence...</span>
          </div>
        ) : error ? (
          <div style={{ padding: '40px', color: 'var(--color-danger)', textAlign: 'center' }}>
            {error}
          </div>
        ) : (
          <>
            <div>
              <h2 style={{ fontFamily: 'var(--font-accent)', fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert color="var(--color-danger)" />
                <span>Emission Inspection - Ticket ID: #{details.id.substring(0, 8)}</span>
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                Verify plate number and vehicle crops before approving violation penalty
              </p>
            </div>

            <div className="evidence-split">
              {/* Media Player */}
              <div className="media-viewer">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setActiveMedia('video')}
                    className={`btn ${activeMedia === 'video' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Video size={14} />
                    <span>Proof Video Clip</span>
                  </button>
                  <button 
                    onClick={() => setActiveMedia('frame')}
                    className={`btn ${activeMedia === 'frame' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Image size={14} />
                    <span>Full Annotated Frame</span>
                  </button>
                </div>

                <div className="media-frame">
                  {activeMedia === 'video' ? (
                    <video 
                      src={`/evidence/${details.proof_video_path}`}
                      controls 
                      autoPlay 
                      loop
                      style={{ background: '#000' }}
                    />
                  ) : (
                    <img 
                      src={`/evidence/${details.annotated_frame_path}`}
                      alt="Annotated Frame" 
                    />
                  )}
                </div>
              </div>

              {/* Crop & Meta panel */}
              <div className="evidence-meta-panel">
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Evidence Crops
                </div>
                <div className="crop-gallery">
                  <div className="crop-card">
                    <img src={`/evidence/${details.vehicle_crop_path}`} alt="Vehicle Crop" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Vehicle Crop</span>
                  </div>
                  <div className="crop-card">
                    <img src={`/evidence/${details.plate_crop_path}`} alt="Plate Crop" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Plate Crop</span>
                  </div>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <div className="meta-row">
                    <span className="meta-label">License Plate</span>
                    <span className="meta-value" style={{ fontFamily: 'monospace', color: 'var(--color-primary)', fontSize: '1.1rem', fontWeight: 'bold' }}>
                      {details.plate_number}
                    </span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Camera Stream</span>
                    <span className="meta-value">{details.camera_name || 'Toll Plaza Lane 1'}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Timestamp</span>
                    <span className="meta-value">{new Date(details.created_at).toLocaleString()}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">OCR Confidence</span>
                    <span className="meta-value">{(details.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Model version</span>
                    <span className="meta-value">{details.model_version}</span>
                  </div>
                </div>

                {details.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '20px' }}>
                    <button 
                      onClick={() => handleAction('approved')}
                      className="btn btn-primary" 
                      style={{ flex: 1, padding: '12px', background: 'var(--color-success)', color: '#000' }}
                    >
                      <Check size={16} />
                      <span>Approve</span>
                    </button>
                    <button 
                      onClick={() => handleAction('dismissed')}
                      className="btn btn-secondary" 
                      style={{ flex: 1, padding: '12px', color: 'var(--color-danger)', borderColor: 'rgba(255, 69, 58, 0.2)' }}
                    >
                      <X size={16} />
                      <span>Dismiss</span>
                    </button>
                  </div>
                )}

                {details.status !== 'pending' && (
                  <div 
                    style={{ 
                      marginTop: 'auto', 
                      padding: '16px', 
                      background: details.status === 'approved' ? 'rgba(50, 215, 75, 0.08)' : 'rgba(255, 69, 58, 0.08)', 
                      border: `1px solid ${details.status === 'approved' ? 'rgba(50, 215, 75, 0.2)' : 'rgba(255, 69, 58, 0.2)'}`,
                      borderRadius: '8px',
                      color: details.status === 'approved' ? 'var(--color-success)' : 'var(--color-danger)',
                      textAlign: 'center',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Ticket {details.status}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Evidence;
