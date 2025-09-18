import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUserRole } from '../utils/auth';

const RoleBasedRedirect: React.FC = () => {
  const userRole = getUserRole();

  // Redirect based on user role
  switch (userRole) {
    case 'super_admin':
      return <Navigate to="/admin/super" replace />;
    case 'tenant_admin':
      return <Navigate to="/admin/tenant" replace />;
    case 'user':
    default:
      return <Navigate to="/organizations" replace />;
  }
};

export default RoleBasedRedirect; 