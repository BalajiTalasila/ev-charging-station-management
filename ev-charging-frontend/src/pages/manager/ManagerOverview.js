import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Icon from '../../components/Icon';

export default function ManagerOverview() {
  const [station, setStation]   = useState(null);
  const [chargers, setChargers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/manager/station'),
      api.get('/manager/station/chargers'),
      api.get('/manager/bookings'),
    ]).then(([sRes, cRes, bRes]) => {
      setStation(sRes.data);
      setChargers(Array.isArray(cRes.data) ? cRes.data : []);
      setBookings(Array.isArray(bRes.data) ? bRes.data : []);
    }).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner"/></div>;

  if (error) return (
    <div className="empty-state" style={{ paddingTop: 80 }}>
      <Icon name="warning" size={48} color="#d97706" />
      <p style={{ marginTop: 12 }}>Could not load station data. Ensure your account is assigned to a station.</p>
    </div>
  );

  const activeChargers  = chargers.filter(c => c.status === 'ACTIVE').length;
  const activeBookings  = bookings.filter(b => b.status === 'ACTIVE').length;

  const statCards = [
    { icon: 'total-chargers', value: station?.totalChargers ?? chargers.length, label: 'Total Chargers',  bg: '#dcfce7' },
    { icon: 'active',         value: activeChargers,                             label: 'Active Chargers', bg: '#dbeafe' },
    { icon: 'bookings',       value: activeBookings,                             label: 'Active Bookings', bg: '#ede9fe' },
    { icon: 'chart',          value: bookings.length,                            label: 'Total Bookings',  bg: '#fef9c3' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Station Overview</h1>
        <p>
          {station?.name && <><strong>{station.name}</strong> — </>}
          {station?.address}
        </p>
      </div>

      <div className="grid-4" style={{ marginBottom: 28 }}>
        {statCards.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <Icon name={s.icon} size={22} color="#374151" strokeWidth={1.8} />
            </div>
            <div className="stat-value">{s.value ?? '—'}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Station Info Card */}
      {station && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>
              <Icon name="station" size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              My Station
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {[
                { label: 'Station Name', value: station.name },
                { label: 'City', value: station.city },
                { label: 'Status', value: station.isActive ? 'Active' : 'Inactive' },
                { label: 'Address', value: station.address },
                { label: 'Total Chargers', value: station.totalChargers },
                { label: 'Available Slots', value: station.availableSlots ?? '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: '.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontWeight: 600, color: '#1f2937' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>
            <Icon name="bookings" size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Recent Bookings
          </h2>
          {bookings.length === 0 ? (
            <div className="empty-state">
              <Icon name="bookings" size={40} color="#d1d5db" />
              <p style={{ marginTop: 12 }}>No bookings yet.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Charger</th>
                    <th>Duration</th>
                    <th>Battery %</th>
                    <th>Start Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 8).map(b => (
                    <tr key={b.id}>
                      <td>{b.userName}</td>
                      <td><strong>{b.chargerNumber}</strong> <span style={{ color: '#9ca3af' }}>({b.chargerType})</span></td>
                      <td>{b.durationMinutes} min</td>
                      <td>{b.batteryPercentage}%</td>
                      <td>{b.startTime ? new Date(b.startTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                      <td>
                        <span className={`badge ${{ ACTIVE: 'badge-green', COMPLETED: 'badge-gray', CANCELLED: 'badge-red' }[b.status] || 'badge-gray'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
