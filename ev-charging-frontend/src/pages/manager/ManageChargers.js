import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon from '../../components/Icon';

export default function ManageChargers() {
  const [chargers, setChargers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get('/manager/station/chargers')
      .then(r => setChargers(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggleMaintenance = async (id, isMaintenance) => {
    try {
      await api.put(`/manager/chargers/${id}/maintenance?maintenance=${!isMaintenance}`);
      toast.success(isMaintenance ? 'Charger restored to Active service' : 'Charger put under Maintenance');
      load();
    } catch {
      toast.error('Failed to update charger status');
    }
  };

  const typeColors = { FAST: '#d97706', NORMAL: '#2563eb', SUPER: '#7c3aed' };

  return (
    <div>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="charger" size={24} color="#16a34a" /> Manage Station Chargers
        </h1>
        <p>Monitor status, toggle maintenance, and inspect hardware outputs</p>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : chargers.length === 0 ? (
        <div className="empty-state">
          <div style={{ marginBottom: 16 }}>
            <Icon name="charger" size={48} color="#9ca3af" />
          </div>
          <p>No chargers assigned to your station yet.</p>
          <p style={{ fontSize: '.85rem', color: '#9ca3af', marginTop: 4 }}>Contact the platform admin to configure chargers for this station.</p>
        </div>
      ) : (
        <div className="grid-2">
          {chargers.map(c => {
            const isMaint = c.status === 'MAINTENANCE';
            return (
              <div key={c.id} className="card" style={{ borderLeft: `4px solid ${isMaint ? '#ef4444' : '#22c55e'}` }}>
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: typeColors[c.chargerType] || '#111827' }}>
                        Charger {c.chargerNumber}
                      </div>
                      <div style={{ fontSize: '.8rem', color: '#6b7280', marginTop: 2 }}>
                        {c.chargerType} · {c.powerOutput} kW Output
                      </div>
                    </div>
                    <span className={`badge ${!isMaint ? 'badge-green' : 'badge-red'}`}>
                      {c.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '.85rem', color: '#4b5563', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {!isMaint ? (
                      <><Icon name="check" size={15} color="#16a34a" /> Available for active booking</>
                    ) : (
                      <><Icon name="maintenance" size={15} color="#dc2626" /> Under scheduled maintenance</>
                    )}
                  </div>
                  <button
                    className={`btn btn-sm ${isMaint ? 'btn-primary' : 'btn-outline'}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    onClick={() => toggleMaintenance(c.id, isMaint)}
                  >
                    {isMaint ? (
                      <><Icon name="check" size={14} /> Release from Maintenance</>
                    ) : (
                      <><Icon name="maintenance" size={14} /> Set Under Maintenance</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
