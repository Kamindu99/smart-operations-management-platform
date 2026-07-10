export interface User {
  id: string;
  name: string;
  email: string;
  role: 'administrator' | 'manager' | 'user';
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}
