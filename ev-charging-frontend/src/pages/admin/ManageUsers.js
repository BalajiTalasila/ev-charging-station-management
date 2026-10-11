import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon from '../../components/Icon';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => {
    api.get('/admin/users').then(r => setUsers(Array.isArray(r.data) ? r.data : []))
      .catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggle = async (id) => {
    try {
      await api.put(`/admin/users/${id}/toggle`);
      toast.success('User status updated');
      load();
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('User deleted successfully');
      load();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="users" size={24} color="#16a34a" /> Manage Registered Users
        </h1>
        <p>View and manage all registered EV drivers and user accounts across the platform</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="search" size={18} color="#9ca3af" />
          <input
            className="form-control"
            style={{ border: 'none', padding: 0, boxShadow: 'none' }}
            placeholder="Search users by name, email or city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Vehicle Number</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>{u.phone || '—'}</td>
                    <td>{u.vehicleNumber || '—'}</td>
                    <td>{u.city || '—'}</td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          className={`btn btn-sm ${u.isActive ? 'btn-outline' : 'btn-secondary'}`}
                          onClick={() => toggle(u.id)}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center' }}
                          title="Delete user"
                          onClick={() => remove(u.id)}
                        >
                          <Icon name="delete" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div style={{ marginBottom: 12 }}>
                  <Icon name="users" size={40} color="#9ca3af" />
                </div>
                <p style={{ margin: 0 }}>No users found.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
