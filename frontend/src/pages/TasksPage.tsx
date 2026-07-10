import React, { useEffect, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { taskApi, projectApi, authApi } from '../api';
import { useAuthStore } from '../store/authStore';
import type { Task, Project, User } from '../types';
import { Plus, X, AlertTriangle, GripVertical, Calendar, User as UserIcon, Flag, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, isPast } from 'date-fns';

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: '#64748b' },
  { id: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { id: 'completed', label: 'Completed', color: '#10b981' },
  { id: 'blocked', label: 'Blocked', color: '#ef4444' },
] as const;

type StatusId = typeof COLUMNS[number]['id'];

const PRIORITY_COLORS: Record<string, string> = {
  low: '#10b981', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444'
};

const TasksPage: React.FC = () => {
  useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', status: 'todo',
    project_id: '', assigned_user_id: '', deadline: ''
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterProject) params.project_id = filterProject;
      if (filterPriority) params.priority = filterPriority;
      const [tasksRes, projectsRes, usersRes] = await Promise.all([
        taskApi.getAll(params),
        projectApi.getAll(),
        authApi.getUsers(),
      ]);
      setTasks(tasksRes.data);
      setProjects(projectsRes.data);
      setUsers(usersRes.data);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  }, [filterProject, filterPriority]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const h = () => load();
    window.addEventListener('somp:task:updated', h);
    return () => window.removeEventListener('somp:task:updated', h);
  }, [load]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as StatusId;
    const taskId = draggableId;

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await taskApi.updateStatus(taskId, newStatus);
      toast.success(`Moved to ${COLUMNS.find(c => c.id === newStatus)?.label}`);
    } catch {
      toast.error('Failed to update status');
      load();
    }
  };

  const openCreate = () => {
    setEditTask(null);
    setForm({ title: '', description: '', priority: 'medium', status: 'todo', project_id: projects[0]?.id || '', assigned_user_id: '', deadline: '' });
    setShowModal(true);
  };

  const openEdit = (t: Task) => {
    setEditTask(t);
    setForm({
      title: t.title, description: t.description || '', priority: t.priority,
      status: t.status, project_id: t.project_id,
      assigned_user_id: t.assigned_user_id || '', deadline: t.deadline ? t.deadline.split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Task title is required');
    if (!form.project_id) return toast.error('Select a project');
    setSaving(true);
    try {
      const payload = { ...form, assigned_user_id: form.assigned_user_id || undefined, deadline: form.deadline || undefined };
      if (editTask) {
        await taskApi.update(editTask.id, payload);
        toast.success('Task updated');
      } else {
        await taskApi.create(payload);
        toast.success('Task created');
      }
      setShowModal(false);
      load();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await taskApi.delete(deleteId);
      toast.success('Task deleted');
      setDeleteId(null);
      load();
    } catch { toast.error('Delete failed'); }
  };

  const getColumnTasks = (colId: StatusId) =>
    tasks.filter(t => t.status === colId);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>Kanban Board</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>{tasks.length} total tasks</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> New Task</button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
          <Filter size={14} /> Filters:
        </div>
        <select className="input" style={{ width: '200px', height: '36px', fontSize: '13px' }}
          value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" style={{ width: '150px', height: '36px', fontSize: '13px' }}
          value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', gap: '16px', flex: 1, overflowX: 'auto', paddingBottom: '8px' }}>
          {COLUMNS.map(col => {
            const colTasks = getColumnTasks(col.id);
            return (
              <div key={col.id} style={{ width: '280px', minWidth: '280px', display: 'flex', flexDirection: 'column' }}>
                <div className={`glass-card kanban-col-${col.id}`} style={{ padding: '12px 14px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: col.color }}>{col.label}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: `${col.color}20`, color: col.color, fontWeight: 700 }}>
                      {colTasks.length}
                    </span>
                  </div>
                  <button className="btn btn-secondary btn-icon" style={{ width: '24px', height: '24px', padding: '0', borderRadius: '6px' }} onClick={openCreate}>
                    <Plus size={13} />
                  </button>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        flex: 1, minHeight: '100px', borderRadius: '12px',
                        padding: '4px',
                        background: snapshot.isDraggingOver ? `${col.color}08` : 'transparent',
                        border: snapshot.isDraggingOver ? `1px dashed ${col.color}40` : '1px dashed transparent',
                        transition: 'all 0.2s',
                        display: 'flex', flexDirection: 'column', gap: '8px',
                      }}>
                      {colTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="drag-card"
                              style={{
                                background: 'var(--color-surface)',
                                border: `1px solid ${snapshot.isDragging ? col.color + '60' : 'var(--color-border)'}`,
                                borderRadius: '12px', padding: '14px',
                                boxShadow: snapshot.isDragging ? `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${col.color}40` : 'none',
                                ...provided.draggableProps.style,
                              }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <div {...provided.dragHandleProps} style={{ color: 'var(--color-text-muted)', cursor: 'grab', marginTop: '2px', flexShrink: 0 }}>
                                  <GripVertical size={14} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'white', marginBottom: '6px', lineHeight: 1.4 }}>{task.title}</p>

                                  {task.description && (
                                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                                      {task.description}
                                    </p>
                                  )}

                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: `${PRIORITY_COLORS[task.priority]}20`, color: PRIORITY_COLORS[task.priority], display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      <Flag size={9} />{task.priority}
                                    </span>
                                    {task.project_name && (
                                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                                        {task.project_name}
                                      </span>
                                    )}
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                      {task.assigned_user_name && (
                                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                          <UserIcon size={10} />{task.assigned_user_name.split(' ')[0]}
                                        </span>
                                      )}
                                      {task.deadline && (
                                        <span style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px', color: isPast(new Date(task.deadline)) && task.status !== 'completed' ? '#f87171' : 'var(--color-text-muted)' }}>
                                          <Calendar size={10} />
                                          {format(new Date(task.deadline), 'MMM d')}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '2px' }}>
                                      <button className="btn btn-secondary btn-icon" style={{ width: '22px', height: '22px', padding: '0', borderRadius: '5px', fontSize: '11px' }} onClick={() => openEdit(task)}>✏</button>
                                      <button className="btn btn-danger btn-icon" style={{ width: '22px', height: '22px', padding: '0', borderRadius: '5px', fontSize: '11px' }} onClick={() => setDeleteId(task.id)}>✕</button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {colTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                          Drop tasks here
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 24px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>{editTask ? 'Edit Task' : 'New Task'}</h2>
                <button className="btn btn-secondary btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
              </div>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '6px' }}>Title *</label>
                <input className="input" placeholder="Task title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '6px' }}>Description</label>
                <textarea className="input" style={{ minHeight: '70px', resize: 'vertical' }} placeholder="Optional details..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '6px' }}>Priority</label>
                  <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '6px' }}>Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '6px' }}>Project *</label>
                <select className="input" value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '6px' }}>Assign To</label>
                  <select className="input" value={form.assigned_user_id} onChange={e => setForm(f => ({ ...f, assigned_user_id: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '6px' }}>Deadline</label>
                  <input className="input" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : editTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-content" style={{ maxWidth: '360px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '28px', textAlign: 'center' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <AlertTriangle size={24} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Delete Task?</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;
