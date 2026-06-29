import React from 'react';

const MetricCard = ({ title, value, icon: Icon, description, trend, trendValue, color = 'var(--color-primary)' }) => {
  return (
    <div className="metric-card glass-panel">
      <div className="metric-header">
        <span>{title}</span>
        {Icon && <Icon size={18} style={{ color: color }} />}
      </div>
      <div className="metric-value">{value}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{description}</span>
        {trend && (
          <span className={`metric-change ${trend === 'up' ? 'up' : 'down'}`}>
            {trend === 'up' ? '▲' : '▼'} {trendValue}
          </span>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
