import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * Component that handles redirection after project selection
 * when user was trying to access a route that requires org/project context
 */
const ProjectSelectionHandler: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId, projectId } = useParams();

  useEffect(() => {
    const intendedDestination = sessionStorage.getItem('intendedDestination');
    
    if (intendedDestination && organizationId && projectId) {
      // Clear the stored destination
      sessionStorage.removeItem('intendedDestination');
      
      // Convert legacy routes to new organization/project structure
      const convertedRoute = convertLegacyRoute(intendedDestination, organizationId, projectId);
      navigate(convertedRoute, { replace: true });
    }
  }, [organizationId, projectId, navigate]);

  return null; // This component doesn't render anything
};

/**
 * Converts legacy routes to new organization/project structure
 */
const convertLegacyRoute = (
  legacyRoute: string, 
  organizationId: string, 
  projectId: string
): string => {
  const baseOrgProjectPath = `/organizations/${organizationId}/projects/${projectId}`;
  
  // Remove query parameters for route mapping
  const [path] = legacyRoute.split('?');
  
  // Route conversion mappings
  const routeMappings: Record<string, string> = {
    '/dashboard': baseOrgProjectPath,
    '/track-accounts': `${baseOrgProjectPath}/source-tracking`,
    '/track-accounts/accounts': `${baseOrgProjectPath}/source-tracking/sources`,
    '/track-accounts/upload': `${baseOrgProjectPath}/source-tracking/upload`,
    '/track-accounts/create': `${baseOrgProjectPath}/source-tracking/create`,
    '/analysis': `${baseOrgProjectPath}/analysis`,
    '/instagram-folders': `${baseOrgProjectPath}/instagram-folders`,
    '/facebook-folders': `${baseOrgProjectPath}/facebook-folders`,
    '/linkedin-folders': `${baseOrgProjectPath}/linkedin-folders`,
    '/tiktok-folders': `${baseOrgProjectPath}/tiktok-folders`,
    '/report-folders': `${baseOrgProjectPath}/report-folders`,
    '/reports/generated': `${baseOrgProjectPath}/reports/generated`,
    '/report': `${baseOrgProjectPath}/report`,
    '/comments-scraper': `${baseOrgProjectPath}/comments-scraper`,
    '/facebook-comment-scraper': `${baseOrgProjectPath}/facebook-comment-scraper`,
    '/brightdata-settings': `${baseOrgProjectPath}/brightdata-settings`,
    '/brightdata-scraper': `${baseOrgProjectPath}/brightdata-scraper`,
    '/automated-batch-scraper': `${baseOrgProjectPath}/automated-batch-scraper`,
  };

  // Check for direct mapping
  if (routeMappings[path]) {
    return routeMappings[path];
  }

  // Handle dynamic routes with parameters
  if (path.startsWith('/track-accounts/edit/')) {
    const accountId = path.split('/track-accounts/edit/')[1];
    return `${baseOrgProjectPath}/source-tracking/edit/${accountId}`;
  }

  if (path.startsWith('/instagram-data/')) {
    const folderId = path.split('/instagram-data/')[1];
    return `${baseOrgProjectPath}/instagram-data/${folderId}`;
  }

  if (path.startsWith('/facebook-data/')) {
    const folderId = path.split('/facebook-data/')[1];
    return `${baseOrgProjectPath}/facebook-data/${folderId}`;
  }

  if (path.startsWith('/linkedin-data/')) {
    const folderId = path.split('/linkedin-data/')[1];
    return `${baseOrgProjectPath}/linkedin-data/${folderId}`;
  }

  if (path.startsWith('/tiktok-data/')) {
    const folderId = path.split('/tiktok-data/')[1];
    return `${baseOrgProjectPath}/tiktok-data/${folderId}`;
  }

  if (path.startsWith('/report-folders/')) {
    const segments = path.split('/');
    if (segments.length === 3) {
      // /report-folders/:reportId
      const reportId = segments[2];
      return `${baseOrgProjectPath}/report-folders/${reportId}`;
    }
    if (segments.length >= 4) {
      // /report-folders/:reportId/... 
      const remainingPath = segments.slice(2).join('/');
      return `${baseOrgProjectPath}/report-folders/${remainingPath}`;
    }
  }

  if (path.startsWith('/report/')) {
    const reportId = path.split('/report/')[1];
    return `${baseOrgProjectPath}/report/${reportId}`;
  }

  // Default fallback to project dashboard
  return baseOrgProjectPath;
};

export default ProjectSelectionHandler; 