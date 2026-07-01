import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, RotateCcw, AlertOctagon, Eye, Clock, ShieldAlert } from 'lucide-react';
import { userService } from '../../services/api';

const UserViolations = ({ newViolationTrigger, onViewEvidence }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const uploadedVideoFilter = searchParams.get('uploaded_video_id') || '';

  const [violations, setViolations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [plateSearch, setPlateSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const data = await userService.getMyViolations({
        skip: (page - 1) * limit,
        limit,
        plate_number: plateSearch || undefined,
        status: statusFilter || undefined,
        uploaded_video_id: uploadedVideoFilter || undefined
      });
      setViolations(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch violations records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, [page, statusFilter, uploadedVideoFilter, newViolationTrigger]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchViolations();
  };

  const handleReset = () => {
    setPlateSearch('');
    setStatusFilter('');
    setSearchParams({});
    setPage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Detections Log</h1>
          <p className="page-subtitle">Historical log of violations generated from your uploaded videos</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-secondary)' }} />
            <input 
              type="text"
              placeholder="Search plate number..."
              className="input-field"
              style={{ width: '100%', paddingLeft: '40px', paddingRight: '12px', height: '40px' }}
              value={plateSearch}
              onChange={(e) => setPlateSearch(e.target.value)}
            />
          </div>

          <div style={{ width: '180px' }}>
            <select
              className="input-field"
              style={{ width: '100%', height: '40px' }}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          {uploadedVideoFilter && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '6px 12px', 
              background: 'rgba(0, 210, 255, 0.08)', 
              border: '1px solid rgba(0, 210, 255, 0.2)', 
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: 'var(--color-primary)' 
            }}>
              <span>Video ID Filter active</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ height: '40px', padding: '0 20px' }}>
            Search
          </button>

          <button 
            type="button" 
            className="btn btn-outline" 
            style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={handleReset}
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </form>
      </div>

      {/* Violations Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
            <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Loading Violations...</span>
          </div>
        ) : error ? (
          <div style={{ padding: '24px', color: 'var(--color-danger)', textAlign: 'center' }}>{error}</div>
        ) : violations.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <AlertOctagon size={48} style={{ margin: '0 auto 16px auto', display: 'block', opacity: 0.5 }} />
            <p style={{ fontWeight: 600, margin: '0 0 4px 0' }}>No Violations Logged</p>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Try adjusting your filters or upload new footage.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="violations-table">
              <thead>
                <tr>
                  <th>Plate Number</th>
                  <th>Detection Time</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {violations.map((violation) => (
                  <tr key={violation.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ padding: '4px', background: 'rgba(255, 69, 58, 0.05)', borderRadius: '4px' }}>
                          <ShieldAlert size={16} color="var(--color-danger)" />
                        </div>
                        <strong style={{ fontSize: '0.9rem', letterSpacing: '0.5px' }}>
                          {violation.plate_number.toUpperCase()}
                        </strong>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        <Clock size={14} />
                        <span>{new Date(violation.created_at).toLocaleString()}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                        {(violation.confidence * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${
                        violation.status === 'approved' ? 'success' :
                        violation.status === 'dismissed' ? 'danger' : 'warning'
                      }`} style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        {violation.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => onViewEvidence(violation.id)}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Eye size={12} />
                        <span>View Evidence</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {total > limit && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total} records
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setPage(p => Math.max(p - 1, 1))} 
                className="btn btn-outline" 
                style={{ padding: '6px 12px', fontSize: '0.8-rem' }}
                disabled={page === 1}
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => Math.min(p + 1, Math.ceil(total / limit)))} 
                className="btn btn-outline" 
                style={{ padding: '6px 12px', fontSize: '0.8-rem' }}
                disabled={page >= Math.ceil(total / limit)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserViolations;
