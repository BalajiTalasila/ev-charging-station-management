import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';

export default function LandingPage() {
  const navigate = useNavigate();

  const roles = [
    {
      icon: 'car',
      title: 'EV User',
      desc: 'Find charging stations, book slots, and manage your sessions.',
      path: '/login?role=USER'
    },
    {
      icon: 'charger',
      title: 'Station Manager',
      desc: 'Manage your station, chargers, slots and bookings.',
      path: '/login?role=MANAGER'
    },
    {
      icon: 'shield',
      title: 'Admin',
      desc: 'Oversee the entire platform, stations, managers and analytics.',
      path: '/login?role=ADMIN'
    }
  ];

  return (
    <div className="landing">
      <div className="landing-hero">
        <h1>
          Smart <span>EV Charging</span>
          <br />
          Optimization System
        </h1>

        <p>
          Find nearby charging stations, book slots instantly, and get
          real-time updates on your charging sessions.
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/register')}
          >
            Get Started Free
          </button>

          <button
            className="btn btn-outline btn-lg"
            style={{
              color: '#fff',
              borderColor: 'rgba(255,255,255,.3)'
            }}
            onClick={() => navigate('/login')}
          >
            Sign In
          </button>
        </div>
      </div>

      <div className="landing-cards">
        {roles.map((r) => (
          <div
            key={r.title}
            className="role-card"
            onClick={() => navigate(r.path)}
          >
            <div className="role-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={r.icon} size={32} color="#16a34a" strokeWidth={2} />
            </div>

            <h3>{r.title}</h3>

            <p>{r.desc}</p>

            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 16 }}
              onClick={(event) => {
                event.stopPropagation();
                navigate(r.path);
              }}
            >
              Login as {r.title}
            </button>
          </div>
        ))}
      </div>

      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,.08)',
          padding: '24px',
          textAlign: 'center',
          color: 'rgba(255,255,255,.3)',
          fontSize: '.8rem'
        }}
      >
        © 2024 EV Charging Platform · Smart Mobility Solutions
      </div>
    </div>
  );
}
