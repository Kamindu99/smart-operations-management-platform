export interface User {
  id: string;
  name: string;
  email: string;
  role: 'administrator' | 'manager' | 'user';
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  creator_id: string;
  creator_name?: string;
  creator_email?: string;
  task_count?: number;
  completed_task_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'todo' | 'in_progress' | 'completed' | 'blocked';
  project_id: string;
  project_name?: string;
  assigned_user_id?: string;
  assigned_user_name?: string;
  assigned_user_email?: string;
  creator_id: string;
  creator_name?: string;
  deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name?: string;
  user_email: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'task_assigned' | 'project_update' | 'status_change' | 'warning';
  is_read: boolean;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
}

export interface Stats {
  users: { total: number; admins: number; managers: number; active: number };
  projects: { total: string; active: string; completed: string; on_hold: string; cancelled: string };
  tasks: { total: string; todo: string; in_progress: string; completed: string; blocked: string; overdue: string };
  onlineUsers: number;
}

export interface SearchResult {
  id: string;
  type: 'user' | 'project' | 'task';
  name?: string;
  title?: string;
  email?: string;
  status?: string;
  priority?: string;
  project_name?: string;
  role?: string;
}
