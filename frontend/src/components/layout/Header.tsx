import React, { useState, useEffect, useCallback } from 'react';
import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  Button,
  Chip,
  Divider,
  Breadcrumbs,
  Link,
  Popover,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  ListItemButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Menu as MenuIcon,
  KeyboardArrowDown,
  AdminPanelSettings as AdminIcon,
  Business as TenantIcon,
  LightMode as LightIcon,
  NavigateNext as NavigateNextIcon,
  Folder as FolderIcon,
  Dashboard as DashboardIcon,
  Description as DescriptionIcon,
  Storage as StorageIcon,
  HomeOutlined as HomeIcon,
  FolderOutlined as FolderOutlinedIcon,
  BusinessOutlined as BusinessOutlinedIcon,
  Settings as SettingsIcon,
  ExitToApp as ExitIcon,
  SwapHoriz as SwapIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { logout, getUserRole, getCurrentUser } from '../../utils/auth';
import { apiFetch } from '../../utils/api';
import futureObjectLogo from '../../assets/images/logos/future-object.png';

interface HeaderProps {
  open: boolean;
  onToggle: () => void;
  showSidebarToggle?: boolean;
}

// Define interfaces for Organization and Project
interface Organization {
  id: number;
  name: string;
  description: string | null;
}

interface Project {
  id: number;
  name: string;
  description: string | null;
  organization: number;
  organization_name: string;
}

// Helper function to get page title from path
const getPageTitle = (pathname: string): string => {
  // Default title if pathname is empty or undefined
  if (!pathname) return 'Dashboard';
  
  const parts = pathname.split('/').filter(Boolean);
  
  // Handle empty paths
  if (parts.length === 0) return 'Dashboard';
  
  // Check for specific patterns first
  
  // Handle Instagram data pages: /organizations/3/projects/14/instagram-data/20
  if (parts.includes('instagram-data')) {
    return 'Instagram Data';
  }
  
  // Handle Facebook data pages: /organizations/3/projects/14/facebook-data/20
  if (parts.includes('facebook-data')) {
    return 'Facebook Data';
  }
  
  // Handle LinkedIn data pages: /organizations/3/projects/14/linkedin-data/20
  if (parts.includes('linkedin-data')) {
    return 'LinkedIn Data';
  }
  
  // Handle TikTok data pages: /organizations/3/projects/14/tiktok-data/20
  if (parts.includes('tiktok-data')) {
    return 'TikTok Data';
  }
  
  // Handle folder pages
  if (parts.includes('instagram-folders')) {
    return 'Instagram Folders';
  }
  if (parts.includes('facebook-folders')) {
    return 'Facebook Folders';
  }
  if (parts.includes('linkedin-folders')) {
    return 'LinkedIn Folders';
  }
  if (parts.includes('tiktok-folders')) {
    return 'TikTok Folders';
  }
  
  // Handle report pages
  if (parts.includes('report-folders') || parts.includes('reports')) {
    return 'Reports';
  }
  
  // Handle track accounts pages
  if (parts.includes('track-accounts') || parts.includes('source-tracking')) {
    return 'Source Tracking';
  }
  
  // Handle analysis pages
  if (parts.includes('analysis')) {
    return 'AI Analysis';
  }
  
  // Handle settings pages
  if (parts.includes('settings')) {
    return 'Settings';
  }
  
  // Handle brightdata pages
  if (parts.includes('brightdata-settings')) {
    return 'Super Admin Dashboard';
  }
  if (parts.includes('brightdata-scraper')) {
    return 'Brightdata Scraper';
  }
  
  // Handle admin pages
  if (parts.includes('super')) {
    return 'Super Admin Dashboard';
  }
  if (parts.includes('tenant')) {
    return 'Tenant Admin Dashboard';
  }
  
  // Handle organization and project pages
  if (parts.includes('organizations') && parts.includes('projects')) {
    // Check if we're at a specific project page: /organizations/1/projects/2
    const orgIndex = parts.indexOf('organizations');
    const projIndex = parts.indexOf('projects');
    if (orgIndex >= 0 && projIndex === orgIndex + 2 && parts.length === projIndex + 2) {
      return 'Dashboard'; // Root project page shows as Dashboard
    }
    if (parts.length > projIndex + 2) {
      // We're in a sub-page of the project, continue to check other patterns
      // This will be handled by the specific checks above
    }
  }
  
  // Handle legacy dashboard pages
  if (parts.includes('dashboard')) {
    return 'Dashboard';
  }
  
  // If we reach here, get the last meaningful part and format it
  const lastPart = parts[parts.length - 1];
  
  // Safety check for undefined or empty lastPart
  if (!lastPart) return 'Dashboard';
  
  // Skip numeric IDs (folder IDs, project IDs, etc.)
  let meaningfulPart = lastPart;
  if (/^\d+$/.test(lastPart) && parts.length > 1) {
    // If last part is just a number, use the second to last part
    meaningfulPart = parts[parts.length - 2];
  }
  
  // Map of route paths to display names for fallback
  const routeNames: Record<string, string> = {
    'dashboard': 'Dashboard',
    'instagram-folders': 'Instagram Folders',
    'instagram-data': 'Instagram Data',
    'facebook-folders': 'Facebook Folders',
    'facebook-data': 'Facebook Data',
    'linkedin-folders': 'LinkedIn Folders',
    'linkedin-data': 'LinkedIn Data',
    'tiktok-folders': 'TikTok Folders',
    'tiktok-data': 'TikTok Data',
    'track-accounts': 'Source Tracking',
    'source-tracking': 'Source Tracking',
    'analysis': 'AI Analysis',
    'settings': 'Settings',
    'report-folders': 'Reports',
    'reports': 'Reports',
    'brightdata-settings': 'Super Admin Dashboard',
    'brightdata-scraper': 'Brightdata Scraper',
    'super': 'Super Admin Dashboard',
    'tenant': 'Tenant Admin Dashboard',
    'projects': 'Projects',
    'organizations': 'Organizations',
  };
  
  // If we have a mapping, use it; otherwise, format the string
  return routeNames[meaningfulPart] || meaningfulPart.charAt(0).toUpperCase() + meaningfulPart.slice(1).replace(/-/g, ' ');
};

