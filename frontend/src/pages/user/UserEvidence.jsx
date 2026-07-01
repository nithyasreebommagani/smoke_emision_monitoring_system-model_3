import React, { useState, useEffect } from 'react';
import { ShieldAlert, Image, Video, Loader } from 'lucide-react';
import { userService } from '../../services/api';

const API_BASE = '';

const UserEvidence = ({ violationId, onClose }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMedia, setActiveMedia] = useState('video');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const data = await userService.getViolationDetail(violationId);
        setDetails(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load evidence.');
      } finally {
        setLoading(false);
      }
    };

    if (violationId) {
      fetchDetails();
    }
  }, [violationId]);

  if (!violationId) return null;

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content glass-panel">
          <div style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '12px' }}>
            <Loader className="spin" />
            <span>Loading Evidence...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="modal-overlay">
        <div className="modal-content glass-panel">
          <button className="modal-close" onClick={onClose}>&times;</button>
          <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>
            {error || 'No evidence found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>

        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert color="red" />
          Evidence Review
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginTop: '20px' }}>
          
          {/* LEFT SIDE */}
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button 
                className={`btn ${activeMedia === 'video' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveMedia('video')}
              >
                <Video size={14} />
                Proof Video
              </button>
              <button 
                className={`btn ${activeMedia === 'frame' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveMedia('frame')}
              >
                <Image size={14} />
                Annotated Frame
              </button>
            </div>

            {activeMedia === 'video' ? (
              <video 
                controls 
                autoPlay 
                style={{ width: '100%', borderRadius: '8px' }}
                src={`${API_BASE}/evidence/${details.proof_video_path}`}
              />
            ) : (
              <img 
                alt="Annotated" 
                style={{ width: '100%', borderRadius: '8px' }}
                src={`${API_BASE}/evidence/${details.annotated_frame_path}`}
              />
            )}
          </div>

          {/* RIGHT SIDE */}
          <div>
            <h3>Vehicle Crop</h3>
            <img 
              alt="Vehicle" 
              style={{ width: '100%', borderRadius: '8px', marginBottom: '15px' }}
              src={`${API_BASE}/evidence/${details.vehicle_crop_path}`}
            />

            <h3>Plate Crop</h3>
            <img 
              alt="Plate" 
              style={{ width: '100%', borderRadius: '8px', marginBottom: '15px' }}
              src={`${API_BASE}/evidence/${details.plate_crop_path}`}
            />

            <div style={{ marginTop: '10px' }}>
              <p><b>Plate:</b> {details.plate_number}</p>
              <p><b>Camera:</b> {details.camera_name}</p>
              <p><b>Confidence:</b> {(details.confidence * 100).toFixed(1)}%</p>
              <p><b>Status:</b> 
                <span className={`status-badge ${
                  details.status === 'approved' ? 'success' :
                  details.status === 'dismissed' ? 'danger' : 'warning'
                }`} style={{ marginLeft: '8px', fontSize: '0.75rem' }}>
                  {details.status.toUpperCase()}
                </span>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UserEvidence;
