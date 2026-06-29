import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Calendar, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { reportService } from '../services/api';

const Reports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await reportService.getReports();
        setReports(data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch analytics data.');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleExportCSV = () => {
    if (!reports) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Metric,Value\n";
    csvContent += `Total Logged Detections,${reports.total_violations}\n`;
    csvContent += `Approved Tickets,${reports.approved_violations}\n`;
    csvContent += `Dismissed Events,${reports.dismissed_violations}\n`;
    
    csvContent += "\nDaily Trend Data\nDate,Detections\n";
    reports.daily_trend.forEach(row => {
      csvContent += `${row.date},${row.count}\n`;
    });

    csvContent += "\nCamera Distribution\nCamera Location,Detections\n";
    reports.camera_distribution.forEach(row => {
      csvContent += `"${row.camera_name}",${row.count}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `emission_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Analyzing logs & generating report...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', color: 'var(--color-danger)' }}>{error}</div>
    );
  }

  // Calculate stats
  const total = reports.total_violations || 0;
  const approved = reports.approved_violations || 0;
  const dismissed = reports.dismissed_violations || 0;
  const rate = total > 0 ? ((approved / total) * 100).toFixed(1) : "0.0";

  const dailyTrend = reports.daily_trend || [];
  const cameraDistribution = reports.camera_distribution || [];

  const maxDaily = Math.max(...dailyTrend.map(d => d.count), 1);
  const maxCamera = Math.max(...cameraDistribution.map(d => d.count), 1);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Compliance Reports</h1>
          <p className="page-subtitle">Historical violation data and camera distribution trends</p>
        </div>
        <button onClick={handleExportCSV} className="btn btn-primary">
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="metrics-grid">
        <div className="metric-card glass-panel" style={{ borderLeft: '3px solid var(--color-primary)' }}>
          <div className="metric-header">
            <span>Detections Logged</span>
            <Activity size={16} color="var(--color-primary)" />
          </div>
          <div className="metric-value">{total}</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Total vehicle detections</span>
        </div>
        
        <div className="metric-card glass-panel" style={{ borderLeft: '3px solid var(--color-success)' }}>
          <div className="metric-header">
            <span>Approved Penalty Tickets</span>
            <ShieldCheck size={16} color="var(--color-success)" />
          </div>
          <div className="metric-value">{approved}</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Definitive violations verified</span>
        </div>

        <div className="metric-card glass-panel" style={{ borderLeft: '3px solid var(--color-danger)' }}>
          <div className="metric-header">
            <span>Dismissed Events</span>
            <AlertTriangle size={16} color="var(--color-danger)" />
          </div>
          <div className="metric-value">{dismissed}</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>False alarms / partial views</span>
        </div>

        <div className="metric-card glass-panel" style={{ borderLeft: '3px solid var(--color-warning)' }}>
          <div className="metric-header">
            <span>Fining Rate</span>
            <BarChart3 size={16} color="var(--color-warning)" />
          </div>
          <div className="metric-value">{rate}%</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Penalization ratio of reports</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Trend line SVG */}
        <div className="glass-panel chart-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Calendar size={18} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Daily Alert Frequency</h3>
          </div>
          
          <div className="chart-placeholder">
            {dailyTrend.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                No trend logs available.
              </div>
            ) : (
              dailyTrend.map((d) => {
                const heightPct = (d.count / maxDaily) * 75;
                return (
                  <div key={d.date} className="bar-column">
                    <div className="bar-fill" style={{ height: `${heightPct}%`, background: 'linear-gradient(0deg, var(--color-primary), rgba(0,210,255,0.4))' }}>
                      <span className="bar-value">{d.count}</span>
                    </div>
                    <span className="bar-label">{d.date.substring(5)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Camera distribution chart */}
        <div className="glass-panel chart-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <BarChart3 size={18} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Detections by Camera</h3>
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
            {cameraDistribution.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                No camera statistics available.
              </div>
            ) : (
              cameraDistribution.map((cam) => {
                const widthPct = (cam.count / maxCamera) * 100;
                return (
                  <div key={cam.camera_name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 500 }}>
                      <span>{cam.camera_name}</span>
                      <span>{cam.count} detections</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${widthPct}%`, 
                          background: 'linear-gradient(90deg, var(--color-primary), #a855f7)',
                          borderRadius: '4px'
                        }} 
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
