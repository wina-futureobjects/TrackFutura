import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../../utils/auth';
import InvalidRoutePage from '../../pages/InvalidRoutePage';

interface RouteGuardProps {
  children: React.ReactNode;
  requireOrgProject?: boolean;
}

/**
 * RouteGuard component that enforces organization/project context
 * for routes that require it
 */
const RouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  requireOrgProject = false 
}) => {
  const location = useLocation();
  
  // Check if user is authenticated
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If route requires org/project context, check for it
  if (requireOrgProject) {
    const pathSegments = location.pathname.split('/');
    const hasOrgProjectStructure = 
      pathSegments.includes('organizations') && 
      pathSegments.includes('projects') &&
      pathSegments.length >= 5; // /organizations/:id/projects/:id/...

    if (!hasOrgProjectStructure) {
      // Save the intended destination for after org/project selection
      sessionStorage.setItem('intendedDestination', location.pathname + location.search);
      
      // Show the invalid route page instead of redirecting immediately
      // This gives users context about why they're being redirected
      return <InvalidRoutePage />;
    }
  }

  return <>{children}</>;
};

export default RouteGuard; 