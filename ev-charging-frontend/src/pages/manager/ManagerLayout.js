import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AIChatbot from '../../AIChatbot';
import Icon from '../../components/Icon';

const NAV = [
  { to: '/manager',          icon: 'overview',  label: 'Overview',        end: true },
  { to: '/manager/chargers', icon: 'charger',   label: 'Manage Chargers' },
  { to: '/manager/bookings', icon: 'bookings',  label: 'View Bookings' },
  { to: '/manager/reports',  icon: 'reports',   label: 'Reports' },
];

export default function ManagerLayout() {
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
            <div className="logo-text">Station Manager</div>
            <div className="logo-sub">EV Charging Platform</div>
          </div>
        </div>

        <div style={{ padding: '12px 0', flex: 1 }}>
          <div className="sidebar-section">Station Menu</div>
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
          <div className="topbar-title">Station Manager Dashboard</div>
          <div className="topbar-right">
            <div style={{ fontSize: '.85rem', color: '#6b7280' }}>Manager: <strong>{user?.name}</strong></div>
            <div className="avatar">{user?.name?.[0]?.toUpperCase()}</div>
          </div>
        </div>
        <div className="page-content"><Outlet /></div>
      </main>

      {/* Role-aware AI chatbot */}
      <AIChatbot role={user?.role} />
    </div>
  );
}