// Extract organization and project IDs/names from path
const getPathInfo = (pathname: string): { 
  organizationId: string | null; 
  projectId: string | null;
  projectPath: boolean;
  projectsListPath: boolean;
  isDashboardPath: boolean;
  showDashboardLabel: boolean;
} => {
  // Default return value for empty or undefined pathname
  if (!pathname) return { 
    organizationId: null, 
    projectId: null,
    projectPath: false,
    projectsListPath: false,
    isDashboardPath: false,
    showDashboardLabel: false
  };
  
  const parts = pathname.split('/').filter(Boolean);
  let organizationId: string | null = null;
  let projectId: string | null = null;
  let projectsListPath = false;
  let projectPath = false;
  let isDashboardPath = false;
  let showDashboardLabel = false;
  
  // Check for exact match of /organizations/1/projects/1 pattern
  if (parts.length === 4 && 
      parts[0] === 'organizations' && 
      parts[2] === 'projects') {
    organizationId = parts[1];
    projectId = parts[3];
    projectPath = true;
    showDashboardLabel = false; // Don't show Dashboard label for this exact pattern
    return { organizationId, projectId, projectsListPath, projectPath, isDashboardPath, showDashboardLabel };
  }
  
  // Process each part of the path
  for (let i = 0; i < parts.length; i++) {
    // Handle organization ID extraction
    if (parts[i] === 'organizations' && i + 1 < parts.length) {
      organizationId = parts[i + 1];
      
      // Check if this is the projects list path
      if (i + 2 < parts.length && parts[i + 2] === 'projects' && i + 3 >= parts.length) {
        projectsListPath = true;
      }
      
      // Check if this is a specific project path
      if (i + 2 < parts.length && parts[i + 2] === 'projects' && i + 3 < parts.length) {
        projectId = parts[i + 3];
        projectPath = true;
        
        // Don't show dashboard label for root project view
        if (i + 4 >= parts.length) {
          showDashboardLabel = false;
        } else {
          showDashboardLabel = true;
        }
      }
    }
    
    // Legacy dashboard path handling
    if (parts[i] === 'dashboard' && i + 1 < parts.length) {
      projectId = parts[i + 1];
      isDashboardPath = true;
    }
  }
  
  return { organizationId, projectId, projectsListPath, projectPath, isDashboardPath, showDashboardLabel };
};

