import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Icon from '../../components/Icon';

export default function AllBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/admin/bookings')
      .then(r => setBookings(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (s) => {
    const map = { ACTIVE: 'badge-green', COMPLETED: 'badge-gray', CANCELLED: 'badge-red' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  const filtered = bookings
    .filter(b => filter === 'ALL' || b.status === filter)
    .filter(b =>
      !search ||
      b.userName?.toLowerCase().includes(search.toLowerCase()) ||
      b.stationName?.toLowerCase().includes(search.toLowerCase()) ||
      b.chargerNumber?.toLowerCase().includes(search.toLowerCase()) ||
      b.vehicleNumber?.toLowerCase().includes(search.toLowerCase())
    );

  const fmt = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return d;
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="bookings" size={24} color="#16a34a" /> All Platform Bookings
        </h1>
        <p>Complete centralized audit history across all EV stations and active reservations</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="card" style={{ flex: '1 1 300px', maxWidth: 400, marginBottom: 0 }}>
          <div className="card-body" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="search" size={16} color="#9ca3af" />
            <input
              className="form-control"
              style={{ border: 'none', padding: 0, boxShadow: 'none' }}
              placeholder="Search user, station, charger, vehicle..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="card">
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', fontSize: '.85rem', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
            <span>Showing <strong>{filtered.length}</strong> of {bookings.length} reservations</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Station</th>
                  <th>Charger</th>
                  <th>Type</th>
                  <th>Created</th>
                  <th>Session Window</th>
                  <th>Battery</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id}>
                    <td style={{ color: '#9ca3af', fontWeight: 600 }}>#{b.id}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{b.userName || 'Driver'}</div>
                      <div style={{ color: '#6b7280', fontSize: '.75rem' }}>{b.vehicleNumber || '—'}</div>
                    </td>
                    <td>{b.stationName || '—'}</td>
                    <td><strong>#{b.chargerNumber || b.chargerId || '—'}</strong></td>
                    <td>{b.chargerType || 'Standard'}</td>
                    <td style={{ fontSize: '.8rem' }}>{fmt(b.createdAt)}</td>
                    <td style={{ fontSize: '.8rem' }}>
                      {b.startTime ? fmt(b.startTime) : '—'}
                      {b.endTime ? ` → ${new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                      <span style={{ color: '#6b7280', fontSize: '.75rem', display: 'block' }}>
                        ({b.durationMinutes} min)
                      </span>
                    </td>
                    <td>
                      {b.batteryPercentage != null ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="battery" size={13} color="#16a34a" /> {b.batteryPercentage}%
                        </span>
                      ) : '—'}
                    </td>
                    <td>{statusBadge(b.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div style={{ marginBottom: 12 }}>
                  <Icon name="bookings" size={40} color="#9ca3af" />
                </div>
                <p style={{ margin: 0 }}>
                  {bookings.length === 0 ? 'No bookings recorded in the system.' : 'No bookings match this filter.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
