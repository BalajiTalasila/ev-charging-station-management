import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon from '../../components/Icon';

const HOUR_START = 0;   // 12 AM
const HOUR_END   = 24;  // 12 AM (midnight)
const todayStr = new Date().toISOString().slice(0, 10);

// Generate 30-min time slots for a day
function generateSlots() {
  const slots = [];
  for (let h = HOUR_START; h < HOUR_END; h++) {
    const hh = h % 24;
    slots.push({ hour: hh, minute: 0,  label: `${String(hh).padStart(2,'0')}:00` });
    slots.push({ hour: hh, minute: 30, label: `${String(hh).padStart(2,'0')}:30` });
  }
  return slots;
}

function isSlotBooked(slot, date, bookedRanges) {
  const slotStart = new Date(`${date}T${String(slot.hour).padStart(2,'0')}:${String(slot.minute).padStart(2,'0')}:00`);
  const slotEnd   = new Date(slotStart.getTime() + 30 * 60000);
  return bookedRanges.some(b => {
    const bs = new Date(b.startTime);
    const be = new Date(b.endTime);
    return bs < slotEnd && be > slotStart;
  });
}

function isSlotPast(slot, date) {
  const slotTime = new Date(`${date}T${String(slot.hour).padStart(2,'0')}:${String(slot.minute).padStart(2,'0')}:00`);
  return slotTime <= new Date();
}

