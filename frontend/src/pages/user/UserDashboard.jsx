import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, Video, Activity, ChevronRight, Clock, FileVideo } from 'lucide-react';
import MetricCard from '../../components/MetricCard';
import { userService } from '../../services/api';

const UserDashboard = ({ newViolationTrigger, onViewEvidence }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      const data = await userService.getDashboard();
      setStats(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [newViolationTrigger]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Loading Dashboard...</div>
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
          <h1 className="page-title">User Dashboard</h1>
          <p className="page-subtitle">Personal uploads overview and emission analysis metrics</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(0, 210, 255, 0.08)', borderRadius: '8px', border: '1px solid rgba(0, 210, 255, 0.2)' }}>
          <Activity size={16} color="var(--color-primary)" className="pulse" />
          <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 600 }}>USER SESSION ACTIVE</span>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard 
          title="Total Uploaded Videos" 
          value={stats?.total_uploaded_videos ?? 0} 
          icon={Video} 
          description="Total clips processed"  
        />
        <MetricCard 
          title="Total Violations" 
          value={stats?.total_violations ?? 0} 
          icon={AlertOctagon} 
          description="Detected from uploads"  
          color="var(--color-danger)" 
        />
      </div>

      <div className="dashboard-grid">
        {/* Recent Violations Feed */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="chart-title" style={{ margin: 0 }}>My Recent Violations</h3>
            <button 
              onClick={() => navigate('/user/violations')} 
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <span>View All</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats?.recent_violations?.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--color-text-secondary)', fontSize: '0.9rem', minHeight: '150px' }}>
                No violations detected from your uploads.
              </div>
            ) : (
              stats?.recent_violations?.map((violation) => (
                <div 
                  key={violation.id} 
                  onClick={() => onViewEvidence(violation.id)}
                  style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(0, 210, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className={`status-badge danger`} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>VIOLATION</span>
                      <strong style={{ fontSize: '0.9rem' }}>{violation.plate_number}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      <span>Processed at {new Date(violation.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>{(violation.confidence * 100).toFixed(1)}% Conf.</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>Click to view evidence</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Uploads Feed */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="chart-title" style={{ margin: 0 }}>My Recent Video Uploads</h3>
            <button 
              onClick={() => navigate('/user/upload')} 
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <span>Manage Videos</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats?.recent_uploads?.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--color-text-secondary)', fontSize: '0.9rem', minHeight: '150px' }}>
                You haven't uploaded any videos yet.
              </div>
            ) : (
              stats?.recent_uploads?.map((upload) => (
                <div 
                  key={upload.id} 
                  style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileVideo size={20} color="var(--color-primary)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{upload.filename}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Uploaded {new Date(upload.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className={`status-badge ${
                      upload.status === 'completed' ? 'success' :
                      upload.status === 'processing' ? 'primary' :
                      upload.status === 'failed' ? 'danger' : 'secondary'
                    }`} style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {upload.status.toUpperCase()}
                    </span>
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

export default UserDashboard;
