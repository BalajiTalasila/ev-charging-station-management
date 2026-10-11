import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon from '../../components/Icon';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('bookings');

  const load = () => {
    Promise.all([
      api.get('/user/bookings'),
      api.get('/user/waitlist')
    ]).then(([bRes, wRes]) => {
      setBookings(Array.isArray(bRes.data) ? bRes.data : []);
      setWaitlist(Array.isArray(wRes.data) ? wRes.data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const cancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.put(`/user/bookings/${id}/cancel`);
      toast.success('Booking cancelled successfully');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Cancel failed. Please try again.');
    }
  };

  const statusStyle = (status) => ({
    ACTIVE:    { background: '#dcfce7', color: '#16a34a' },
    COMPLETED: { background: '#f1f5f9', color: '#64748b' },
    CANCELLED: { background: '#fee2e2', color: '#dc2626' },
  }[status] || { background: '#f3f4f6', color: '#4b5563' });

  return (
    <div>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="bookings" size={24} color="#16a34a" /> My Bookings & Waitlist
        </h1>
        <p>Track your active sessions, reservation history, and waitlist position</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          className={`btn ${tab === 'bookings' ? 'btn-primary' : 'btn-outline'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          onClick={() => setTab('bookings')}
        >
          <Icon name="bookings" size={16} /> Bookings ({bookings.length})
        </button>
        <button
          className={`btn ${tab === 'waitlist' ? 'btn-primary' : 'btn-outline'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          onClick={() => setTab('waitlist')}
        >
          <Icon name="clock" size={16} /> Waitlist ({waitlist.length})
        </button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : tab === 'bookings' ? (
        bookings.length === 0 ? (
          <div className="empty-state">
            <div style={{ marginBottom: 16 }}>
              <Icon name="bookings" size={48} color="#9ca3af" />
            </div>
            <p>No bookings yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {bookings.map(b => (
              <div key={b.id} className="card">
                <div className="card-body" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#111827' }}>
                      {b.stationName}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '.875rem', marginTop: 3 }}>
                      Charger #{b.chargerNumber || b.chargerId} ({b.chargerType || 'Standard'}) · {b.durationMinutes} min
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#6b7280', fontSize: '.82rem', marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="battery" size={14} color="#16a34a" /> {b.batteryPercentage}%
                      </span>
                      {b.startTime && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="clock" size={14} color="#6b7280" />
                          {new Date(b.startTime).toLocaleString([], {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      )}
                      {b.endTime && (
                        <span>
                          Ends: {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{
                      ...statusStyle(b.status),
                      borderRadius: 99,
                      padding: '4px 14px',
                      fontSize: '.78rem',
                      fontWeight: 700
                    }}>
                      {b.status}
                    </span>
                    {b.status === 'ACTIVE' && (
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={() => cancel(b.id)}
                      >
                        <Icon name="delete" size={13} /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        waitlist.length === 0 ? (
          <div className="empty-state">
            <div style={{ marginBottom: 16 }}>
              <Icon name="clock" size={48} color="#9ca3af" />
            </div>
            <p>You are not in any waitlist.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {waitlist.map(w => (
              <div key={w.id} className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
                <div className="card-body">
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>
                    {w.stationName}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '.875rem', marginTop: 2 }}>
                    Charger #{w.chargerNumber || w.chargerId} · Duration: {w.durationMinutes} min
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.82rem' }}>
                      <Icon name="battery" size={14} color="#16a34a" /> Battery: <strong>{w.batteryPercentage}%</strong>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.82rem' }}>
                      <Icon name="bolt" size={14} color="#f59e0b" /> Priority: <strong>{w.priorityScore}/100</strong>
                    </span>
                  </div>
                  <div style={{ fontSize: '.8rem', color: '#6b7280', marginTop: 8, background: '#fef3c7', padding: '6px 10px', borderRadius: 6 }}>
                    You will receive an automated notification when the charger becomes available for you.
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
