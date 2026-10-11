import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Icon from '../../components/Icon';

export default function UserProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/user/profile')
      .then(res => setProfile(res.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  const displayUser = profile || user;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="user" size={24} color="#16a34a" /> My Profile
        </h1>
        <p>Your personal account details and platform preferences</p>
      </div>

      <div className="card">
        <div className="card-body">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginBottom: 24,
            paddingBottom: 24,
            borderBottom: '1px solid #f3f4f6'
          }}>
            <div style={{
              width: 72,
              height: 72,
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '1.8rem',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
            }}>
              {displayUser?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#111827' }}>
                {displayUser?.name || 'User'}
              </div>
              <div style={{ color: '#6b7280', fontSize: '.875rem', marginTop: 2 }}>
                {displayUser?.email}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <span className="badge badge-green">
                  {displayUser?.role || 'USER'}
                </span>
                <span className="badge badge-blue">
                  {displayUser?.isActive !== false ? 'Active Account' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Full Name', value: displayUser?.name || '—' },
              { label: 'Email Address', value: displayUser?.email || '—' },
              { label: 'User ID', value: displayUser?.id ? `#${displayUser.id}` : (user?.userId ? `#${user.userId}` : '—') },
              { label: 'Phone Number', value: displayUser?.phone || 'Not provided' },
              { label: 'Vehicle Number', value: displayUser?.vehicleNumber || 'Not registered' },
              { label: 'City', value: displayUser?.city || 'Not provided' },
              { label: 'Account Created', value: formatDate(displayUser?.createdAt) },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                background: '#f9fafb',
                borderRadius: 8,
                fontSize: '.875rem'
              }}>
                <span style={{ color: '#6b7280', fontWeight: 500 }}>{label}</span>
                <span style={{ fontWeight: 600, color: '#1f2937' }}>{value}</span>
              </div>
            ))}
          </div>

          <button
            className="btn btn-danger w-full"
            style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => { logout(); navigate('/'); }}
          >
            <Icon name="logout" size={16} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
