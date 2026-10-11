import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../../services/api';
import Icon from '../../components/Icon';

const COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626'];

const getBookingDate = (booking) => {
  const value = booking.createdAt || booking.startTime || booking.bookingTime;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export default function ManagerReports() {
  const [bookings, setBookings] = useState([]);
  const [chargers, setChargers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      api.get('/manager/bookings'),
      api.get('/manager/station/chargers'),
    ])
      .then(([bookingResponse, chargerResponse]) => {
        if (!mounted) return;
        setBookings(Array.isArray(bookingResponse.data) ? bookingResponse.data : []);
        setChargers(Array.isArray(chargerResponse.data) ? chargerResponse.data : []);
      })
      .catch(() => {
        if (mounted) setError(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <Icon name="warning" size={48} color="#d97706" />
        <h3 style={{ marginTop: 12 }}>Unable to load reports</h3>
        <p>Please check the backend connection and refresh this page.</p>
      </div>
    );
  }

  // Calculate reporting periods using local calendar dates.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);

  const todayBookings = bookings.filter((booking) => {
    const date = getBookingDate(booking);
    return date && date >= today && date < tomorrow;
  });

  const weeklyBookings = bookings.filter((booking) => {
    const date = getBookingDate(booking);
    return date && date >= weekAgo && date < tomorrow;
  });

  const completed = bookings.filter((booking) => booking.status === 'COMPLETED').length;

  const utilRate =
    bookings.length > 0
      ? Math.round((completed / bookings.length) * 100)
      : 0;

  const statusData = ['ACTIVE', 'COMPLETED', 'CANCELLED']
    .map((status) => ({
      name: status,
      value: bookings.filter((booking) => booking.status === status).length,
    }))
    .filter((item) => item.value > 0);

  const dailyData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    const day = date.toLocaleDateString('en-IN', {
      weekday: 'short',
    });

    const count = bookings.filter((booking) => {
      const bookingDate = getBookingDate(booking);
      return bookingDate && bookingDate.toDateString() === date.toDateString();
    }).length;

    return {
      day,
      bookings: count,
    };
  });

  const chargerTypeData = ['FAST', 'NORMAL', 'SUPER']
    .map((type) => ({
      name: type,
      count: chargers.filter((charger) => charger.chargerType === type).length,
    }))
    .filter((item) => item.count > 0);

  const stats = [
    {
      icon: 'today-bookings',
      value: todayBookings.length,
      label: "Today's Bookings",
      bg: '#dcfce7',
      color: '#16a34a'
    },
    {
      icon: 'bookings',
      value: weeklyBookings.length,
      label: 'Weekly Bookings',
      bg: '#dbeafe',
      color: '#2563eb'
    },
    {
      icon: 'check',
      value: completed,
      label: 'Completed Sessions',
      bg: '#fef9c3',
      color: '#d97706'
    },
    {
      icon: 'chart',
      value: `${utilRate}%`,
      label: 'Completion Rate',
      bg: '#ede9fe',
      color: '#7c3aed'
    },
  ];

  const summary = [
    ['Total Bookings', bookings.length],
    ["Today's Sessions", todayBookings.length],
    ['Weekly Sessions', weeklyBookings.length],
    ['Completed Sessions', completed],
    ['Completion Rate', `${utilRate}%`],
    ['Active Chargers', chargers.filter((c) => c.status === 'ACTIVE').length],
  ];

  return (
    <div>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="reports" size={24} color="#16a34a" /> Station Reports & Analytics
        </h1>
        <p>Performance metrics, session distributions, and booking trends</p>
      </div>

      {/* Summary cards */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div
              className="stat-icon"
              style={{
                background: stat.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={stat.icon} size={22} color={stat.color} strokeWidth={2} />
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Daily bookings chart */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="chart" size={16} color="#16a34a" /> Daily Bookings (Last 7 Days)
            </h3>

            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="bookings" name="Bookings" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Booking status chart */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="check" size={16} color="#2563eb" /> Booking Status Breakdown
            </h3>

            {statusData.length === 0 ? (
              <div className="empty-state" style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>No booking data available.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    nameKey="name"
                    label={(entry) => entry.name}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Charger distribution chart */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="charger" size={16} color="#2563eb" /> Charger Output Distribution
            </h3>

            {chargerTypeData.length === 0 ? (
              <div className="empty-state" style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>No charger data available.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chargerTypeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="count" name="Chargers" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="clipboard" size={16} color="#7c3aed" /> Performance Summary
            </h3>

            {summary.map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                <span style={{ color: '#6b7280', fontSize: '.875rem' }}>{label}</span>
                <strong style={{ fontSize: '.875rem', color: '#111827' }}>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
