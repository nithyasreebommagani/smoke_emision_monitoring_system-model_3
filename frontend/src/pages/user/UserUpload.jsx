import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileVideo, CheckCircle2, AlertCircle, Loader, RefreshCw, Eye } from 'lucide-react';
import { uploadService } from '../../services/api';

const UserUpload = () => {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videos, setVideos] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const fetchHistory = async () => {
    try {
      const data = await uploadService.getMyVideos();
      setVideos(data);
    } catch (err) {
      console.error('Failed to fetch upload history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    setError('');
    setSuccessMsg('');
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    setError('');
    setSuccessMsg('');
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['mp4', 'avi', 'mov'].includes(ext)) {
      setError('Only .mp4, .avi, and .mov video formats are supported.');
      return;
    }
    // Limit to 100MB
    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('File size exceeds the limit of 100MB.');
      return;
    }
    setFile(selectedFile);
  };

  const handleUploadSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError('');
    setSuccessMsg('');

    try {
      await uploadService.uploadVideo(file, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setProgress(percentCompleted);
      });

      setSuccessMsg('Video uploaded successfully and queued for processing!');
      setFile(null);
      fetchHistory();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Video upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Upload Video Portal</h1>
          <p className="page-subtitle">Submit video footage for automated smoke emission detection</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Upload Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 600 }}>Analyze New Video</h3>
          
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              height: '240px',
              border: dragging ? '2px dashed var(--color-primary)' : '2px dashed var(--border-color)',
              background: dragging ? 'rgba(0, 210, 255, 0.03)' : 'rgba(0,0,0,0.1)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)',
              gap: '12px',
              padding: '20px',
              textAlign: 'center'
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept=".mp4,.avi,.mov"
            />
            <Upload size={40} color={dragging ? 'var(--color-primary)' : 'var(--color-text-secondary)'} />
            <div>
              <p style={{ fontWeight: 600, margin: '0 0 4px 0', fontSize: '0.95rem' }}>
                Drag & Drop video file here
              </p>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', margin: 0 }}>
                or click to browse from files (MP4, AVI, MOV up to 100MB)
              </p>
            </div>
          </div>

          {file && (
            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileVideo size={20} color="var(--color-primary)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              </div>
              <button 
                onClick={handleUploadSubmit}
                className="btn btn-primary"
                disabled={uploading}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                {uploading ? `Uploading ${progress}%` : 'Upload & Analyze'}
              </button>
            </div>
          )}

          {uploading && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                <span>Uploading file...</span>
                <span>{progress}%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.1s ease' }}></div>
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: '20px', display: 'flex', gap: '8px', padding: '12px 16px', background: 'rgba(255, 69, 58, 0.08)', border: '1px solid rgba(255, 69, 58, 0.2)', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '0.85rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{ marginTop: '20px', display: 'flex', gap: '8px', padding: '12px 16px', background: 'rgba(50, 215, 75, 0.08)', border: '1px solid rgba(50, 215, 75, 0.2)', borderRadius: '8px', color: '#32d74b', fontSize: '0.85rem' }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Upload History list */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Upload History</h3>
            <button 
              onClick={fetchHistory}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '340px' }}>
            {loadingHistory ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <Loader className="spin" size={24} color="var(--color-primary)" />
              </div>
            ) : videos.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                No video uploads found.
              </div>
            ) : (
              videos.map((vid) => (
                <div 
                  key={vid.id}
                  style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileVideo size={20} color="var(--color-primary)" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vid.filename}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        {new Date(vid.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <span className={`status-badge ${
                      vid.status === 'completed' ? 'success' :
                      vid.status === 'processing' ? 'primary' :
                      vid.status === 'failed' ? 'danger' : 'secondary'
                    }`} style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {vid.status.toUpperCase()}
                    </span>
                    {vid.status === 'completed' && (
                      <button
                        onClick={() => navigate(`/user/violations?uploaded_video_id=${vid.id}`)}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={12} />
                        Results
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserUpload;