const Header: React.FC<HeaderProps> = ({ open, onToggle, showSidebarToggle = true }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);
  const [userRole, setUserRole] = useState(getUserRole());
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  
  // Breadcrumb state
  const [organizationName, setOrganizationName] = useState('Organization');
  const [projectName, setProjectName] = useState('Project');
  
  // Dropdown state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [orgDropAnchorEl, setOrgDropAnchorEl] = useState<HTMLElement | null>(null);
  const [projectDropAnchorEl, setProjectDropAnchorEl] = useState<HTMLElement | null>(null);
  
  // Organization dropdown
  const orgDropdownOpen = Boolean(orgDropAnchorEl);
  const orgDropdownId = orgDropdownOpen ? 'org-dropdown-menu' : undefined;
  
  // Project dropdown
  const projectDropdownOpen = Boolean(projectDropAnchorEl);
  const projectDropdownId = projectDropdownOpen ? 'project-dropdown-menu' : undefined;
  
  // Get path info safely - memoize to prevent recalculations
  const pathInfo = React.useMemo(() => getPathInfo(location.pathname), [location.pathname]);
  const organizationId = pathInfo.organizationId;
  const projectId = pathInfo.projectId;
  const isProjectsListPath = pathInfo.projectsListPath;
  const isProjectPath = pathInfo.projectPath;
  const isDashboardPath = pathInfo.isDashboardPath;
  const showDashboardLabel = pathInfo.showDashboardLabel;
  
  // Get current page title safely - memoize
  const currentPage = React.useMemo(() => getPageTitle(location.pathname), [location.pathname]);

  // State to track if the image failed to load
  const [imageError, setImageError] = useState(false);
  
  // Effect to load user data only once on mount
  useEffect(() => {
    // Load user data
    const user = getCurrentUser();
    if (user) {
      setUserName(user.username);
      setUserEmail(user.email || '');
    }
  }, []);

  // Effect to update developer mode based on current route
  useEffect(() => {
    if (userRole === 'super_admin') {
      const isOrganizationsRoute = location.pathname.includes('/organizations');
      setIsDeveloperMode(isOrganizationsRoute);
    }
  }, [location.pathname, userRole]);
  
  // Effect to clear organizations when developer mode changes
  useEffect(() => {
    if (userRole === 'super_admin') {
      setOrganizations([]); // Clear organizations to force refresh with new filter
    }
  }, [isDeveloperMode, userRole]);
  
  // Separate effect for organization name to prevent unnecessary re-renders
  useEffect(() => {
    console.log('Organization ID changed:', organizationId);
    if (organizationId && typeof organizationId === 'string') {
      fetchOrganizationName(organizationId);
    } else {
      // Reset to default if no valid ID
      console.log('Resetting organization name to default');
      setOrganizationName('Organization');
    }
  }, [organizationId]);
  
  // Separate effect for project name to prevent unnecessary re-renders
  useEffect(() => {
    console.log('Project ID changed:', projectId);
    if (projectId && typeof projectId === 'string') {
      fetchProjectName(projectId);
    } else {
      // Reset to default if no valid ID
      console.log('Resetting project name to default');
      setProjectName('Project');
    }
  }, [projectId]);
  
  // Fetch all organizations for the dropdown
  const fetchAllOrganizations = async () => {
    if (organizations.length > 0) return; // Don't fetch if we already have them
    
    try {
      setLoadingOrgs(true);
      const response = await apiFetch('/api/users/organizations/');
      
      if (response.ok) {
        const data = await response.json();
        let orgsData = [];
        
        if (Array.isArray(data)) {
          orgsData = data;
        } else if (data && typeof data === 'object' && 'results' in data) {
          orgsData = data.results || [];
        }
        
        // If super admin is in developer mode, filter to only show organizations they created
        if (userRole === 'super_admin' && isDeveloperMode) {
          const currentUser = getCurrentUser();
          if (currentUser && currentUser.id) {
            orgsData = orgsData.filter((org: any) => org.owner === currentUser.id);
          }
        }
        
        setOrganizations(orgsData);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoadingOrgs(false);
    }
  };
  
  // Fetch projects for the current organization
  const fetchOrganizationProjects = async () => {
    if (!organizationId) return;
    
    try {
      setLoadingProjects(true);
      const response = await apiFetch(`/api/users/projects/?organization=${organizationId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setProjects(data);
        } else if (data && typeof data === 'object' && 'results' in data) {
          setProjects(data.results || []);
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };
  
  // Handler functions must be defined before they're used in useMemo
  // Handle image load error
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);
  
  // Handle organization dropdown open
  const handleOrgDropdownOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setOrgDropAnchorEl(event.currentTarget);
    fetchAllOrganizations();
  }, [userRole, isDeveloperMode]);
  
  // Handle project dropdown open
  const handleProjectDropdownOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setProjectDropAnchorEl(event.currentTarget);
    fetchOrganizationProjects();
  }, [organizationId]);

  // Handle logo click based on user role
  const handleLogoClick = useCallback(() => {
    if (userRole === 'super_admin') {
      navigate('/admin/super');
    } else if (userRole === 'tenant_admin') {
      navigate('/admin/tenant');
    } else {
      navigate('/');
    }
  }, [userRole, navigate]);

  // Handle developer mode toggle for super admins
  const handleDeveloperToggle = useCallback(() => {
    if (userRole === 'super_admin') {
      if (isDeveloperMode) {
        // Switch back to super admin mode
        setIsDeveloperMode(false);
        navigate('/admin/super');
      } else {
        // Switch to developer mode
        setIsDeveloperMode(true);
        navigate('/organizations');
      }
    }
  }, [userRole, isDeveloperMode, navigate]);
  
  // Memoize breadcrumb components to prevent re-rendering
  const renderBreadcrumbs = React.useMemo(() => (
    <Box
      sx={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'flex-start',
        height: '60px',
        maxWidth: '60%',
        flexShrink: 1,
        gap: 1,
      }}
    >
      {/* Logo Link */}
      <Box
        component="button"
        onClick={handleLogoClick}
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: '16px',
          color: theme => theme.palette.text.primary,
          textDecoration: 'none',
          cursor: 'pointer',
          height: '60px',
          border: 'none',
          background: 'none',
          padding: 0,
          '&:hover': {
            opacity: 0.8,
            transform: 'scale(1.02)',
          },
          transition: 'all 0.2s ease',
        }}
      >
        <img 
          src={futureObjectLogo} 
          alt="Future Objects Logo" 
          style={{
            height: '54px',
            width: 'auto',
            objectFit: 'contain',
            display: 'block'
          }}
          onError={handleImageError}
        />
      </Box>
      
      {/* Separator */}
      {organizationId && (
        <Typography 
          sx={{ 
            color: theme => theme.palette.text.secondary, 
            fontSize: '16px',
            fontWeight: 300,
            display: 'flex',
            alignItems: 'center',
            height: '60px',
            lineHeight: 1,
          }}
        >
          |
        </Typography>
      )}
      
      {/* Organization dropdown (if available) */}
      {organizationId && (
        <Box
          component="button"
          onClick={handleOrgDropdownOpen}
          aria-describedby={orgDropdownId}
          sx={{ 
            fontWeight: 500,
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme => theme.palette.text.primary,
            textDecoration: 'none',
            cursor: 'pointer',
            height: '60px',
            padding: '0 8px',
            borderRadius: '6px',
            transition: 'all 0.2s ease',
            lineHeight: 1,
            border: 'none',
            background: 'none',
            '&:hover': {
              color: theme => theme.palette.primary.main,
              backgroundColor: theme => `rgba(210, 145, 226, 0.04)`,
            }
          }}
        >
          <BusinessOutlinedIcon sx={{ mr: 0.5, fontSize: 18 }} />
          {(() => { console.log('Rendering organization name:', organizationName); return organizationName; })()}
          <KeyboardArrowDown sx={{ 
            ml: 0.5, 
            fontSize: 18,
            transition: 'transform 0.2s ease',
            transform: orgDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }} />
        </Box>
      )}
      
      {/* Separator */}
      {isProjectsListPath && (
        <Typography 
          sx={{ 
            color: theme => theme.palette.text.secondary, 
            fontSize: '16px',
            fontWeight: 300,
            display: 'flex',
            alignItems: 'center',
            height: '60px',
            lineHeight: 1,
          }}
        >
          |
        </Typography>
      )}
      
      {/* Projects list link */}
      {isProjectsListPath && (
        <Typography
          sx={{ 
            fontWeight: 500,
            fontSize: '15px',
            color: theme => theme.palette.text.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60px',
            lineHeight: 1,
          }}
        >
          <FolderOutlinedIcon sx={{ mr: 0.5, fontSize: 18 }} />
          All Projects
        </Typography>
      )}
      
      {/* Separator */}
      {isProjectPath && projectId && (
        <Typography 
          sx={{ 
            color: theme => theme.palette.text.secondary, 
            fontSize: '16px',
            fontWeight: 300,
            display: 'flex',
            alignItems: 'center',
            height: '60px',
            lineHeight: 1,
          }}
        >
          |
        </Typography>
      )}
      
      {/* Project dropdown (for specific project page) */}
      {isProjectPath && projectId && (
        <Box
          component="button"
          onClick={handleProjectDropdownOpen}
          aria-describedby={projectDropdownId}
          sx={{ 
            fontWeight: 500,
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme => theme.palette.text.primary,
            textDecoration: 'none',
            cursor: 'pointer',
            height: '60px',
            padding: '0 8px',
            borderRadius: '6px',
            transition: 'all 0.2s ease',
            lineHeight: 1,
            border: 'none',
            background: 'none',
            '&:hover': {
              color: theme => theme.palette.primary.main,
              backgroundColor: theme => `rgba(210, 145, 226, 0.04)`,
            }
          }}
        >
          <FolderOutlinedIcon sx={{ mr: 0.5, fontSize: 18 }} />
          {(() => { console.log('Rendering project name:', projectName); return projectName; })()}
          <KeyboardArrowDown sx={{ 
            ml: 0.5, 
            fontSize: 18,
            transition: 'transform 0.2s ease',
            transform: projectDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }} />
        </Box>
      )}
      
      {/* Separator for current page - Show when we have a project and will show current page */}
      {projectId && (
        <Typography 
          sx={{ 
            color: theme => theme.palette.text.secondary, 
            fontSize: '16px',
            fontWeight: 300,
            display: 'flex',
            alignItems: 'center',
            height: '60px',
            lineHeight: 1,
          }}
        >
          |
        </Typography>
      )}
      
      {/* Current page - Show for all project contexts */}
      {projectId && (
        <Typography
          sx={{ 
            fontWeight: 500,
            fontSize: '15px',
            color: theme => theme.palette.text.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60px',
            lineHeight: 1,
          }}
        >
          {currentPage}
        </Typography>
      )}
    </Box>
  ), [theme, navigate, organizationId, organizationName, handleOrgDropdownOpen, orgDropdownId, orgDropdownOpen, isProjectsListPath, isProjectPath, projectId, projectName, handleProjectDropdownOpen, projectDropdownId, projectDropdownOpen, showDashboardLabel, isDashboardPath, currentPage, location.pathname, handleLogoClick]);

  // Handle menu operations
  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigateToAdmin = () => {
    if (userRole === 'super_admin') {
      navigate('/admin/super');
    } else if (userRole === 'tenant_admin') {
      navigate('/admin/tenant');
    }
  };

  // Handle dropdown closes
  const handleOrgDropdownClose = () => {
    setOrgDropAnchorEl(null);
  };

  const handleProjectDropdownClose = () => {
    setProjectDropAnchorEl(null);
  };

  // Handle organization selection
  const handleOrganizationSelect = (orgId: number) => {
    navigate(`/organizations/${orgId}/projects`);
    handleOrgDropdownClose();
  };

  // Handle project selection
  const handleProjectSelect = (projId: number) => {
    if (organizationId) {
      navigate(`/organizations/${organizationId}/projects/${projId}`);
    } else {
      navigate(`/dashboard/${projId}`);
    }
    handleProjectDropdownClose();
  };

  // Async functions that are used in effects
  const fetchOrganizationName = async (id: string) => {
    try {
      console.log('Fetching organization name for ID:', id);
      const response = await apiFetch(`/api/users/organizations/${id}/`);
      console.log('Organization response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Organization data:', data);
        const name = data.name || 'Organization';
        console.log('Setting organization name to:', name);
        setOrganizationName(name);
      } else {
        console.error('Failed to fetch organization name:', response.status);
        setOrganizationName('Organization');
      }
    } catch (error) {
      console.error('Error fetching organization name:', error);
      setOrganizationName('Organization');
    }
  };

  const fetchProjectName = async (id: string) => {
    try {
      console.log('Fetching project name for ID:', id);
      const response = await apiFetch(`/api/users/projects/${id}/`);
      console.log('Project response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Project data:', data);
        const name = data.name || 'Project';
        console.log('Setting project name to:', name);
        setProjectName(name);
      } else {
        console.error('Failed to fetch project name:', response.status);
        setProjectName('Project');
      }
    } catch (error) {
      console.error('Error fetching project name:', error);
      setProjectName('Project');
    }
  };

  // Watch for organization/project changes in the URL
  useEffect(() => {
    // For project pages where we don't have organization in breadcrumb but have project
    if (projectId && !organizationId && !isDashboardPath) {
      // This is for URLs like /dashboard/1 where we need to get org from project
      const fetchProjectOrganization = async (id: string) => {
        try {
          const response = await apiFetch(`/api/users/projects/${id}/`);
          if (response.ok) {
            const data = await response.json();
            if (data.organization) {
              // Fetch organization name for this project
              const orgResponse = await apiFetch(`/api/users/organizations/${data.organization}/`);
              if (orgResponse.ok) {
                const orgData = await orgResponse.json();
                setOrganizationName(orgData.name || 'Organization');
              }
            }
          }
        } catch (error) {
          console.error('Error fetching project organization:', error);
        }
      };
      
      fetchProjectOrganization(projectId);
    }
  }, [location.pathname, isDashboardPath, projectId]);

  const menuId = 'primary-search-account-menu';
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      id={menuId}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isMenuOpen}
      onClose={handleMenuClose}
      sx={{
        mt: 1.5,
        '& .MuiPaper-root': {
          borderRadius: 0,
          boxShadow: 'none',
          border: '1px solid #e0e0e0',
          minWidth: '240px',
        }
      }}
    >
      {/* User Info */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '14px' }}>
          {userName}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>
          {userEmail}
        </Typography>
      </Box>
      
      <Divider sx={{ my: 1, borderColor: theme => theme.palette.grey[200] }} />
      
      <MenuItem 
        onClick={() => { handleMenuClose(); navigate('/settings'); }}
        sx={{ 
          fontSize: '14px',
          py: 1,
          '&:hover': { backgroundColor: theme => `rgba(166, 253, 237, 0.1)` }
        }}
      >
        Account
      </MenuItem>
      
      <MenuItem 
        onClick={() => { handleMenuClose(); navigate('/settings'); }}
        sx={{ 
          fontSize: '14px',
          py: 1,
          '&:hover': { backgroundColor: theme => `rgba(166, 253, 237, 0.1)` }
        }}
      >
        Billing
        <Box component="span" sx={{ ml: 1, fontSize: '11px', color: 'primary.main', fontWeight: 'bold' }}>
          Upgrade
        </Box>
      </MenuItem>
      
      <MenuItem 
        onClick={() => { handleMenuClose(); navigate('/settings'); }}
        sx={{ 
          fontSize: '14px',
          py: 1,
          '&:hover': { backgroundColor: theme => `rgba(166, 253, 237, 0.1)` }
        }}
      >
        Organization settings
      </MenuItem>
      
      <MenuItem 
        onClick={() => { handleMenuClose(); }}
        sx={{ 
          fontSize: '14px',
          py: 1,
          '&:hover': { backgroundColor: theme => `rgba(166, 253, 237, 0.1)` }
        }}
      >
        Product releases
        <Box component="span" sx={{ ml: 1, fontSize: '11px', color: 'primary.main', fontWeight: 'bold' }}>
          New
        </Box>
      </MenuItem>
      
      <MenuItem sx={{ fontSize: '14px', py: 1, '&:hover': { backgroundColor: theme => `rgba(166, 253, 237, 0.1)` } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <span>Theme: Light</span>
          <LightIcon fontSize="small" />
        </Box>
      </MenuItem>
      
      <Divider sx={{ my: 1, borderColor: theme => theme.palette.grey[200] }} />
      
      <MenuItem 
        onClick={handleLogout}
        sx={{ 
          fontSize: '14px',
          py: 1,
          color: '#d32f2f',
          '&:hover': { 
            backgroundColor: 'rgba(211, 47, 47, 0.1)',
            color: '#b71c1c'
          }
        }}
      >
        <ExitIcon sx={{ mr: 1, fontSize: 18 }} />
        Log out
      </MenuItem>
    </Menu>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          backgroundColor: '#ffffff',
          color: theme => theme.palette.text.primary,
          boxShadow: 'none',
          borderBottom: theme => `1px solid ${theme.palette.grey[300]}`,
          borderRadius: 0,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          top: '28px',
          minHeight: '60px',
          '& .MuiAppBar-root': {
            boxShadow: 'none',
            borderRadius: 0,
          }
        }}
      >
        <Toolbar sx={{ 
          minHeight: '60px !important', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          px: 3,
          borderRadius: 0,
        }}>
          {showSidebarToggle && (
            <IconButton
              size="medium"
              edge="start"
              color="inherit"
              aria-label="toggle sidebar"
              sx={{ 
                flexShrink: 0,
                '&:hover': {
                  backgroundColor: theme => `rgba(210, 145, 226, 0.08)`,
                  color: theme => theme.palette.primary.main,
                }
              }}
              onClick={onToggle}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          {/* Use memoized breadcrumb component */}
          {renderBreadcrumbs}
          
          {/* Right side content */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto' }}>
            {/* Developer mode toggle for super admins */}
            {userRole === 'super_admin' && (
              <Chip
                icon={isDeveloperMode ? <CodeIcon /> : <AdminIcon />}
                label={isDeveloperMode ? "Developer Mode" : "SuperAdmin Dashboard"}
                color="primary"
                clickable
                onClick={handleDeveloperToggle}
                sx={{ 
                  backgroundColor: theme => theme.palette.primary.main,
                  color: theme => theme.palette.primary.contrastText,
                  '&:hover': {
                    backgroundColor: theme => theme.palette.primary.dark,
                  },
                  '& .MuiChip-icon': {
                    color: 'inherit',
                  }
                }}
              />
            )}
            
            <Button 
              color="inherit" 
              sx={{ 
                textTransform: 'none', 
                fontWeight: 500,
                color: theme => theme.palette.text.primary,
                fontSize: '14px',
                px: 2,
                py: 1,
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: theme => `rgba(210, 145, 226, 0.04)`,
                  color: theme => theme.palette.primary.main,
                }
              }}
              onClick={() => {}}
            >
              Docs
            </Button>
            
            <Button 
              color="inherit" 
              sx={{ 
                textTransform: 'none', 
                fontWeight: 500,
                color: theme => theme.palette.text.primary,
                fontSize: '14px',
                px: 2,
                py: 1,
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: theme => `rgba(210, 145, 226, 0.04)`,
                  color: theme => theme.palette.primary.main,
                }
              }}
              onClick={() => navigate('/settings')}
            >
              Settings
            </Button>
            
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                cursor: 'pointer',
                p: 1,
                borderRadius: '8px',
                '&:hover': { 
                  backgroundColor: theme => `rgba(210, 145, 226, 0.04)`,
                }
              }}
              onClick={handleProfileMenuOpen}
            >
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32,
                  fontSize: '14px',
                  bgcolor: theme => theme.palette.primary.main,
                  color: theme => theme.palette.primary.contrastText,
                }}
              >
                {userName ? userName.substring(0, 2).toUpperCase() : 'U'}
              </Avatar>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>
      {renderMenu}

      {/* Organization Dropdown Menu */}
      <Popover
        id={orgDropdownId}
        open={orgDropdownOpen}
        anchorEl={orgDropAnchorEl}
        onClose={handleOrgDropdownClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{
          mt: 1,
          '& .MuiPaper-root': {
            borderRadius: 0,
            boxShadow: 'none',
            border: theme => `1px solid ${theme.palette.grey[300]}`,
            minWidth: '240px',
          }
        }}
      >
        <List sx={{ py: 1 }}>
          {loadingOrgs ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              {organizations.map((org) => (
                <ListItemButton 
                  key={org.id} 
                  onClick={() => handleOrganizationSelect(org.id)}
                  selected={organizationId === org.id.toString()}
                  sx={{
                    mx: 1,
                    borderRadius: 0,
                    '&:hover': { backgroundColor: theme => `rgba(166, 253, 237, 0.1)` },
                    '&.Mui-selected': { 
                      backgroundColor: theme => `rgba(98, 239, 131, 0.08)`,
                      '&:hover': { backgroundColor: theme => `rgba(98, 239, 131, 0.12)` }
                    }
                  }}
                >
                  <ListItemText 
                    primary={org.name} 
                    secondary={org.description || ''}
                    primaryTypographyProps={{ 
                      noWrap: true,
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                    secondaryTypographyProps={{ 
                      noWrap: true,
                      fontSize: '12px'
                    }}
                  />
                </ListItemButton>
              ))}
              {organizations.length > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <ListItemButton 
                    onClick={() => {
                      navigate('/organizations');
                      handleOrgDropdownClose();
                    }}
                    sx={{
                      mx: 1,
                      borderRadius: 0,
                      '&:hover': { backgroundColor: theme => `rgba(166, 253, 237, 0.1)` }
                    }}
                  >
                    <ListItemText 
                      primary="View All Organizations"
                      primaryTypographyProps={{ 
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                      sx={{
                        '& .MuiListItemText-primary': {
                          color: theme => theme.palette.primary.main
                        }
                      }}
                    />
                  </ListItemButton>
                </>
              )}
            </>
          )}
        </List>
      </Popover>

      {/* Project Dropdown Menu */}
      <Popover
        id={projectDropdownId}
        open={projectDropdownOpen}
        anchorEl={projectDropAnchorEl}
        onClose={handleProjectDropdownClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{
          mt: 1,
          '& .MuiPaper-root': {
            borderRadius: 0,
            boxShadow: 'none',
            border: '1px solid #e0e0e0',
            minWidth: '240px',
          }
        }}
      >
        <List sx={{ py: 1 }}>
          {loadingProjects ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              {projects.map((project) => (
                <ListItemButton 
                  key={project.id} 
                  onClick={() => handleProjectSelect(project.id)}
                  selected={projectId === project.id.toString()}
                  sx={{
                    mx: 1,
                    borderRadius: 0,
                    '&:hover': { backgroundColor: '#f8f9fa' },
                    '&.Mui-selected': { 
                      backgroundColor: 'rgba(225, 37, 27, 0.08)',
                      '&:hover': { backgroundColor: 'rgba(225, 37, 27, 0.12)' }
                    }
                  }}
                >
                  <ListItemText 
                    primary={project.name} 
                    secondary={project.description || ''}
                    primaryTypographyProps={{ 
                      noWrap: true,
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                    secondaryTypographyProps={{ 
                      noWrap: true,
                      fontSize: '12px'
                    }}
                  />
                </ListItemButton>
              ))}
              {projects.length > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <ListItemButton 
                    onClick={() => {
                      if (organizationId) {
                        navigate(`/organizations/${organizationId}/projects`);
                      } else {
                        navigate('/organizations');
                      }
                      handleProjectDropdownClose();
                    }}
                    sx={{
                      mx: 1,
                      borderRadius: 0,
                      '&:hover': { backgroundColor: '#f8f9fa' }
                    }}
                  >
                    <ListItemText 
                      primary="View All Projects"
                      primaryTypographyProps={{ 
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                      sx={{
                        '& .MuiListItemText-primary': {
                          color: theme => theme.palette.primary.main
                        }
                      }}
                    />
                  </ListItemButton>
                </>
              )}
            </>
          )}
        </List>
      </Popover>
    </Box>
  );
};

export default Header; 