export default function StationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [station, setStation] = useState(null);
  const [chargers, setChargers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Booking state
  const [showModal, setShowModal] = useState(false);
  const [selectedCharger, setSelectedCharger] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [bookedRanges, setBookedRanges] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);   // { hour, minute, label }
  const [duration, setDuration] = useState(30);
  const [battery, setBattery] = useState('');
  const [booking, setBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [bookingPayload, setBookingPayload] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const ALL_SLOTS = generateSlots();

  const load = useCallback(() => {
    Promise.all([
      api.get(`/user/stations/${id}`),
      api.get(`/user/stations/${id}/chargers`)
    ]).then(([sRes, cRes]) => {
      setStation(sRes.data);
      setChargers(cRes.data);
    }).catch(() => toast.error('Failed to load station'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const interval = setInterval(() => {
      api.get(`/user/stations/${id}/chargers`).then(r => setChargers(r.data)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const openBook = async (charger) => {
    setSelectedCharger(charger);
    setSelectedDate(todayStr);
    setSelectedSlot(null);
    setDuration(30);
    setBattery('');
    setBooking(null);
    setOtpStep(false);
    setOtp('');
    setShowModal(true);
    await loadSchedule(charger.id, todayStr);
  };

  const loadSchedule = async (chargerId, date) => {
    setScheduleLoading(true);
    setSelectedSlot(null);
    try {
      const res = await api.get(`/user/chargers/${chargerId}/schedule?date=${date}`);
      setBookedRanges(res.data);
    } catch { setBookedRanges([]); }
    finally { setScheduleLoading(false); }
  };

  // Check if slot + duration block is fully free
  const isBlockFree = (slot) => {
    const blocksNeeded = duration / 30;
    const idx = ALL_SLOTS.findIndex(s => s.hour === slot.hour && s.minute === slot.minute);
    for (let i = 0; i < blocksNeeded; i++) {
      const s = ALL_SLOTS[idx + i];
      if (!s) return false;
      if (isSlotBooked(s, selectedDate, bookedRanges)) return false;
      if (isSlotPast(s, selectedDate)) return false;
    }
    return true;
  };

  const isSlotSelected = (slot) => {
    if (!selectedSlot) return false;
    const blocksNeeded = duration / 30;
    const startIdx = ALL_SLOTS.findIndex(s => s.hour === selectedSlot.hour && s.minute === selectedSlot.minute);
    const thisIdx  = ALL_SLOTS.findIndex(s => s.hour === slot.hour && s.minute === slot.minute);
    return thisIdx >= startIdx && thisIdx < startIdx + blocksNeeded;
  };

  const requestOtp = async () => {
    if (!selectedSlot) return toast.warn('Please select a time slot');
    if (!battery || battery < 1 || battery > 100) return toast.warn('Enter battery % between 1-100');
    setOtpSending(true);
    try {
      const scheduledStart = `${selectedDate}T${String(selectedSlot.hour).padStart(2,'0')}:${String(selectedSlot.minute).padStart(2,'0')}:00`;
      setBookingPayload({ durationMinutes: duration, batteryPercentage: parseInt(battery), scheduledStart });
      await api.post(`/user/chargers/${selectedCharger.id}/send-otp`);
      setOtpStep(true);
      setOtp('');
      toast.success('OTP sent to your registered email!');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to send OTP');
    } finally { setOtpSending(false); }
  };

  const submitBooking = async () => {
    if (!otp || otp.length !== 6) return toast.warn('Enter the 6-digit OTP');
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/user/chargers/${selectedCharger.id}/verify-and-book`, {
        ...bookingPayload, otp
      });
      setBooking(res.data);
      setOtpStep(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Invalid OTP or booking failed');
    } finally { setSubmitting(false); }
  };

  const typeColors = { FAST: '#d97706', NORMAL: '#2563eb', SUPER: '#7c3aed' };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!station) return <div className="empty-state"><p>Station not found.</p></div>;

  return (
    <div>
      <button
        className="btn btn-outline btn-sm"
        style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        onClick={() => navigate(-1)}
      >
        <Icon name="back" size={14} /> Back
      </button>

      {/* Station Header */}
      <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', color: '#fff' }}>
        <div className="card-body">
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#fff' }}>{station.name}</h1>
          <p style={{ margin: '6px 0 0', opacity: .9, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="location" size={14} color="#fff" /> {station.address}, {station.city}
          </p>
          <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{station.totalChargers}</div>
              <div style={{ fontSize: '.75rem', opacity: .75 }}>Total Chargers</div>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#4ade80' }}>
                {chargers.filter(c => !c.occupied && c.status === 'ACTIVE').length}
              </div>
              <div style={{ fontSize: '.75rem', opacity: .75 }}>Available Now</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charger List */}
      <h2 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="charger" size={20} color="#16a34a" /> Station Chargers
      </h2>
      <div className="grid-2">
        {chargers.map(c => {
          const maintenance = c.status === 'MAINTENANCE';
          return (
            <div key={c.id} className="card" style={{ border: `2px solid ${maintenance ? '#fca5a5' : c.occupied ? '#fde68a' : '#bbf7d0'}` }}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: typeColors[c.chargerType] || '#111827' }}>
                      Charger {c.chargerNumber}
                    </div>
                    <div style={{ fontSize: '.8rem', color: '#6b7280', marginTop: 2 }}>
                      {c.chargerType} · {c.powerOutput} kW
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: 99, fontSize: '.75rem', fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: maintenance ? '#fee2e2' : c.occupied ? '#fef3c7' : '#dcfce7',
                    color: maintenance ? '#dc2626' : c.occupied ? '#d97706' : '#16a34a'
                  }}>
                    {maintenance ? (
                      <><Icon name="maintenance" size={13} color="#dc2626" /> Maintenance</>
                    ) : c.occupied ? (
                      <><Icon name="occupied" size={13} color="#d97706" /> Occupied Now</>
                    ) : (
                      <><Icon name="check" size={13} color="#16a34a" /> Available</>
                    )}
                  </span>
                </div>
                {c.waitlistCount > 0 && (
                  <div style={{ fontSize: '.82rem', color: '#d97706', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="waitlist" size={14} color="#d97706" /> {c.waitlistCount} in waitlist
                  </div>
                )}
                <button
                  className="btn w-full"
                  style={{
                    background: maintenance ? '#e5e7eb' : '#2563eb',
                    color: maintenance ? '#9ca3af' : '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                  disabled={maintenance}
                  onClick={() => openBook(c)}
                >
                  <Icon name="calendar" size={15} color={maintenance ? '#9ca3af' : '#fff'} /> View Schedule & Book
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking Modal with Timeline */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { if (!booking) setShowModal(false); }}>
          <div className="modal" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

            {!booking ? (
              <>
                <div className="modal-header">
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="calendar" size={20} color="#2563eb" /> Charger {selectedCharger?.chargerNumber} — Book a Slot
                  </h2>
                  <span className="modal-close" onClick={() => setShowModal(false)} style={{ display: 'flex', alignItems: 'center' }}>
                    <Icon name="close" size={18} />
                  </span>
                </div>

                {/* Date + Duration */}
                <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Select Date</label>
                    <input className="form-control" type="date" min={todayStr}
                      value={selectedDate}
                      onChange={e => { setSelectedDate(e.target.value); loadSchedule(selectedCharger.id, e.target.value); }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Duration</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[30, 60].map(d => (
                        <button key={d} type="button"
                          className="btn w-full"
                          style={{
                            border: `2px solid ${duration === d ? '#2563eb' : '#e5e7eb'}`,
                            background: duration === d ? '#eff6ff' : '#fff',
                            color: duration === d ? '#2563eb' : '#374151',
                            fontWeight: duration === d ? 700 : 400
                          }}
                          onClick={() => { setDuration(d); setSelectedSlot(null); }}>
                          {d === 30 ? '30 Min' : '1 Hour'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="clock" size={16} color="#4b5563" /> Select Time Slot
                    {selectedSlot && (
                      <span style={{ color: '#16a34a', marginLeft: 8 }}>
                        ✓ {selectedSlot.label} – {ALL_SLOTS[ALL_SLOTS.findIndex(s => s.hour === selectedSlot.hour && s.minute === selectedSlot.minute) + duration/30]?.label || '24:00'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 4, marginBottom: 8, fontSize: '.72rem', color: '#6b7280' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}><span style={{ width:12, height:12, background:'#dcfce7', border:'1px solid #86efac', borderRadius:3, display:'inline-block' }}/> Free</span>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:3, marginLeft:8 }}><span style={{ width:12, height:12, background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:3, display:'inline-block' }}/> Booked</span>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:3, marginLeft:8 }}><span style={{ width:12, height:12, background:'#e5e7eb', border:'1px solid #d1d5db', borderRadius:3, display:'inline-block' }}/> Past</span>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:3, marginLeft:8 }}><span style={{ width:12, height:12, background:'#2563eb', border:'1px solid #1d4ed8', borderRadius:3, display:'inline-block' }}/> Selected</span>
                  </div>

                  {scheduleLoading ? (
                    <div style={{ textAlign:'center', padding:20 }}><div className="spinner"/></div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {ALL_SLOTS.map((slot, i) => {
                        const booked = isSlotBooked(slot, selectedDate, bookedRanges);
                        const past   = isSlotPast(slot, selectedDate);
                        const free   = !booked && !past;
                        const canStart = free && isBlockFree(slot);
                        const selected = isSlotSelected(slot);

                        let bg = '#e5e7eb', border = '#d1d5db', color = '#9ca3af', cursor = 'default';
                        if (booked)   { bg = '#fee2e2'; border = '#fca5a5'; color = '#dc2626'; }
                        if (free && !canStart) { bg = '#fef9c3'; border = '#fcd34d'; color = '#92400e'; cursor = 'not-allowed'; }
                        if (canStart) { bg = '#dcfce7'; border = '#86efac'; color = '#15803d'; cursor = 'pointer'; }
                        if (selected) { bg = '#2563eb'; border = '#1d4ed8'; color = '#fff'; cursor = 'pointer'; }

                        return (
                          <div key={i}
                            onClick={() => canStart && setSelectedSlot(slot)}
                            title={booked ? 'Already booked' : past ? 'Past' : !canStart ? `Not enough free slots for ${duration} min` : `Book from ${slot.label}`}
                            style={{ width: 52, padding: '6px 2px', textAlign: 'center', borderRadius: 6,
                              background: bg, border: `1px solid ${border}`, color, fontSize: '.7rem',
                              fontWeight: selected ? 700 : 400, cursor, userSelect: 'none' }}>
                            {slot.label}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Battery */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="battery" size={16} color="#16a34a" /> Your Current Battery %
                  </label>
                  <input className="form-control" type="number" min="1" max="100" placeholder="e.g. 35"
                    value={battery} onChange={e => setBattery(e.target.value)} />
                  <div style={{ fontSize: '.75rem', color: '#6b7280', marginTop: 4 }}>
                    Lower battery = higher priority in waitlist if slot is taken
                  </div>
                </div>

                {battery && (
                  <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: '.82rem' }}>
                    <strong>Priority Score: {100 - parseInt(battery)}/100</strong>
                    <span style={{ color: '#6b7280', marginLeft: 8 }}>
                      {parseInt(battery) <= 30 ? 'Critical priority (Highest)' : parseInt(battery) <= 60 ? 'Medium priority' : 'Standard priority'}
                    </span>
                  </div>
                )}

                {!otpStep ? (
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                    <button
                      className="btn btn-primary"
                      onClick={requestOtp}
                      disabled={otpSending || !selectedSlot || !battery}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Icon name="mail" size={15} /> {otpSending ? 'Sending OTP...' : 'Send OTP & Confirm'}
                    </button>
                  </div>
                ) : (
                  <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 16, border: '1px solid #bbf7d0' }}>
                    <div style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="mail" size={18} color="#16a34a" /> Enter OTP sent to your email
                    </div>
                    <div style={{ fontSize: '.82rem', color: '#6b7280', marginBottom: 12 }}>
                      Check your registered email inbox. OTP valid for 5 minutes.
                    </div>
                    <input className="form-control" type="text" maxLength={6} placeholder="Enter 6-digit OTP"
                      value={otp} onChange={e => setOtp(e.target.value.replace(/\D/,''))}
                      style={{ letterSpacing: 8, fontSize: '1.2rem', textAlign: 'center', marginBottom: 12 }} />
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-outline w-full" onClick={() => setOtpStep(false)}>Back</button>
                      <button
                        className="btn btn-primary w-full"
                        onClick={submitBooking}
                        disabled={submitting || otp.length !== 6}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <Icon name="check" size={15} /> {submitting ? 'Verifying...' : 'Verify & Book'}
                      </button>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 10 }}>
                      <span style={{ fontSize: '.78rem', color: '#6b7280' }}>Didn't receive? </span>
                      <button style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '.78rem' }}
                        onClick={requestOtp}>Resend OTP</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Result
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                  {booking.type === 'BOOKED' ? (
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="check" size={36} color="#16a34a" strokeWidth={2.5} />
                    </div>
                  ) : (
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="clock" size={36} color="#d97706" strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                <h2>{booking.type === 'BOOKED' ? 'Booking Confirmed!' : 'Added to Waitlist!'}</h2>
                {booking.type === 'BOOKED' ? (
                  <div style={{ color: '#6b7280', lineHeight: 2, margin: '14px 0' }}>
                    <p><strong>Charger:</strong> Charger {booking.chargerNumber}</p>
                    <p><strong>From:</strong> {new Date(booking.startTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</p>
                    <p><strong>To:</strong> {new Date(booking.endTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</p>
                    <p><strong>Duration:</strong> {booking.durationMinutes} min</p>
                  </div>
                ) : (
                  <div style={{ color: '#6b7280', lineHeight: 2, margin: '14px 0' }}>
                    <p><strong>Position:</strong> #{booking.position} in queue</p>
                    <p><strong>Priority Score:</strong> {booking.priorityScore}/100</p>
                    <p style={{ fontSize: '.82rem', color: '#9ca3af' }}>You will be notified when the slot is free.</p>
                  </div>
                )}
                <button className="btn btn-primary w-full" style={{ marginTop: 16 }} onClick={() => setShowModal(false)}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
