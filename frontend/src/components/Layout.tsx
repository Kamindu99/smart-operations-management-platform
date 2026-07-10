import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, CheckSquare, Users, ScrollText,
  Bell, Search, LogOut, Zap, ChevronDown, X, User as UserIcon,
  Settings, Menu, ExternalLink
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { globalApi } from '../api';
import type { SearchResult } from '../types';
import toast from 'react-hot-toast';

interface LayoutProps { children: React.ReactNode }

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, notifications, unreadCount, markRead, markAllRead } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
    ...(user?.role !== 'user' ? [{ to: '/users', icon: Users, label: 'Users' }] : []),
    ...(user?.role !== 'user' ? [{ to: '/audit', icon: ScrollText, label: 'Audit Log' }] : []),
  ];

  const handleSearch = (q: string) => {
    setSearchQ(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await globalApi.search(q);
        setSearchResults(res.data);
      } catch { setSearchResults([]); }
      setSearchLoading(false);
    }, 300);
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false); setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const avatarInitials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '240px' : '64px',
        transition: 'width 0.25s ease',
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0, overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99,102,241,0.35)'
          }}>
            <Zap size={18} color="white" />
          </div>
          {sidebarOpen && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'white', whiteSpace: 'nowrap' }}>SOMP</div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Operations</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              title={!sidebarOpen ? label : undefined}
              style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}>
              <Icon size={18} style={{ flexShrink: 0 }} />
              {sidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: collapse toggle + user mini */}
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '12px 8px' }}>
          <button className="nav-item" onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center', width: '100%' }}>
            <Menu size={18} />
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          height: '64px', borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)', display: 'flex', alignItems: 'center',
          padding: '0 24px', gap: '16px', flexShrink: 0,
        }}>
          {/* Search */}
          <div ref={searchRef} style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                className="input"
                style={{ paddingLeft: '36px', paddingRight: '36px', height: '38px', fontSize: '13px' }}
                placeholder="Search users, projects, tasks..."
                value={searchQ}
                onFocus={() => setShowSearch(true)}
                onChange={e => { handleSearch(e.target.value); setShowSearch(true); }}
              />
              {searchQ && (
                <button onClick={() => { setSearchQ(''); setSearchResults([]); }}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                  <X size={13} />
                </button>
              )}
            </div>

            {showSearch && (searchResults.length > 0 || searchLoading) && (
              <div style={{
                position: 'absolute', top: '44px', left: 0, right: 0, zIndex: 100,
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', overflow: 'hidden',
              }}>
                {searchLoading ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>Searching...</div>
                ) : searchResults.map((r) => (
                  <button key={r.id} onClick={() => {
                    setShowSearch(false); setSearchQ(''); setSearchResults([]);
                    if (r.type === 'project') navigate(`/projects`);
                    else if (r.type === 'task') navigate(`/tasks`);
                    else navigate(`/users`);
                  }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', flexShrink: 0,
                      background: r.type === 'user' ? 'rgba(99,102,241,0.2)' : r.type === 'project' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                      color: r.type === 'user' ? '#818cf8' : r.type === 'project' ? '#34d399' : '#fbbf24',
                      textTransform: 'uppercase'
                    }}>{r.type}</span>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 500 }}>{r.name || r.title}</div>
                      {r.email && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{r.email}</div>}
                      {r.project_name && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{r.project_name}</div>}
                    </div>
                    <ExternalLink size={12} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button className="btn btn-secondary btn-icon" onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }}>
                <Bell size={16} />
                {unreadCount > 0 && <span className="notif-dot" />}
              </button>

              {notifOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: '46px', width: '340px', zIndex: 100,
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: '16px', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', overflow: 'hidden',
                }}>
                  <div style={{ padding: '16px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{ fontSize: '12px', color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                        No notifications yet
                      </div>
                    ) : notifications.slice(0, 20).map(n => (
                      <div key={n.id} onClick={() => markRead(n.id)}
                        style={{
                          padding: '12px 16px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer',
                          background: n.is_read ? 'transparent' : 'rgba(99,102,241,0.05)',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(99,102,241,0.05)')}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          {!n.is_read && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1', marginTop: '5px', flexShrink: 0 }} />}
                          <div style={{ paddingLeft: n.is_read ? '14px' : '0' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '2px' }}>{n.title}</div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{n.message}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '6px 10px', cursor: 'pointer' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, color: 'white'
                }}>{avatarInitials}</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>{user?.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
                </div>
                <ChevronDown size={12} style={{ color: 'var(--color-text-muted)' }} />
              </button>

              {userMenuOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: '46px', width: '200px', zIndex: 100,
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', overflow: 'hidden',
                }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>{user?.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{user?.email}</div>
                  </div>
                  {[
                    { icon: UserIcon, label: 'Profile', action: () => { setUserMenuOpen(false); navigate('/profile'); } },
                    { icon: Settings, label: 'Settings', action: () => setUserMenuOpen(false) },
                  ].map(({ icon: Icon, label, action }) => (
                    <button key={label} onClick={action} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-dim)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <Icon size={15} />{label}
                    </button>
                  ))}
                  <div style={{ borderTop: '1px solid var(--color-border)' }}>
                    <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#f87171' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <LogOut size={15} />Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
