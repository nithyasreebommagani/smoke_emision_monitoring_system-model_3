import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Eye, ArrowUpDown, ChevronLeft, ChevronRight, Check, X, RotateCcw } from 'lucide-react';
import { violationService, authService } from '../services/api';

const Violations = ({ onViewEvidence }) => {
  const [searchParams] = useSearchParams();
  const uploadedVideoId = searchParams.get('uploaded_video_id') || '';
  const role = authService.getUserRole();
  const isAdmin = role === 'admin';

  const [violations, setViolations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchPlate, setSearchPlate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * limit;
      const params = {
        skip,
        limit,
        sort_by: sortBy,
        sort_order: sortOrder
      };
      if (searchPlate) params.plate_number = searchPlate;
      if (statusFilter) params.status = statusFilter;
      if (uploadedVideoId) params.uploaded_video_id = uploadedVideoId;

      const data = await violationService.getViolations(params);
      setViolations(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('Error fetching violations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, [page, statusFilter, sortBy, sortOrder, uploadedVideoId]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchViolations();
  };

  const handleReset = () => {
    setSearchPlate('');
    setStatusFilter('');
    setPage(1);
    // Explicitly call fetch because the state update won't trigger useEffect instantly for searchPlate
    setTimeout(() => fetchViolations(), 0);
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleUpdateStatus = async (id, newStatus, e) => {
    e.stopPropagation(); // Avoid triggering row click to view evidence
    try {
      await violationService.updateStatus(id, newStatus);
      fetchViolations();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Excessive Emission Logs</h1>
          <p className="page-subtitle">Inspect and verify license plates associated with smoke violations</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <form onSubmit={handleSearch} className="filter-bar">
          <div className="filter-item" style={{ flex: 2 }}>
            <label className="input-label">Search License Plate</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--color-text-muted)' }} />
              <input 
                type="text" 
                className="input-field" 
                style={{ width: '100%', paddingLeft: '44px' }}
                placeholder="Enter plate number (e.g. KA03MH1234)"
                value={searchPlate}
                onChange={(e) => setSearchPlate(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-item">
            <label className="input-label">Verification Status</label>
            <select 
              className="input-field" 
              style={{ width: '100%', appearance: 'none', background: 'var(--bg-input) url("data:image/svg+xml;utf8,<svg fill=\'%2394a3b8\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/><path d=\'M0 0h24v24H0z\' fill=\'none\'/></svg>") no-repeat right 12px center' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Logs</option>
              <option value="pending">Pending Verification</option>
              <option value="approved">Approved Violations</option>
              <option value="dismissed">Dismissed Events</option>
            </select>
          </div>

          <div className="filter-item" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px' }}>
              Filter
            </button>
            <button type="button" onClick={handleReset} className="btn btn-secondary" style={{ padding: '12px' }} title="Reset Filters">
              <RotateCcw size={16} />
            </button>
          </div>
        </form>

        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('created_at')}>
                  Timestamp <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
                </th>
                <th>Camera / Location</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('plate_number')}>
                  Plate Number <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('confidence')}>
                  Confidence <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
                </th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>{isAdmin ? 'Actions' : 'Inspect'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-secondary)' }}>
                    Fetching emission records...
                  </td>
                </tr>
              ) : violations.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-secondary)' }}>
                    No violation records found matching search filters.
                  </td>
                </tr>
              ) : (
                violations
                  .filter(v => v.plate_number !== "UNKNOWN")
                  .map((v) => (
                  <tr 
                    key={v.id} 
                    onClick={() => onViewEvidence(v.id)} 
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{new Date(v.created_at).toLocaleString()}</td>
                    <td>
                      <div><b>{v.camera_name || 'Unknown Source'}</b></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        Time: {v.timestamp}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                      {v.plate_number}
                    </td>
                    <td>
                      {v.confidence
                        ? `${(v.confidence * 100).toFixed(0)}%`
                        : 'N/A'}
                    </td>
                    <td>
                      <span className={`status-badge ${v.status}`}>
                        {v.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {isAdmin && v.status === 'pending' && (
                          <>
                            <button 
                              onClick={(e) => handleUpdateStatus(v.id, 'approved', e)}
                              className="btn" 
                              style={{ padding: '6px', background: 'rgba(50, 215, 75, 0.1)', border: '1px solid rgba(50, 215, 75, 0.2)', color: 'var(--color-success)', borderRadius: '4px' }}
                              title="Approve Ticket"
                            >
                              <Check size={14} />
                            </button>
                            <button 
                              onClick={(e) => handleUpdateStatus(v.id, 'dismissed', e)}
                              className="btn"
                              style={{ padding: '6px', background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.2)', color: 'var(--color-danger)', borderRadius: '4px' }}
                              title="Dismiss Event"
                            >
                              <X size={14} />
                            </button>
                          </>
                        )}
                        <button 
                          className="btn" 
                          style={{ padding: '6px 12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', color: 'var(--color-text-secondary)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Showing <b>{violations.length}</b> of <b>{total}</b> logged events
          </div>
          <div className="pagination-buttons">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-secondary"
              style={{ padding: '8px 12px', opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '0.9rem' }}>
              Page {page} of {totalPages}
            </span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-secondary"
              style={{ padding: '8px 12px', opacity: page === totalPages ? 0.5 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Violations;
