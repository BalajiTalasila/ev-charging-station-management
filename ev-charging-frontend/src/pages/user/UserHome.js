import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Icon from '../../components/Icon';

export default function UserHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ bookings: 0, completed: 0, notifications: 0 });
  const [recentBookings, setRecentBookings] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/user/bookings'),
      api.get('/user/notifications'),
    ]).then(([bRes, nRes]) => {
      const bookings = Array.isArray(bRes.data) ? bRes.data : [];
      const notifications = Array.isArray(nRes.data) ? nRes.data : [];
      setStats({
        bookings: bookings.length,
        completed: bookings.filter(b => b.status === 'COMPLETED').length,
        notifications: notifications.filter(n => !n.isRead).length,
      });
      setRecentBookings(bookings.slice(0, 4));
    }).catch(() => {});
  }, []);

  const statusBadge = (s) => {
    const map = { ACTIVE: 'badge-green', COMPLETED: 'badge-gray', CANCELLED: 'badge-red' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {user?.name || 'Driver'}</h1>
        <p>Manage your EV charging sessions and find stations near you.</p>
      </div>

      <div className="grid-3" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7' }}>
            <Icon name="bookings" size={22} color="#16a34a" />
          </div>
          <div className="stat-value">{stats.bookings}</div>
          <div className="stat-label">Total Bookings</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe' }}>
            <Icon name="check" size={22} color="#2563eb" />
          </div>
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completed Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef9c3' }}>
            <Icon name="bell" size={22} color="#d97706" />
          </div>
          <div className="stat-value">{stats.notifications}</div>
          <div className="stat-label">Unread Notifications</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-body">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Quick Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={() => navigate('/user/stations')}
              >
                <Icon name="map" size={16} /> Find Nearby Stations
              </button>
              <button
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={() => navigate('/user/bookings')}
              >
                <Icon name="bookings" size={16} /> View My Bookings
              </button>
              <button
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={() => navigate('/user/notifications')}
              >
                <Icon name="bell" size={16} /> Check Notifications
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Recent Bookings</h2>
            {recentBookings.length === 0 ? (
              <div className="empty-state">
                <div style={{ marginBottom: 12 }}>
                  <Icon name="bookings" size={40} color="#9ca3af" />
                </div>
                <p>No bookings yet. Find a station to get started!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentBookings.map(b => (
                  <div key={b.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: '#f9fafb',
                    borderRadius: 8
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.875rem', color: '#111827' }}>{b.stationName}</div>
                      <div style={{ fontSize: '.78rem', color: '#6b7280', marginTop: 2 }}>
                        Charger #{b.chargerNumber || b.chargerId} · Slot {b.slotNumber || 1}
                      </div>
                    </div>
                    {statusBadge(b.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
