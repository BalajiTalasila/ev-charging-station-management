import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AIChatbot from '../../AIChatbot';
import Icon from '../../components/Icon';

const NAV = [
  { to: '/admin',          icon: 'dashboard',  label: 'Dashboard',    end: true },
  { to: '/admin/stations', icon: 'station',    label: 'Stations' },
  { to: '/admin/managers', icon: 'manager',    label: 'Managers' },
  { to: '/admin/users',    icon: 'users',      label: 'Users' },
  { to: '/admin/bookings', icon: 'bookings',   label: 'All Bookings' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Icon name="bolt" size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div className="logo-text">Admin Panel</div>
            <div className="logo-sub">EV Charging Platform</div>
          </div>
        </div>

        <div style={{ padding: '12px 0', flex: 1 }}>
          <div className="sidebar-section">Administration</div>
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">
                <Icon name={n.icon} size={15} strokeWidth={2} />
              </span>
              {n.label}
            </NavLink>
          ))}
        </div>

        <div style={{ padding: '16px 8px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <button className="nav-item" style={{ width: '100%' }}
                  onClick={() => { logout(); navigate('/'); }}>
            <span className="nav-icon">
              <Icon name="logout" size={15} strokeWidth={2} />
            </span>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <div className="topbar-title">Admin Dashboard</div>
          <div className="topbar-right">
            <div style={{ fontSize: '.85rem', color: '#6b7280' }}>Admin: <strong>{user?.name}</strong></div>
            <div className="avatar" style={{ background: '#7c3aed' }}>{user?.name?.[0]?.toUpperCase()}</div>
          </div>
        </div>
        <div className="page-content"><Outlet /></div>
      </main>

      {/* Role-aware AI chatbot */}
      <AIChatbot role={user?.role} />
    </div>
  );
}
