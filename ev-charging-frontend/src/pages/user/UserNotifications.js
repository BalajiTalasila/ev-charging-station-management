import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Icon from '../../components/Icon';

const typeConfig = {
  BOOKING_CONFIRMED:  { icon: 'check',       bg: '#dcfce7', color: '#16a34a' },
  CHARGING_COMPLETED: { icon: 'battery',     bg: '#dbeafe', color: '#2563eb' },
  WAITLIST_JOINED:    { icon: 'clock',       bg: '#fef3c7', color: '#d97706' },
  CHARGER_AVAILABLE:  { icon: 'bolt',        bg: '#ede9fe', color: '#7c3aed' },
  GENERAL:            { icon: 'bell',        bg: '#f3f4f6', color: '#4b5563' },
};

export default function UserNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get('/user/notifications').then(r => setNotifications(r.data))
       .catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const markAllRead = async () => {
    await api.put('/user/notifications/mark-all-read').catch(() => {});
    load();
  };

  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="bell" size={24} color="#2563eb" /> Notifications
          </h1>
          <p>{unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up!'}</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-outline btn-sm" onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <div style={{ marginBottom: 16 }}>
            <Icon name="bell" size={48} color="#9ca3af" />
          </div>
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.map(n => {
            const conf = typeConfig[n.type] || typeConfig.GENERAL;
            return (
              <div key={n.id} className="card" style={{
                border: n.isRead ? '1px solid #e5e7eb' : '2px solid #3b82f6',
                background: n.isRead ? '#fff' : '#f8faff',
                transition: 'box-shadow 0.2s',
              }}>
                <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: conf.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon name={conf.icon} size={20} color={conf.color} strokeWidth={2.2} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '.95rem', color: '#111827' }}>{n.title}</div>
                    <div style={{ color: '#4b5563', fontSize: '.875rem', marginTop: 4, lineHeight: 1.5 }}>{n.message}</div>
                    <div style={{ fontSize: '.75rem', color: '#9ca3af', marginTop: 6 }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!n.isRead && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', marginTop: 6 }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
