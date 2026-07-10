import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface Props { children: React.ReactNode }

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { user, token } = useAuthStore();
  if (!user || !token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
