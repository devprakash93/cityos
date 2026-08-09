import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CityProvider } from '../context/CityContext';

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <CityProvider>
      <Outlet />
    </CityProvider>
  );
};

export const RoleRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role?.name)) {
    // Redirect based on role if they try to access an unauthorized page
    switch (user.role?.name) {
      case 'CITIZEN': return <Navigate to="/citizen/dashboard" replace />;
      case 'OFFICER': return <Navigate to="/officer/dashboard" replace />;
      case 'FIELD_WORKER': return <Navigate to="/worker/dashboard" replace />;
      case 'SUPER_ADMIN': return <Navigate to="/admin/dashboard" replace />;
      default: return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
};
