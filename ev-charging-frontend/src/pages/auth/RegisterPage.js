import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'', vehicleNumber:'', city:'' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data);
      toast.success('Account created successfully!');
      navigate('/user');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
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
          Start your smart<br />charging journey
        </h1>
        <p style={{ color: 'rgba(255,255,255,.55)', fontSize: '1rem', maxWidth: 400 }}>
          Create your account in seconds and get access to hundreds of charging stations near you.
        </p>
      </div>

      <div className="auth-right">
        <div className="auth-form">
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-sub">Join the EV charging network</p>

          <form onSubmit={handleSubmit}>
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-control" placeholder="John Doe"
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" placeholder="+91 9999999999"
                  value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-control" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-control" type="password" placeholder="Min. 8 characters"
                value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
            </div>
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Vehicle Number</label>
                <input className="form-control" placeholder="TN 01 AB 1234"
                  value={form.vehicleNumber} onChange={e => setForm({...form, vehicleNumber: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-control" placeholder="Chennai"
                  value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
              </div>
            </div>
            <button className="btn btn-primary w-full btn-lg" type="submit" disabled={loading}
                    style={{ marginTop: 8 }}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: '.85rem', color: '#6b7280' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#16a34a', fontWeight: 600 }}>Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
