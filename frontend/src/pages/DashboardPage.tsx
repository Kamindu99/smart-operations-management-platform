import React, { useEffect, useState } from 'react';
import { globalApi } from '../api';
import { useAuthStore } from '../store/authStore';
import type { Stats, AuditLog } from '../types';
import { Users, FolderKanban, CheckSquare, TrendingUp, Clock, AlertCircle, Wifi, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { authApi } from '../api';
import { formatDistanceToNow } from 'date-fns';

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.allSettled([
        globalApi.getStats(),
        authApi.getAuditLogs({ limit: 8 }),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (logsRes.status === 'fulfilled') setAuditLogs(logsRes.value.data);
    } finally {
      setLoading(false);
    }
  };

  const taskBarData = stats ? [
    { name: 'To Do', value: parseInt(stats.tasks.todo) || 0, color: '#64748b' },
    { name: 'In Progress', value: parseInt(stats.tasks.in_progress) || 0, color: '#3b82f6' },
    { name: 'Completed', value: parseInt(stats.tasks.completed) || 0, color: '#10b981' },
    { name: 'Blocked', value: parseInt(stats.tasks.blocked) || 0, color: '#ef4444' },
  ] : [];

  const projectPieData = stats ? [
    { name: 'Active', value: parseInt(stats.projects.active) || 0, color: '#10b981' },
    { name: 'On Hold', value: parseInt(stats.projects.on_hold) || 0, color: '#f59e0b' },
    { name: 'Completed', value: parseInt(stats.projects.completed) || 0, color: '#6366f1' },
    { name: 'Cancelled', value: parseInt(stats.projects.cancelled) || 0, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  const statCards = stats ? [
    {
      icon: Users, label: 'Total Users', value: stats.users.total,
      sub: `${stats.users.active} active`, color: '#6366f1', bg: 'rgba(99,102,241,0.1)'
    },
    {
      icon: FolderKanban, label: 'Total Projects', value: stats.projects.total,
      sub: `${stats.projects.active} active`, color: '#10b981', bg: 'rgba(16,185,129,0.1)'
    },
    {
      icon: CheckSquare, label: 'Total Tasks', value: stats.tasks.total,
      sub: `${stats.tasks.completed} completed`, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'
    },
    {
      icon: AlertCircle, label: 'Overdue Tasks', value: stats.tasks.overdue,
      sub: 'Need attention', color: '#ef4444', bg: 'rgba(239,68,68,0.1)'
    },
  ] : [];

  const actionColors: Record<string, string> = {
    USER_LOGIN: '#6366f1', USER_REGISTERED: '#10b981',
    PROJECT_CREATED: '#3b82f6', PROJECT_UPDATED: '#f59e0b', PROJECT_DELETED: '#ef4444',
    TASK_CREATED: '#8b5cf6', TASK_UPDATED: '#06b6d4', TASK_DELETED: '#ef4444',
    TASK_STATUS_CHANGED: '#f59e0b',
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--color-border)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '1200px' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'white', marginBottom: '6px' }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Wifi size={13} color="#10b981" /> {stats?.onlineUsers || 0} users online · {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {statCards.map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: '8px' }}>{label}</p>
                <p style={{ fontSize: '36px', fontWeight: 800, color: 'white', lineHeight: 1 }}>{value ?? '—'}</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>{sub}</p>
              </div>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color={color} />
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', borderRadius: '0 0 16px 16px', background: `linear-gradient(90deg, ${color}, transparent)` }} />
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* Task Status Bar Chart */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <TrendingUp size={16} color="#6366f1" />
            <h3 style={{ fontWeight: 700, fontSize: '14px', color: 'white' }}>Task Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={taskBarData} barSize={28}>
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1a1d25', border: '1px solid #252830', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {taskBarData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Project Status Pie */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <FolderKanban size={16} color="#10b981" />
            <h3 style={{ fontWeight: 700, fontSize: '14px', color: 'white' }}>Project Status</h3>
          </div>
          {projectPieData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={projectPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {projectPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1d25', border: '1px solid #252830', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {projectPieData.map(({ name, value, color }) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: 'var(--color-text-dim)' }}>{name}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginLeft: 'auto' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              No projects yet
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Activity size={16} color="#8b5cf6" />
          <h3 style={{ fontWeight: 700, fontSize: '14px', color: 'white' }}>Recent Activity</h3>
        </div>
        {auditLogs.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px' }}>No activity yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {auditLogs.map((log, i) => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderBottom: i < auditLogs.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                  background: `${actionColors[log.action] || '#64748b'}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Clock size={14} color={actionColors[log.action] || '#64748b'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ color: 'var(--color-primary-hover)', fontWeight: 600 }}>{log.user_name || log.user_email}</span>
                    {' '}
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>
                      {log.action.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </div>
                </div>
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', flexShrink: 0,
                  background: `${actionColors[log.action] || '#64748b'}20`,
                  color: actionColors[log.action] || '#64748b'
                }}>
                  {log.entity_type || 'system'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
