import React, { useEffect, useState, useCallback } from 'react';
import { authApi } from '../api';
import type { User } from '../types';
import { Users, UserCheck, UserX, Crown, Shield, User as UserIcon, Search, Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const ROLE_COLORS: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  administrator: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', icon: <Crown size={12} /> },
  manager: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', icon: <Shield size={12} /> },
  user: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', icon: <UserIcon size={12} /> },
};

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', role: 'user', is_active: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authApi.getUsers();
      setUsers(res.data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleEdit = (u: User) => {
    setEditUser(u);
    setForm({ name: u.name, role: u.role, is_active: u.is_active });
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await authApi.updateUser(editUser.id, form);
      toast.success('User updated');
      setEditUser(null);
      load();
    } catch { toast.error('Failed to update user'); }
    finally { setSaving(false); }
  };

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'administrator').length,
    managers: users.filter(u => u.role === 'manager').length,
    active: users.filter(u => u.is_active).length,
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>Users</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Manage team members and roles</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Users', value: stats.total, icon: Users, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
          { label: 'Administrators', value: stats.admins, icon: Crown, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
          { label: 'Managers', value: stats.managers, icon: Shield, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          { label: 'Active Users', value: stats.active, icon: UserCheck, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={16} color={color} />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'white' }}>{value}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input className="input" style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
            placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: '160px', height: '38px', fontSize: '13px' }}
          value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="administrator">Administrator</option>
          <option value="manager">Manager</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const rc = ROLE_COLORS[u.role];
                const initials = u.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{u.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', background: rc.bg, color: rc.color, textTransform: 'capitalize' }}>
                        {rc.icon}{u.role}
                      </span>
                    </td>
                    <td>
                      {u.is_active ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#34d399' }}>
                          <UserCheck size={13} /> Active
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#f87171' }}>
                          <UserX size={13} /> Inactive
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
                      {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(u)} style={{ gap: '6px' }}>
                        <Pencil size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div className="modal-overlay" onClick={() => setEditUser(null)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'white' }}>Edit User</h2>
                <button className="btn btn-secondary btn-icon" onClick={() => setEditUser(null)}><X size={15} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '6px' }}>Name</label>
                  <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '6px' }}>Role</label>
                  <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="user">General User</option>
                    <option value="manager">Manager</option>
                    <option value="administrator">Administrator</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '6px' }}>Status</label>
                  <select className="input" value={form.is_active ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button className="btn btn-secondary" onClick={() => setEditUser(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
