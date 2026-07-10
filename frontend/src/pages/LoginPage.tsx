import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Zap, Shield, BarChart3, Users } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login, user, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back!');
        navigate('/dashboard');
      } else {
        const { authApi } = await import('../api');
        const res = await authApi.register({ name: form.name, email: form.email, password: form.password, role: form.role });
        const { token, user: u } = res.data;
        localStorage.setItem('somp_token', token);
        useAuthStore.setState({ user: u, token });
        toast.success('Account created!');
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    }
  };

  const features = [
    { icon: Zap, label: 'Real-time Updates', desc: 'Live notifications via Socket.io' },
    { icon: Shield, label: 'Role-Based Access', desc: 'Admin, Manager, User roles' },
    { icon: BarChart3, label: 'Analytics Dashboard', desc: 'Insights at a glance' },
    { icon: Users, label: 'Team Management', desc: 'Assign tasks effortlessly' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--color-bg)' }}>
      {/* Left panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px', background: 'linear-gradient(135deg, #0d0f1a 0%, #111420 100%)',
        borderRight: '1px solid var(--color-border)', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '-100px', left: '-100px', width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute', bottom: '-150px', right: '-100px', width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(99,102,241,0.4)'
            }}>
              <Zap size={22} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>SOMP</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Smart Operations</div>
            </div>
          </div>

          <h1 style={{ fontSize: '42px', fontWeight: 800, lineHeight: 1.15, marginBottom: '16px', color: 'white' }}>
            Enterprise<br />
            <span className="gradient-text">Operations Platform</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '16px', lineHeight: 1.6, marginBottom: '48px', maxWidth: '380px' }}>
            Manage projects, tasks, and teams with microservice-powered architecture and real-time collaboration.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={18} color="#818cf8" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'white', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width: '480px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
            {mode === 'login' ? 'Sign in to SOMP' : 'Create your account'}
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              style={{ color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
              {mode === 'login' ? 'Register' : 'Sign in'}
            </button>
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mode === 'register' && (
            
          )}

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '6px' }}>Email Address</label>
            <input className="input" type="email" placeholder="you@company.com" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '6px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required
                style={{ paddingRight: '44px' }} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '6px' }}>Role</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="user">General User</option>
                <option value="manager">Manager</option>
                <option value="administrator">Administrator</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={isLoading}
            style={{ marginTop: '8px', padding: '13px', fontSize: '15px', fontWeight: 600, justifyContent: 'center' }}>
            {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
