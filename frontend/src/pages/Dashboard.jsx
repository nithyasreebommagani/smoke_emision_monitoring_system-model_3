import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, ShieldAlert, Video, Activity, ChevronRight } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { dashboardService } from '../services/api';

const Dashboard = ({ newViolationTrigger, onViewEvidence }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchSummary = async () => {
    try {
      const data = await dashboardService.getSummary();
      setSummary(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [newViolationTrigger]); // Re-fetch dashboard metrics when a new WebSocket violation event is triggered

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

  // Create SVG elements for daily trend visualization

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Operational Dashboard</h1>
          <p className="page-subtitle">Real-time smoke emission tracking and violation metrics</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(50, 215, 75, 0.08)', borderRadius: '8px', border: '1px solid rgba(50, 215, 75, 0.2)' }}>
          <Activity size={16} color="var(--color-success)" className="pulse" />
          <span style={{ fontSize: '0.85rem', color: 'var(--color-success)', fontWeight: 600 }}>SYSTEM OPERATIONAL</span>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard 
          title="Total Violations" 
          value={summary?.total_violations ?? 0} 
          icon={AlertOctagon} 
          description="Cumulative system log"  
        />
        <MetricCard 
          title="Violations Today" 
          value={summary?.today_violations ?? 0} 
          icon={ShieldAlert} 
          description="Detected since midnight"  
          color="var(--color-danger)" 
        />

      </div>

      <div className="dashboard-grid">
        {/* Real-time alerts feed */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="chart-title" style={{ margin: 0 }}>Recent Emission Violation Alerts</h3>
            <button 
              onClick={() => navigate('/violations')} 
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <span>View All</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {summary?.recent_alerts?.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                No violations detected in current shift.
              </div>
            ) : (
              summary?.recent_alerts?.map((alert) => (
                <div 
                  key={alert.id} 
                  onClick={() => onViewEvidence(alert.violation_id)}
                  style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(0, 210, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', background: 'rgba(255, 69, 58, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AlertOctagon size={18} color="var(--color-danger)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{alert.message}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        Time: {new Date(alert.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="status-badge pending" style={{ fontSize: '0.65rem' }}>PENDING VERIFICATION</span>
                    <ChevronRight size={16} color="var(--color-text-muted)" />
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

export default Dashboard;
