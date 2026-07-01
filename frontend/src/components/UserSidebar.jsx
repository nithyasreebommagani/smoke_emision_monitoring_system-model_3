import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, AlertOctagon, LogOut, Shield, Upload, Camera } from 'lucide-react';
import { authService } from '../services/api';

const UserSidebar = () => {
  const username = authService.getUsername();
  const role = authService.getUserRole();

  const menuItems = [
    { path: '/user/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/user/upload', label: 'Upload Video', icon: Upload },
    { path: '/user/violations', label: 'My Violations', icon: AlertOctagon },
    { path: '/user/live-camera', label: 'Live Camera', icon: Camera }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <AlertOctagon size={24} color="#00d2ff" />
        <span>USER<b>PORTAL</b></span>
      </div>

      <ul className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.path}>
              <NavLink 
                to={item.path} 
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                end={item.path === '/user/dashboard'}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>

      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-badge-avatar" style={{ background: '#32d74b' }}>
            {username ? username.substring(0, 2).toUpperCase() : 'US'}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{username || 'user'}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Shield size={10} color="#32d74b" />
              <span style={{ color: '#32d74b' }}>{role.toUpperCase()}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={authService.logout} 
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', transition: '0.2s' }}
          title="Logout"
          onMouseEnter={(e) => e.currentTarget.style.color = '#ff453a'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
};

export default UserSidebar;
