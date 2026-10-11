import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon from '../../components/Icon';

const WORKFLOW = {
  ACTIVE: 'COMPLETED',
};

export default function ManagerBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const load = () => {
    setLoading(true);
    api.get('/manager/bookings')
      .then((response) => {
        setBookings(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        toast.error('Failed to load bookings');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const advance = async (id, current) => {
    const next = WORKFLOW[current];
    if (!next) return;
    try {
      await api.put(`/manager/bookings/${id}/status?status=${next}`);
      toast.success(`Booking marked as ${next}`);
      load();
    } catch {
      toast.error('Failed to update booking status');
    }
  };

  const cancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }
    try {
      await api.put(`/manager/bookings/${id}/cancel`);
      toast.success('Booking cancelled successfully');
      load();
    } catch {
      toast.error('Failed to cancel booking');
    }
  };

  const statusBadge = (status) => {
    const classes = {
      ACTIVE: 'badge-green',
      COMPLETED: 'badge-gray',
      CANCELLED: 'badge-red',
    };
    return (
      <span className={`badge ${classes[status] || 'badge-gray'}`}>
        {status}
      </span>
    );
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filtered =
    filter === 'ALL'
      ? bookings
      : bookings.filter((booking) => booking.status === filter);

  return (
    <div>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="bookings" size={24} color="#16a34a" /> Station Bookings
        </h1>
        <p>Monitor reservation schedule, session lifecycle, and customer charging states</p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        {['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            className={`btn btn-sm ${
              filter === status ? 'btn-primary' : 'btn-outline'
            }`}
            onClick={() => setFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center">
          <div className="spinner" />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Station</th>
                  <th>Charger</th>
                  <th>Type</th>
                  <th>Created</th>
                  <th>Session Start</th>
                  <th>Session End</th>
                  <th>Duration</th>
                  <th>Battery</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#111827' }}>
                        {booking.userName || 'Customer'}
                      </div>
                    </td>
                    <td>{booking.stationName || '—'}</td>
                    <td>
                      <strong>
                        #{booking.chargerNumber || booking.chargerId || '—'}
                      </strong>
                    </td>
                    <td>{booking.chargerType || 'Standard'}</td>
                    <td style={{ fontSize: '.8rem' }}>{formatDateTime(booking.createdAt)}</td>
                    <td style={{ fontSize: '.8rem' }}>{formatDateTime(booking.startTime)}</td>
                    <td style={{ fontSize: '.8rem' }}>{formatDateTime(booking.endTime)}</td>
                    <td>
                      {booking.durationMinutes != null
                        ? `${booking.durationMinutes} min`
                        : '—'}
                    </td>
                    <td>
                      {booking.batteryPercentage != null ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="battery" size={13} color="#16a34a" />
                          {booking.batteryPercentage}%
                        </span>
                      ) : '—'}
                    </td>
                    <td>{statusBadge(booking.status)}</td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                          flexWrap: 'wrap',
                          minWidth: 145,
                        }}
                      >
                        {WORKFLOW[booking.status] && (
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => advance(booking.id, booking.status)}
                          >
                            <Icon name="check" size={13} /> Complete
                          </button>
                        )}
                        {booking.status === 'ACTIVE' && (
                          <button
                            className="btn btn-sm btn-danger"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => cancel(booking.id)}
                          >
                            <Icon name="delete" size={13} /> Cancel
                          </button>
                        )}
                        {booking.status !== 'ACTIVE' && !WORKFLOW[booking.status] && (
                          <span style={{ color: '#9ca3af', fontSize: '.8rem' }}>No actions</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && !loading && (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div style={{ marginBottom: 12 }}>
                  <Icon name="bookings" size={40} color="#9ca3af" />
                </div>
                <p style={{ margin: 0 }}>
                  {bookings.length === 0
                    ? 'No bookings found for this station.'
                    : 'No bookings match this filter.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
