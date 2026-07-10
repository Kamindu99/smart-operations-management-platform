import React, { useEffect, useState, useCallback } from 'react';
import { authApi } from '../api';
import type { AuditLog } from '../types';
import { Search, RefreshCw, Clock, Activity } from 'lucide-react';
import { format } from 'date-fns';

const ACTION_META: Record<string, { color: string; label: string }> = {
  USER_LOGIN:         { color: '#6366f1', label: 'Login' },
  USER_REGISTERED:    { color: '#10b981', label: 'Registered' },
  USER_UPDATED:       { color: '#f59e0b', label: 'User Updated' },
  PROJECT_CREATED:    { color: '#3b82f6', label: 'Project Created' },
  PROJECT_UPDATED:    { color: '#f59e0b', label: 'Project Updated' },
  PROJECT_DELETED:    { color: '#ef4444', label: 'Project Deleted' },
  TASK_CREATED:       { color: '#8b5cf6', label: 'Task Created' },
  TASK_UPDATED:       { color: '#06b6d4', label: 'Task Updated' },
  TASK_DELETED:       { color: '#ef4444', label: 'Task Deleted' },
  TASK_STATUS_CHANGED:{ color: '#f59e0b', label: 'Status Changed' },
};

const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authApi.getAuditLogs({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      setLogs(res.data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const filtered = logs.filter(l => {
    const matchSearch = !search ||
      l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase());
    const matchAction = !actionFilter || l.action === actionFilter;
    return matchSearch && matchAction;
  });

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  const actionColors = (action: string) => ACTION_META[action] || { color: '#64748b', label: action.replace(/_/g, ' ') };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>Audit Log</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Complete history of system actions
          </p>
        </div>
        <button className="btn btn-secondary" onClick={load} style={{ gap: '6px' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Activity summary chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {Object.entries(ACTION_META).slice(0, 6).map(([key, { color, label }]) => {
          const count = logs.filter(l => l.action === key).length;
          if (count === 0) return null;
          return (
            <button key={key}
              onClick={() => setActionFilter(actionFilter === key ? '' : key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                background: actionFilter === key ? `${color}25` : 'var(--color-surface)',
                color: actionFilter === key ? color : 'var(--color-text-muted)',
                border: `1px solid ${actionFilter === key ? color + '50' : 'var(--color-border)'}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
              {label}
              <span style={{ background: `${color}20`, color, padding: '1px 6px', borderRadius: '999px', fontSize: '10px' }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input className="input" style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
            placeholder="Search by user or action..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: '200px', height: '38px', fontSize: '13px' }}
          value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* Timeline + Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          Loading activity...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-text-muted)' }}>
          <Activity size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontSize: '15px', fontWeight: 600 }}>No activity found</p>
        </div>
      ) : (
        <>
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ background: 'var(--color-surface-2)', padding: '10px 20px', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1.5fr', gap: '12px', borderBottom: '1px solid var(--color-border)' }}>
              {['User', 'Action', 'Entity', 'IP Address', 'Timestamp'].map(h => (
                <span key={h} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {filtered.map((log, i) => {
              const meta = actionColors(log.action);
              return (
                <div key={log.id}
                  style={{
                    padding: '14px 20px',
                    display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1.5fr', gap: '12px', alignItems: 'center',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                  {/* User */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                      {(log.user_name || log.user_email || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.user_name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.user_email}
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                      background: `${meta.color}18`, color: meta.color,
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                      {meta.label}
                    </span>
                  </div>

                  {/* Entity */}
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    {log.entity_type ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'capitalize' }}>{log.entity_type}</span>
                        {log.details && typeof log.details === 'object' && ('name' in log.details || 'title' in log.details) && (
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                            — {String((log.details as any).name || (log.details as any).title || '')}
                          </span>
                        )}
                      </span>
                    ) : '—'}
                  </div>

                  {/* IP */}
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {log.ip_address || '—'}
                  </div>

                  {/* Time */}
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={11} />
                      {format(new Date(log.created_at), 'MMM d, yyyy')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', paddingLeft: '16px' }}>
                      {format(new Date(log.created_at), 'HH:mm:ss')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Showing {filtered.length} of {logs.length} entries
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                ← Previous
              </button>
              <span style={{ padding: '5px 12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-text-dim)' }}>
                Page {page + 1}
              </span>
              <button className="btn btn-secondary btn-sm" disabled={logs.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AuditLogPage;
