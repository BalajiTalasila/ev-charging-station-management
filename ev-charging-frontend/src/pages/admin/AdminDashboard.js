import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../../services/api';
import Icon from '../../components/Icon';

const COLORS = ['#16a34a', '#2563eb', '#d97706', '#7c3aed', '#dc2626'];

function formatDay(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function AdminDashboard() {
  const [analytics, setAnalytics]   = useState(null);
  const [bookings, setBookings]     = useState([]);
  const [trends, setTrends]         = useState([]);
  const [loadError, setLoadError]   = useState(false);
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoadError(false);
    Promise.all([
      api.get('/admin/analytics'),
      api.get('/admin/bookings'),
      api.get('/admin/analytics/booking-trends'),
    ])
    .then(([aRes, bRes, tRes]) => {
      setAnalytics(aRes.data);
      setBookings(Array.isArray(bRes.data) ? bRes.data : []);
      setTrends(Array.isArray(tRes.data?.daily) ? tRes.data.daily : []);
    })
    .catch(() => setLoadError(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loadError) return (
    <div className="empty-state" style={{ paddingTop: 80 }}>
      <div style={{ marginBottom: 16 }}><Icon name="warning" size={48} color="#d97706" /></div>
      <h2 style={{ color: '#374151', marginBottom: 8 }}>Failed to load analytics</h2>
      <p style={{ marginBottom: 20 }}>Check that the backend is running on port 8082.</p>
      <button className="btn btn-primary" onClick={load}>
        <Icon name="refresh" size={15} style={{ marginRight: 6 }} /> Retry
      </button>
    </div>
  );

  if (!analytics) return (
    <div className="loading-center">
      <div className="spinner" />
    </div>
  );

  const statCards = [
    { icon: 'total-users',    value: analytics.totalUsers,                    label: 'Total Users',       bg: '#dcfce7', path: '/admin/users' },
    { icon: 'total-stations', value: analytics.totalStations,                 label: 'Total Stations',    bg: '#dbeafe', path: '/admin/stations' },
    { icon: 'total-bookings', value: analytics.totalBookings,                 label: 'Total Bookings',    bg: '#fef9c3', path: '/admin/bookings' },
    { icon: 'total-managers', value: analytics.managers,                      label: 'Station Managers',  bg: '#ede9fe', path: '/admin/managers' },
    { icon: 'total-chargers', value: analytics.totalChargers,                 label: 'Total Chargers',    bg: '#fee2e2' },
    { icon: 'today-bookings', value: analytics.todayBookings,                 label: "Today's Bookings",  bg: '#fef3c7' },
    { icon: 'energy',         value: `${analytics.weeklyEnergyKwh ?? 0} kWh`, label: 'Energy This Week', bg: '#d1fae5' },
  ];

  const statusData = ['ACTIVE', 'COMPLETED', 'CANCELLED'].map(s => ({
    name: s, value: bookings.filter(b => b.status === s).length
  })).filter(d => d.value > 0);

  const trendData = trends.map(t => ({
    date: formatDay(t.date),
    bookings: t.bookings ?? 0,
    energyKwh: t.energyKwh ?? 0,
  }));

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>Platform Analytics</h1>
          <p>Real-time overview of the entire EV charging network</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load}>
          <Icon name="refresh" size={13} style={{ marginRight: 5 }} /> Refresh
        </button>
      </div>

      {/* KPI Cards — row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 16 }}>
        {statCards.slice(0, 4).map(s => (
          <div key={s.label} className="stat-card" onClick={() => s.path && navigate(s.path)}
               style={{ cursor: s.path ? 'pointer' : 'default' }}>
            <div className="stat-icon" style={{ background: s.bg, color: '#374151' }}>
              <Icon name={s.icon} size={22} color="#374151" strokeWidth={1.8} />
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* KPI Cards — row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        {statCards.slice(4).map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: '#374151' }}>
              <Icon name={s.icon} size={22} color="#374151" strokeWidth={1.8} />
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 — Booking Trends (7-day) + Status Pie */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontWeight: 700, marginBottom: 4, fontSize: '1rem' }}>
              <Icon name="chart" size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Bookings — Last 7 Days
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '.78rem', marginBottom: 16 }}>
              Daily booking activity from the past week
            </p>
            {trendData.length === 0 ? (
              <div className="empty-state"><p>No booking data available.</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, 'Bookings']} />
                  <Area type="monotone" dataKey="bookings" stroke="#16a34a" strokeWidth={2}
                        fill="url(#colorBookings)" name="Bookings" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 style={{ fontWeight: 700, marginBottom: 4, fontSize: '1rem' }}>
              <Icon name="chart" size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Booking Status Distribution
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '.78rem', marginBottom: 16 }}>
              Breakdown of all bookings by status
            </p>
            {statusData.length === 0 ? (
              <div className="empty-state"><p>No bookings yet.</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="43%" innerRadius={58} outerRadius={82}
                       dataKey="value" label={false} labelLine={false}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Chart Row 2 — Daily Energy */}
      {trendData.some(t => t.energyKwh > 0) && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <h3 style={{ fontWeight: 700, marginBottom: 4, fontSize: '1rem' }}>
              <Icon name="energy" size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Daily Energy Delivered — Last 7 Days
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '.78rem', marginBottom: 16 }}>
              Estimated kWh from completed sessions (charger power × duration)
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" kWh" />
                <Tooltip formatter={(v) => [`${v} kWh`, 'Energy']} />
                <Bar dataKey="energyKwh" fill="#2563eb" name="Energy (kWh)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Bookings Table */}
      <div className="card">
        <div className="card-body">
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: '1rem' }}>
            <Icon name="bookings" size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Recent Bookings
          </h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Station</th>
                  <th>Charger</th>
                  <th>Duration</th>
                  <th>Battery %</th>
                  <th>Booked At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.slice(0, 10).map(b => (
                  <tr key={b.id}>
                    <td>{b.userName}</td>
                    <td>{b.stationName}</td>
                    <td><strong>{b.chargerNumber}</strong> <span style={{ color: '#9ca3af' }}>({b.chargerType})</span></td>
                    <td>{b.durationMinutes} min</td>
                    <td>{b.batteryPercentage}%</td>
                    <td>{new Date(b.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td>
                      <span className={`badge ${{ ACTIVE: 'badge-green', COMPLETED: 'badge-gray', CANCELLED: 'badge-red' }[b.status] || 'badge-gray'}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bookings.length === 0 && <div className="empty-state"><p>No bookings yet.</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
