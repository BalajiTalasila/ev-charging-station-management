import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon from '../../components/Icon';

const EMPTY = { name:'', address:'', city:'', latitude:'', longitude:'', totalChargers:'', managerId:'' };
const EMPTY_CHARGER = { chargerType:'FAST', chargerNumber:'' };

export default function ManageStations() {
  const [stations, setStations] = useState([]);
  const [managers, setManagers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showChargerModal, setShowChargerModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [chargerForm, setChargerForm] = useState(EMPTY_CHARGER);
  const [selectedStation, setSelectedStation] = useState(null);
  const [chargers, setChargers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingCharger, setAddingCharger] = useState(false);

  const load = () => {
    Promise.all([api.get('/admin/stations'), api.get('/admin/managers')])
    .then(([sRes, mRes]) => { setStations(sRes.data); setManagers(mRes.data); })
    .catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openAdd  = () => { setForm(EMPTY); setEditItem(null); setShowModal(true); };
  const openEdit = (s) => {
    setForm({ name:s.name, address:s.address, city:s.city, latitude:s.latitude,
              longitude:s.longitude, totalChargers:s.totalChargers, managerId:s.managerId||'' });
    setEditItem(s);
    setShowModal(true);
  };

  const openChargers = async (s) => {
    setSelectedStation(s);
    setChargerForm(EMPTY_CHARGER);
    try {
      const res = await api.get(`/admin/stations/${s.id}/chargers`);
      setChargers(res.data);
    } catch { setChargers([]); }
    setShowChargerModal(true);
  };

  const save = async () => {
    try {
      if (editItem) await api.put(`/admin/stations/${editItem.id}`, form);
      else          await api.post('/admin/stations', form);
      toast.success(editItem ? 'Station updated' : 'Station created');
      setShowModal(false);
      load();
    } catch { toast.error('Save failed'); }
  };

  const addCharger = async () => {
    if (!chargerForm.chargerNumber.trim()) return toast.warn('Enter charger number');
    if (addingCharger) return; // prevent double submit
    setAddingCharger(true);
    try {
      await api.post(`/admin/stations/${selectedStation.id}/chargers`, chargerForm);
      toast.success('Charger added!');
      const res = await api.get(`/admin/stations/${selectedStation.id}/chargers`);
      setChargers(res.data);
      setChargerForm(EMPTY_CHARGER);
      load();
    } catch { toast.error('Failed to add charger'); }
    finally { setAddingCharger(false); }
  };

  const deleteCharger = async (chargerId) => {
    if (!window.confirm('Delete this charger and its slots?')) return;
    try {
      await api.delete(`/admin/chargers/${chargerId}`);
      toast.success('Charger deleted');
      const res = await api.get(`/admin/stations/${selectedStation.id}/chargers`);
      setChargers(res.data);
      load();
    } catch { toast.error('Delete failed'); }
  };

  const deleteStation = async (id) => {
    if (!window.confirm('Delete this station?')) return;
    try { await api.delete(`/admin/stations/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const typeColors = { FAST:'#d97706', NORMAL:'#2563eb', SUPER:'#7c3aed' };

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div><h1>Manage Stations</h1><p>Add, edit, and manage charging stations</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Station</button>
      </div>

      {loading ? <div className="loading-center"><div className="spinner"/></div> : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Station</th><th>City</th><th>Chargers</th><th>Manager</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {stations.map(s => (
                  <tr key={s.id}>
                    <td><div style={{ fontWeight:600 }}>{s.name}</div><div style={{ color:'#9ca3af', fontSize:'.78rem' }}>{s.address}</div></td>
                    <td>{s.city}</td>
                    <td>{s.totalChargers}</td>
                    <td>{s.managerName || <span style={{ color:'#9ca3af' }}>Unassigned</span>}</td>
                    <td><span className={`badge ${s.isActive ? 'badge-green' : 'badge-red'}`}>{s.isActive?'Active':'Inactive'}</span></td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openChargers(s)}>
                          <Icon name="charger" size={13} style={{ marginRight:4 }} /> Chargers
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>
                          <Icon name="edit" size={13} style={{ marginRight:4 }} /> Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteStation(s.id)}>
                          <Icon name="delete" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stations.length === 0 && <div className="empty-state"><p>No stations yet.</p></div>}
          </div>
        </div>
      )}

      {/* Station Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Station' : 'Add New Station'}</h2>
              <span className="modal-close" onClick={() => setShowModal(false)} aria-label="Close">
                <Icon name="close" size={18} />
              </span>
            </div>
            {[
              { label:'Station Name', key:'name', placeholder:'Green Energy Hub' },
              { label:'Address',      key:'address', placeholder:'12 Main Street' },
              { label:'City',         key:'city', placeholder:'Chennai' },
            ].map(f => (
              <div className="form-group" key={f.key}>
                <label className="form-label">{f.label}</label>
                <input className="form-control" placeholder={f.placeholder}
                  value={form[f.key]} onChange={e => setForm({...form,[f.key]:e.target.value})} />
              </div>
            ))}
            <div className="grid-2" style={{ gap:12 }}>
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input className="form-control" type="number" step="any" placeholder="13.0827"
                  value={form.latitude} onChange={e => setForm({...form,latitude:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input className="form-control" type="number" step="any" placeholder="80.2707"
                  value={form.longitude} onChange={e => setForm({...form,longitude:e.target.value})} />
              </div>
            </div>
            <div className="grid-2" style={{ gap:12 }}>
              <div className="form-group">
                <label className="form-label">Total Chargers</label>
                <input className="form-control" type="number" placeholder="3"
                  value={form.totalChargers} onChange={e => setForm({...form,totalChargers:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Assign Manager</label>
                <select className="form-control" value={form.managerId}
                        onChange={e => setForm({...form,managerId:e.target.value})}>
                  <option value="">-- None --</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editItem ? 'Save Changes' : 'Create Station'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Charger Management Modal */}
      {showChargerModal && (
        <div className="modal-overlay" onClick={() => setShowChargerModal(false)}>
          <div className="modal" style={{ maxWidth:620 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
            <h2>
                <Icon name="charger" size={18} style={{ marginRight:8, verticalAlign:'middle' }} />
                Chargers — {selectedStation?.name}
              </h2>
              <span className="modal-close" onClick={() => setShowChargerModal(false)} aria-label="Close">
                <Icon name="close" size={18} />
              </span>
            </div>

            {/* Add Charger Form */}
            {chargers.length >= selectedStation?.totalChargers ? (
              <div style={{ background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:10, padding:16, marginBottom:20, textAlign:'center' }}>
                <div style={{ marginBottom:8 }}><Icon name="warning" size={24} color="#d97706" /></div>
                <div style={{ fontWeight:700, color:'#92400e' }}>Maximum Chargers Reached</div>
                <div style={{ fontSize:'.85rem', color:'#92400e', marginTop:4 }}>
                  This station allows only {selectedStation?.totalChargers} charger(s). Edit the station to increase the limit.
                </div>
              </div>
            ) : (
              <div style={{ background:'#f9fafb', borderRadius:10, padding:16, marginBottom:20 }}>
                <div style={{ fontWeight:700, marginBottom:12, fontSize:'.9rem' }}>
                  Add New Charger ({chargers.length}/{selectedStation?.totalChargers} used)
                </div>
                <div className="grid-2" style={{ gap:12 }}>
                  <div className="form-group" style={{ marginBottom:0 }}>
                    <label className="form-label">Charger Number</label>
                    <input className="form-control" placeholder="e.g. RC-01"
                      value={chargerForm.chargerNumber}
                      onChange={e => setChargerForm({...chargerForm, chargerNumber:e.target.value})} />
                  </div>
                  <div className="form-group" style={{ marginBottom:0 }}>
                    <label className="form-label">Charger Type</label>
                    <select className="form-control" value={chargerForm.chargerType}
                      onChange={e => setChargerForm({...chargerForm, chargerType:e.target.value})}>
                      <option value="FAST">FAST (50 kW)</option>
                      <option value="NORMAL">NORMAL (22 kW)</option>
                      <option value="SUPER">SUPER (150 kW)</option>
                    </select>
                  </div>
                </div>
                <button type="button" className="btn btn-primary w-full" style={{ marginTop:12 }} onClick={addCharger} disabled={addingCharger}>
                  {addingCharger ? 'Adding...' : '+ Add Charger'}
                </button>
              </div>
            )}

            {/* Existing Chargers */}
            <div style={{ fontWeight:700, marginBottom:10, fontSize:'.9rem' }}>Existing Chargers ({chargers.length})</div>
            {chargers.length === 0 ? (
              <div className="empty-state"><p>No chargers yet. Add one above.</p></div>
            ) : (
              chargers.map(c => (
                <div key={c.id} style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:14, marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <span style={{ fontWeight:700 }}>{c.chargerNumber}</span>
                      <span style={{ marginLeft:8, background: typeColors[c.chargerType]+'20',
                        color: typeColors[c.chargerType], borderRadius:99, padding:'2px 10px',
                        fontSize:'.78rem', fontWeight:600 }}>{c.chargerType}</span>
                      <span style={{ marginLeft:8, color:'#6b7280', fontSize:'.82rem' }}>{c.powerOutput} kW</span>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteCharger(c.id)}>
                      <Icon name="delete" size={13} style={{ marginRight:4 }} /> Delete
                    </button>
                  </div>
                  <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
                    {c.slots?.map(s => (
                      <span key={s.id} style={{ background:'#dcfce7', color:'#15803d',
                        borderRadius:6, padding:'3px 10px', fontSize:'.75rem', fontWeight:600 }}>
                        {s.slotNumber}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
