import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, getUserRole, UserRole } from '../../utils/auth';

interface AdminRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children, requiredRole = 'tenant_admin' }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const userRole = getUserRole();
  
  // Check if user has the required role
  if (requiredRole === 'super_admin' && userRole !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (requiredRole === 'tenant_admin' && !['super_admin', 'tenant_admin'].includes(userRole || '')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute; 