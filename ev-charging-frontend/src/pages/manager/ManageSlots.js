import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon from '../../components/Icon';

const STATES = ['AVAILABLE', 'RESERVED', 'CHARGING', 'MAINTENANCE'];
const stateClass = {
  AVAILABLE:   'slot-available',
  RESERVED:    'slot-reserved',
  CHARGING:    'slot-charging',
  MAINTENANCE: 'slot-maintenance'
};

const stateIconName = {
  AVAILABLE:   'check',
  RESERVED:    'lock',
  CHARGING:    'bolt',
  MAINTENANCE: 'maintenance'
};

export default function ManageSlots() {
  const [chargers, setChargers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = () => {
    api.get('/manager/station/chargers')
      .then(r => setChargers(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const changeState = async (slotId, state) => {
    try {
      await api.put(`/manager/slots/${slotId}/state?state=${state}`);
      toast.success(`Slot state set to ${state}`);
      setSelected(null);
      load();
    } catch {
      toast.error('Failed to update slot');
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner"/></div>;

  return (
    <div>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="slots" size={24} color="#16a34a" /> Manage Charging Slots
        </h1>
        <p>Interactive slot state configuration and real-time bay allocation</p>
      </div>

      {chargers.length === 0 ? (
        <div className="empty-state">
          <div style={{ marginBottom: 16 }}>
            <Icon name="slots" size={48} color="#9ca3af" />
          </div>
          <p>No chargers or slots found for this station.</p>
        </div>
      ) : (
        chargers.map(c => (
          <div key={c.id} className="card" style={{ marginBottom: 20 }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>
                    Charger {c.chargerNumber} — {c.chargerType}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '.8rem', marginTop: 2 }}>
                    {c.slots?.filter(s => s.slotState === 'AVAILABLE').length || 0} of {c.totalSlots || c.slots?.length || 0} slots available
                  </div>
                </div>
              </div>

              <div className="slot-grid">
                {c.slots?.map(slot => (
                  <div
                    key={slot.id}
                    className={`slot-item ${stateClass[slot.slotState]} ${selected?.id === slot.id ? 'slot-selected' : ''}`}
                    onClick={() => setSelected(selected?.id === slot.id ? null : slot)}
                  >
                    <Icon name={stateIconName[slot.slotState] || 'check'} size={18} />
                    <span style={{ fontSize: '.72rem', fontWeight: 600 }}>{slot.slotNumber}</span>
                    <span style={{ fontSize: '.65rem', opacity: .85 }}>{slot.slotState}</span>
                  </div>
                ))}
              </div>

              {selected && c.slots?.find(s => s.id === selected.id) && (
                <div style={{ marginTop: 16, padding: 16, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '.875rem' }}>
                    Change state for slot <strong>{selected.slotNumber}</strong>:
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {STATES.map(state => (
                      <button
                        key={state}
                        className="btn btn-sm btn-outline"
                        style={{
                          background: state === selected.slotState ? '#1f2937' : undefined,
                          color: state === selected.slotState ? '#fff' : undefined,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                        onClick={() => changeState(selected.id, state)}
                      >
                        <Icon name={stateIconName[state]} size={13} /> {state}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
