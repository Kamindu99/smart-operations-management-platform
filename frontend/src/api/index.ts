import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('somp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('somp_token');
      localStorage.removeItem('somp_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; role?: string }) =>
    api.post('/auth/register', data),
  profile: () => api.get('/auth/profile'),
  updateProfile: (data: { name?: string; avatar_url?: string }) =>
    api.put('/auth/profile', data),
  getUsers: () => api.get('/auth/users'),
  getUser: (id: string) => api.get(`/auth/users/${id}`),
  updateUser: (id: string, data: Partial<{ name: string; role: string; is_active: boolean }>) =>
    api.put(`/auth/users/${id}`, data),
  getAuditLogs: (params?: { limit?: number; offset?: number; user_id?: string }) =>
    api.get('/auth/audit-logs', { params }),
  getNotifications: () => api.get('/auth/notifications'),
  markNotificationRead: (id: string) => api.put(`/auth/notifications/${id}/read`),
  markAllRead: () => api.put('/auth/notifications/read-all'),
};

// ─── Projects ─────────────────────────────────────────────────────────────────
export const projectApi = {
  getAll: (params?: { status?: string; search?: string }) =>
    api.get('/projects', { params }),
  getById: (id: string) => api.get(`/projects/${id}`),
  getStats: () => api.get('/projects/stats'),
  create: (data: { name: string; description?: string; status?: string }) =>
    api.post('/projects', data),
  update: (id: string, data: Partial<{ name: string; description: string; status: string }>) =>
    api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  search: (q: string) => api.get('/projects/search/q', { params: { q } }),
};

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const taskApi = {
  getAll: (params?: { project_id?: string; status?: string; priority?: string; assigned_user_id?: string; search?: string }) =>
    api.get('/tasks', { params }),
  getById: (id: string) => api.get(`/tasks/${id}`),
  getStats: (projectId?: string) =>
    api.get('/tasks/stats', { params: projectId ? { project_id: projectId } : {} }),
  create: (data: {
    title: string; description?: string; priority?: string;
    status?: string; project_id: string; assigned_user_id?: string; deadline?: string;
  }) => api.post('/tasks', data),
  update: (id: string, data: Partial<{
    title: string; description: string; priority: string;
    status: string; assigned_user_id: string; deadline: string;
  }>) => api.put(`/tasks/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/tasks/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  search: (q: string) => api.get('/tasks/search/q', { params: { q } }),
};

// ─── Global ───────────────────────────────────────────────────────────────────
export const globalApi = {
  getStats: () => api.get('/stats'),
  search: (q: string) => api.get('/search', { params: { q } }),
};
