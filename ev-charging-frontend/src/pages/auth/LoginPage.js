import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = params.get('role') || 'USER';

  const roleLabels = { USER: 'EV User', MANAGER: 'Station Manager', ADMIN: 'Admin' };
  const roleIcons  = { USER: '🚗', MANAGER: '⚡', ADMIN: '🛡️' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      if (data.role !== role) {
        toast.error('Invalid credentials for this login type');
        return;
      }
      login(data);
      toast.success(`Welcome back, ${data.name}!`);
      if (data.role === 'ADMIN')   navigate('/admin');
      else if (data.role === 'MANAGER') navigate('/manager');
      else navigate('/user');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-logo">
          <div className="icon">⚡</div>
          <span>EV Charging</span>
        </div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>
          Power your journey<br />with smart charging
        </h1>
        <p style={{ color: 'rgba(255,255,255,.55)', fontSize: '1rem', maxWidth: 400 }}>
          Join thousands of EV users finding the nearest charging stations, booking slots in seconds, and managing sessions effortlessly.
        </p>
        <div style={{ marginTop: 48, display: 'flex', gap: 32 }}>
          {['500+ Stations', '10K+ Users', '99.9% Uptime'].map(s => (
            <div key={s}>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{s.split(' ')[0]}</div>
              <div style={{ color: 'rgba(255,255,255,.4)', fontSize: '.8rem' }}>{s.split(' ').slice(1).join(' ')}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{roleIcons[role]}</div>
            <h2 className="auth-title">Sign in as {roleLabels[role]}</h2>
            <p className="auth-sub">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-control" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-control" type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
            </div>
            <button className="btn btn-primary w-full btn-lg" type="submit" disabled={loading}
                    style={{ marginTop: 8 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: '.85rem', color: '#6b7280' }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
              {Object.entries(roleLabels).map(([r, label]) => (
                <Link key={r} to={`/login?role=${r}`}
                      style={{ color: role === r ? '#16a34a' : '#9ca3af', fontWeight: role === r ? 700 : 400, fontSize: '.8rem' }}>
                  {label}
                </Link>
              ))}
            </div>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#16a34a', fontWeight: 600 }}>Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
