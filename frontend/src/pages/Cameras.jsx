import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Video, CheckCircle, XCircle, Plus, AlertCircle } from 'lucide-react';
import { cameraService, authService } from '../services/api';

const Cameras = () => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('active');
  const [formError, setFormError] = useState('');

  const isAdmin = authService.getUserRole() === 'admin';

  const fetchCameras = async () => {
    try {
      const data = await cameraService.getCameras();
      setCameras(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch registered cameras.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!name || !location) {
      setFormError('Please fill out all fields.');
      return;
    }

    try {
      await cameraService.registerCamera({ name, location, status });
      setName('');
      setLocation('');
      setStatus('active');
      setShowAddForm(false);
      fetchCameras();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to register camera stream.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Connecting to video nodes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', color: 'var(--color-danger)' }}>{error}</div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Active Feed Ingestion Nodes</h1>
          <p className="page-subtitle">Manage YOLO inspection camera streams and ingestion status</p>
        </div>
        {isAdmin && !showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>Register Camera</span>
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px', maxWidth: '600px' }}>
          <h3 style={{ marginBottom: '20px', fontFamily: 'var(--font-accent)', fontSize: '1.2rem', fontWeight: 600 }}>
            Register New Video Stream Node
          </h3>
          
          {formError && (
            <div style={{ padding: '12px 16px', background: 'rgba(255, 69, 58, 0.08)', border: '1px solid rgba(255, 69, 58, 0.2)', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleRegister}>
            <div className="input-group">
              <label className="input-label">Camera Name</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Toll Plaza Lane 2, Highway Highway Gate" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="input-group">
              <label className="input-label">Installation Location</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. NH-44 Toll Road KM 120, Outer Ring Road, Sector 5" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: '24px' }}>
              <label className="input-label">Initial Status</label>
              <select 
                className="input-field" 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active (Enable YOLO parsing)</option>
                <option value="inactive">Inactive (Standby mode)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary">
                Register Stream
              </button>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)} 
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {cameras.map((cam) => (
          <div key={cam.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', background: 'rgba(0, 210, 255, 0.08)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                  <Video size={20} color="var(--color-primary)" />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{cam.name}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    <MapPin size={12} />
                    <span>{cam.location}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {cam.status === 'active' ? (
                  <>
                    <CheckCircle size={14} color="var(--color-success)" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>ACTIVE</span>
                  </>
                ) : (
                  <>
                    <XCircle size={14} color="var(--color-text-muted)" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>STANDBY</span>
                  </>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              <span>Registered on: {new Date(cam.created_at).toLocaleDateString()}</span>
              <span>ID: #{cam.id.substring(0, 8)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Cameras;
