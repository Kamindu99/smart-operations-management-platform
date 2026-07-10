import React, { useEffect, useState, useCallback } from 'react';
import { projectApi } from '../api';
import { useAuthStore } from '../store/authStore';
import type { Project } from '../types';
import { Plus, Pencil, Trash2, FolderKanban, Search, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const STATUS_OPTIONS = ['active', 'on_hold', 'completed', 'cancelled'] as const;

const ProjectsPage: React.FC = () => {
  const { user } = useAuthStore();
  const canEdit = user?.role !== 'user';
  const canDelete = user?.role === 'administrator';

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', status: 'active' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectApi.getAll({ status: filterStatus || undefined, search: searchQ || undefined });
      setProjects(res.data);
    } catch { toast.error('Failed to load projects'); }
    finally { setLoading(false); }
  }, [filterStatus, searchQ]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const handler = () => load();
    window.addEventListener('somp:project:updated', handler);
    return () => window.removeEventListener('somp:project:updated', handler);
  }, [load]);

  const openCreate = () => {
    setEditProject(null);
    setForm({ name: '', description: '', status: 'active' });
    setShowModal(true);
  };

  const openEdit = (p: Project) => {
    setEditProject(p);
    setForm({ name: p.name, description: p.description || '', status: p.status });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Project name is required');
    setSaving(true);
    try {
      if (editProject) {
        await projectApi.update(editProject.id, form);
        toast.success('Project updated');
      } else {
        await projectApi.create(form);
        toast.success('Project created');
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to save project');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await projectApi.delete(deleteId);
      toast.success('Project deleted');
      setDeleteId(null);
      load();
    } catch { toast.error('Failed to delete project'); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'badge-active', on_hold: 'badge-on-hold',
      completed: 'badge-completed', cancelled: 'badge-cancelled'
    };
    return <span className={`badge ${map[status] || 'badge-todo'}`}>{status.replace('_', ' ')}</span>;
  };

  const progressPercent = (p: Project) => {
    const total = parseInt(String(p.task_count)) || 0;
    const done = parseInt(String(p.completed_task_count)) || 0;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>Projects</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>{projects.length} total projects</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input className="input" style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
            placeholder="Search projects..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
        </div>
        <select className="input" style={{ width: '160px', height: '38px', fontSize: '13px' }}
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--color-text-muted)' }}>
          <FolderKanban size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No projects found</p>
          <p style={{ fontSize: '13px' }}>Create your first project to get started</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {projects.map(p => {
            const pct = progressPercent(p);
            return (
              <div key={p.id} className="glass-card" style={{ padding: '20px', transition: 'border-color 0.2s, transform 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-hover)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</h3>
                    {statusBadge(p.status)}
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
                      <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(p)} title="Edit">
                        <Pencil size={13} />
                      </button>
                      {canDelete && (
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => setDeleteId(p.id)} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {p.description && (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.description}
                  </p>
                )}

                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                    <span>{p.completed_task_count ?? 0}/{p.task_count ?? 0} tasks</span>
                    <span style={{ fontWeight: 700, color: pct === 100 ? '#10b981' : '#94a3b8' }}>{pct}%</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: '2px', background: pct === 100 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)', transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  <span>By {p.creator_name || 'Unknown'}</span>
                  <span>{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 24px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
                  {editProject ? 'Edit Project' : 'New Project'}
                </h2>
                <button className="btn btn-secondary btn-icon" onClick={() => setShowModal(false)}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '6px' }}>Project Name *</label>
                <input className="input" placeholder="e.g. Mobile App Redesign" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '6px' }}>Description</label>
                <textarea className="input" style={{ minHeight: '90px', resize: 'vertical' }}
                  placeholder="Describe this project..." value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '6px' }}>Status</label>
                <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : editProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-content" style={{ maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '28px', textAlign: 'center' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <AlertTriangle size={24} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Delete Project?</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
                This will permanently delete the project and all its tasks. This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete Project</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
