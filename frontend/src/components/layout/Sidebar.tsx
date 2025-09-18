import {
    Analytics as AnalyticsIcon,
    Assessment as AssessmentIcon,
    Assignment as AssignmentIcon,
    AutoAwesome as AutoAwesomeIcon,
    InsertChart as ChartIcon,
    Description as DescriptionIcon,
    ExpandMore as ExpandMoreIcon,
    Facebook as FacebookIcon,
    Input as InputIcon,
    Instagram as InstagramIcon,
    Logout as LogoutIcon,
    Settings as SettingsIcon,
    Folder as FolderIcon,
    SmartToy as SmartToyIcon
} from '@mui/icons-material';
import CommentIcon from '@mui/icons-material/Comment';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import MusicVideoIcon from '@mui/icons-material/MusicVideo';
import NotificationsIcon from '@mui/icons-material/Notifications';
import {
    Box,
    Collapse,
    Divider,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Tooltip,
    useMediaQuery
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import React, { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Inline minimal implementation of useAuth to avoid path resolution issues
const useAuth = () => {
  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  };

  return { logout };
};

const drawerWidth = 260;
const miniDrawerWidth = 64;

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})<{ open: boolean }>(({ theme, open }) => ({
  width: open ? drawerWidth : miniDrawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: open ? drawerWidth : miniDrawerWidth,
    boxSizing: 'border-box',
    border: 'none',
    background: theme.palette.background.paper,
    boxShadow: 'none',
    overflowX: 'hidden',
    borderRight: `1px solid ${theme.palette.grey[300]}`,
    zIndex: theme.zIndex.drawer,
    marginTop: '84px',
    height: 'calc(100vh - 84px)',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
}));

const MenuSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(0, 1, 0, 1),
  '& .section-title': {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: theme.palette.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: theme.spacing(0.5),
    marginTop: theme.spacing(0.5),
    '&:first-of-type': {
      marginTop: theme.spacing(0.25),
    }
  }
}));

const StyledListItemButton = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ theme, active }) => ({
  minHeight: 40,
  margin: theme.spacing(0.3, 0),
  borderRadius: 10,
  padding: theme.spacing(0.8, 1.2),
  position: 'relative',
  backgroundColor: active ? `rgba(210, 145, 226, 0.08)` : 'transparent',
  border: active ? `1px solid rgba(210, 145, 226, 0.12)` : '1px solid transparent',
  '&:hover': {
    backgroundColor: active ? `rgba(210, 145, 226, 0.12)` : `rgba(210, 145, 226, 0.04)`,
    transform: 'translateX(2px)',
  },
  '&:before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 3,
    height: active ? 20 : 0,
    backgroundColor: theme.palette.primary.main,
    borderRadius: '0 3px 3px 0',
    transition: theme.transitions.create(['height'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.short,
    }),
  },
  transition: theme.transitions.create(['background-color', 'transform', 'border-color'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.short,
  }),
}));

const StyledListItemIcon = styled(ListItemIcon, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ theme, active }) => ({
  minWidth: 0,
  marginRight: theme.spacing(1.5),
  justifyContent: 'center',
  color: active ? theme.palette.primary.main : theme.palette.text.secondary,
  '& .MuiSvgIcon-root': {
    fontSize: '1.1rem',
  }
}));

const StyledListItemText = styled(ListItemText, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ theme, active }) => ({
  margin: 0,
  '& .MuiListItemText-primary': {
    fontSize: '0.9rem',
    fontWeight: active ? 600 : 500,
    color: active ? theme.palette.primary.main : theme.palette.text.primary,
    lineHeight: 1.4,
  }
}));

const CollapsibleIcon = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'expanded',
})<{ expanded: boolean }>(({ theme, expanded }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 'auto',
  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.short,
  }),
}));

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onToggle: () => void;
}

// Define menu structure with categories
interface MenuItem {
  text: string;
  path: string;
  icon: React.ReactNode;
  subItems?: MenuItem[];
  category?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { logout } = useAuth();

  // State to track expanded menu categories
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'data-storage': true,
    'data-scrapers': true,
    'reports': true
  });

  // Function to get correct path for Dashboard based on URL
  function getDashboardPath() {
    // Extract organization and project IDs from URL
    const match = location.pathname.match(/\/organizations\/(\d+)\/projects\/(\d+)/);

    if (match) {
      const [, orgId, projId] = match;
      return `/organizations/${orgId}/projects/${projId}`;
    }

    return '/dashboard';
  }

  // Menu items with categories
  const menuItems: MenuItem[] = [
    {
      text: 'Dashboard',
      path: getDashboardPath(),
      icon: <AnalyticsIcon />,
      category: 'main'
    },
    {
      text: 'Input Collection',
      path: getTrackAccountsPath(),
      icon: <InputIcon />,
      category: 'main'
    },
    {
      text: 'Workflow Management',
      path: getWorkflowManagementPath(),
      icon: <SmartToyIcon />,
      category: 'main'
    },
    {
      text: 'Instagram Scraper',
      path: getInstagramScraperPath(),
      icon: <InstagramIcon />,
      category: 'main'
    },
    {
      text: 'LinkedIn Scraper',
      path: getLinkedInScraperPath(),
      icon: <LinkedInIcon />,
      category: 'main'
    },
    {
      text: 'TikTok Scraper',
      path: getTikTokScraperPath(),
      icon: <MusicVideoIcon />,
      category: 'main'
    },
    {
      text: 'Facebook Scraper',
      path: getFacebookScraperPath(),
      icon: <FacebookIcon />,
      category: 'main'
    },
    {
      text: 'Data Storage',
      path: getDataStoragePath(),
      icon: <FolderIcon />,
      category: 'data'
    },

    {
      text: 'AI Analysis',
      path: getSocialMediaPath('analysis'),
      icon: <ChartIcon />,
      category: 'analytics'
    },
    {
      text: 'Reports',
      path: '#reports',
      icon: <DescriptionIcon />,
      category: 'analytics',
      subItems: [
        { text: 'Report Marketplace', path: getReportMarketplacePath(), icon: <AssessmentIcon /> },
        { text: 'Generated Reports', path: getGeneratedReportsPath(), icon: <AssignmentIcon /> },
      ]
    },
  ];

  // Function to get correct path for Track Accounts based on URL
  function getTrackAccountsPath() {
    // Extract organization and project IDs from URL
    const match = location.pathname.match(/\/organizations\/(\d+)\/projects\/(\d+)/);

    if (match) {
      const [, orgId, projId] = match;
      return `/organizations/${orgId}/projects/${projId}/source-tracking/sources`;
    }

    return '/track-accounts/accounts';
  }

  // Function to get correct path for social media data based on URL
  function getSocialMediaPath(endpoint: string) {
    // Extract organization and project IDs from URL
    const match = location.pathname.match(/\/organizations\/(\d+)\/projects\/(\d+)/);

    if (match) {
      const [, orgId, projId] = match;
      return `/organizations/${orgId}/projects/${projId}/${endpoint}`;
    }

    return `/${endpoint}`;
  }

  // Function to get correct path for Report Marketplace based on URL
  function getReportMarketplacePath() {
    // Extract organization and project IDs from URL
    const match = location.pathname.match(/\/organizations\/(\d+)\/projects\/(\d+)/);

    if (match) {
      const [, orgId, projId] = match;
      return `/organizations/${orgId}/projects/${projId}/report`;
    }

    return '/report';
  }

  // Function to get correct path for Generated Reports based on URL
  function getGeneratedReportsPath() {
    // Extract organization and project IDs from URL
    const match = location.pathname.match(/\/organizations\/(\d+)\/projects\/(\d+)/);

    if (match) {
      const [, orgId, projId] = match;
      return `/organizations/${orgId}/projects/${projId}/reports/generated`;
    }

    return '/reports/generated';
  }

  // Function to get correct path for Data Storage based on URL
  function getDataStoragePath() {
    // Extract organization and project IDs from URL
    const match = location.pathname.match(/\/organizations\/(\d+)\/projects\/(\d+)/);

    if (match) {
      const [, orgId, projId] = match;
      return `/organizations/${orgId}/projects/${projId}/data-storage`;
    }

    return '/data-storage';
  }



  // Function to get correct path for Workflow Management based on URL
  function getWorkflowManagementPath() {
    // Extract organization and project IDs from URL
    const match = location.pathname.match(/\/organizations\/(\d+)\/projects\/(\d+)/);

    if (match) {
      const [, orgId, projId] = match;
      return `/organizations/${orgId}/projects/${projId}/workflow-management`;
    }

    return '/workflow-management';
  }

  // Function to get correct path for Instagram Scraper based on URL
  function getInstagramScraperPath() {
    // Extract organization and project IDs from URL
    const match = location.pathname.match(/\/organizations\/(\d+)\/projects\/(\d+)/);

    if (match) {
      const [, orgId, projId] = match;
      return `/organizations/${orgId}/projects/${projId}/scrapy-instagram`;
    }

    return '/scrapy-instagram';
  }

  // Function to get correct path for LinkedIn Scraper based on URL
  function getLinkedInScraperPath() {
    const match = location.pathname.match(/\/organizations\/(\d+)\/projects\/(\d+)/);

    if (match) {
      const [, orgId, projId] = match;
      return `/organizations/${orgId}/projects/${projId}/scrapy-linkedin`;
    }

    return '/scrapy-linkedin';
  }

  // Function to get correct path for TikTok Scraper based on URL
  function getTikTokScraperPath() {
    const match = location.pathname.match(/\/organizations\/(\d+)\/projects\/(\d+)/);

    if (match) {
      const [, orgId, projId] = match;
      return `/organizations/${orgId}/projects/${projId}/scrapy-tiktok`;
    }

    return '/scrapy-tiktok';
  }

  // Function to get correct path for Facebook Scraper based on URL
  function getFacebookScraperPath() {
    const match = location.pathname.match(/\/organizations\/(\d+)\/projects\/(\d+)/);

    if (match) {
      const [, orgId, projId] = match;
      return `/organizations/${orgId}/projects/${projId}/scrapy-facebook`;
    }

    return '/scrapy-facebook';
  }

  // Function to check if a menu item is active based on the current path
  const isActive = useCallback((itemPath: string) => {
    // Special handling for root path
    if (itemPath === '/') {
      return location.pathname === '/';
    }

    // Skip category headers with hash paths
    if (itemPath.startsWith('#')) {
      return false;
    }

    // Special handling for Dashboard
    if (itemPath.includes('/projects/') && !itemPath.includes('/source-tracking') &&
        !itemPath.includes('/instagram') && !itemPath.includes('/facebook') &&
        !itemPath.includes('/linkedin') && !itemPath.includes('/tiktok') &&
        !itemPath.includes('/report-folders') && !itemPath.includes('/brightdata') &&
        !itemPath.includes('/analysis')) {
      return location.pathname === itemPath;
    }

    // Special handling for social media data sections
    if (itemPath.includes('instagram-folders')) {
      return location.pathname.includes('instagram');
    }
    if (itemPath.includes('facebook-folders')) {
      return location.pathname.includes('facebook');
    }
    if (itemPath.includes('linkedin-folders')) {
      return location.pathname.includes('linkedin');
    }
    if (itemPath.includes('tiktok-folders')) {
      return location.pathname.includes('tiktok');
    }

    // Check if this is a source-tracking path in either old format or new format with organization/project
    if (itemPath.includes('/source-tracking/sources')) {
      return location.pathname.includes('/source-tracking');
    }

    // Legacy support for old track-accounts paths
    if (itemPath.includes('/track-accounts/accounts')) {
      return location.pathname.includes('/track-accounts') || location.pathname.includes('/source-tracking');
    }

    if (itemPath.includes('brightdata-scraper')) {
      return location.pathname.includes('brightdata-scraper');
    }
    if (itemPath.includes('scrapy-instagram')) {
      return location.pathname.includes('scrapy-instagram') || location.pathname.includes('instagram-scraper');
    }
    if (itemPath.includes('scrapy-linkedin')) {
      return location.pathname.includes('scrapy-linkedin') || location.pathname.includes('linkedin-scraper');
    }
    if (itemPath.includes('scrapy-tiktok')) {
      return location.pathname.includes('scrapy-tiktok') || location.pathname.includes('tiktok-scraper');
    }
    if (itemPath.includes('scrapy-facebook')) {
      return location.pathname.includes('scrapy-facebook') || location.pathname.includes('facebook-scraper');
    }

    if (itemPath.includes('workflow-management')) {
      return location.pathname.includes('workflow-management');
    }

    if (itemPath.includes('hierarchical-data-storage')) {
      return location.pathname.includes('hierarchical-data-storage');
    }

    if (itemPath.includes('automated-batch-scraper')) {
      return location.pathname.includes('automated-batch-scraper') && !location.pathname.includes('workflow-management');
    }

    if (itemPath.includes('facebook-comment-scraper')) {
      return location.pathname.includes('facebook-comment-scraper');
    }

    if (itemPath.includes('webhook-monitor')) {
      return location.pathname.includes('webhook-monitor');
    }

    if (itemPath.includes('brightdata-notifications')) {
      return location.pathname.includes('brightdata-notifications');
    }

    // Special handling for analysis page
    if (itemPath.includes('analysis')) {
      return location.pathname.includes('analysis');
    }

    // Special handling for report folders
    if (itemPath.includes('report-folders')) {
      return location.pathname.includes('report-folders');
    }

    // Special handling for generated reports
    if (itemPath.includes('/reports/generated')) {
      return location.pathname.includes('/reports/generated') || location.pathname.includes('/report/generated/');
    }

    // Special handling for report marketplace
    if (itemPath.includes('/report') && !itemPath.includes('report-folders') && !itemPath.includes('/reports/generated')) {
      return location.pathname.includes('/report') && !location.pathname.includes('report-folders') && !location.pathname.includes('/reports/generated');
    }

    // For other paths, check if the current path starts with the menu item path
    return location.pathname.startsWith(itemPath);
  }, [location.pathname]);

  // Check if any sub-item is active
  const isAnyCategoryItemActive = useCallback((items: MenuItem[] | undefined) => {
    if (!items) return false;
    return items.some(item => isActive(item.path));
  }, [isActive]);

  // Handle toggle of collapsible menu categories
  const handleToggleMenu = (menuId: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const handleNavigate = useCallback((path: string) => {
    // Skip navigation for category headers
    if (path.startsWith('#')) {
      return;
    }

    // Special handling for Dashboard when using organization/project structure
    if (path.match(/\/organizations\/\d+\/projects\/\d+$/) && location.pathname === path) {
      return; // Already on dashboard, do nothing
    }

    // Prevent navigation if already on the exact same path
    if (location.pathname === path) {
      return;
    }

    // More specific subpath checking - only prevent navigation for direct subpaths
    // Don't prevent navigation between different report sections
    if (path !== '/' && path !== getDashboardPath()) {
      // Allow navigation between different report paths even if they share a common base
      const isReportPath = path.includes('/report');
      const isCurrentReportPath = location.pathname.includes('/report');

      if (isReportPath && isCurrentReportPath) {
        // Allow navigation between different report paths
        // Only prevent if it's the exact same path (already handled above)
      } else if (location.pathname.startsWith(path + '/')) {
        // Only prevent if current path is a direct subpath (with trailing slash)
        return;
      }
    }

    navigate(path);
    if (isMobile) {
      onClose();
    }
  }, [location.pathname, navigate, isMobile, onClose]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  // Group menu items by category
  const menuCategories = {
    main: menuItems.filter(item => item.category === 'main'),
    data: menuItems.filter(item => item.category === 'data'),
    analytics: menuItems.filter(item => item.category === 'analytics'),
  };

  const renderMenuItem = (item: MenuItem, isSubItem = false) => {
    const itemActive = isActive(item.path);

    // For category headers with sub-items
    if (item.subItems) {
      // Check if this is a clickable category header (has a real path) or just a toggle
      const isClickableCategory = !item.path.startsWith('#');
      const menuId = item.path.startsWith('#') ? item.path.replace('#', '') : item.text.toLowerCase().replace(/\s+/g, '-');
      const isExpanded = expandedMenus[menuId];
      const isAnySubItemActive = isAnyCategoryItemActive(item.subItems);

      return (
        <React.Fragment key={item.text}>
          <ListItem disablePadding sx={{ display: 'block' }}>
            <StyledListItemButton
              active={isAnySubItemActive || (isClickableCategory && itemActive)}
              onClick={() => {
                if (isClickableCategory) {
                  // If it's a clickable category, navigate to the path
                  handleNavigate(item.path);
                } else {
                  // If it's just a toggle, expand/collapse the menu
                  open ? handleToggleMenu(menuId) : onToggle();
                }
              }}
            >
              <Tooltip title={open ? '' : item.text} placement="right" arrow>
                <StyledListItemIcon active={isAnySubItemActive || (isClickableCategory && itemActive)}>
                  {item.icon}
                </StyledListItemIcon>
              </Tooltip>
              {open && (
                <>
                  <StyledListItemText
                    active={isAnySubItemActive || (isClickableCategory && itemActive)}
                    primary={item.text}
                  />
                  {!isClickableCategory && (
                    <CollapsibleIcon expanded={isExpanded}>
                      <ExpandMoreIcon sx={{ fontSize: '1rem' }} />
                    </CollapsibleIcon>
                  )}
                </>
              )}
            </StyledListItemButton>
          </ListItem>

          {open && !isClickableCategory && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding sx={{ pl: 1 }}>
                {item.subItems.map(subItem => renderMenuItem(subItem, true))}
              </List>
            </Collapse>
          )}
        </React.Fragment>
      );
    }

    // For regular menu items
    return (
      <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
        <StyledListItemButton
          active={itemActive}
          onClick={() => handleNavigate(item.path)}
          sx={{
            pl: isSubItem && open ? 3 : 1.5,
          }}
        >
          <Tooltip title={open ? '' : item.text} placement="right" arrow>
            <StyledListItemIcon active={itemActive}>
              {item.icon}
            </StyledListItemIcon>
          </Tooltip>
          {open && (
            <StyledListItemText
              active={itemActive}
              primary={item.text}
            />
          )}
        </StyledListItemButton>
      </ListItem>
    );
  };

  const renderMenuSection = (title: string, items: MenuItem[]) => {
    if (items.length === 0) return null;

    return (
      <MenuSection key={title}>
        {/* {open && <Typography className="section-title">{title}</Typography>} */}
        <List sx={{ py: 0 }}>
          {items.map(item => renderMenuItem(item))}
        </List>
      </MenuSection>
    );
  };

  return (
    <StyledDrawer
      open={open}
      variant={isMobile ? "temporary" : "permanent"}
      anchor="left"
      onClose={onClose}
    >
      <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', py: 0.5 }}>
        {renderMenuSection('Main', menuCategories.main)}
        {renderMenuSection('Data Management', menuCategories.data)}
        {renderMenuSection('Analytics', menuCategories.analytics)}
      </Box>

      <Divider sx={{ mx: 2 }} />

      {/* Settings and Logout */}
      <MenuSection>
        <List sx={{ py: 1 }}>
          <ListItem disablePadding>
            <StyledListItemButton
              active={isActive('/settings')}
              onClick={() => handleNavigate('/settings')}
            >
              <Tooltip title={open ? '' : 'Settings'} placement="right" arrow>
                <StyledListItemIcon active={isActive('/settings')}>
                  <SettingsIcon />
                </StyledListItemIcon>
              </Tooltip>
              {open && (
                <StyledListItemText
                  active={isActive('/settings')}
                  primary="Settings"
                />
              )}
            </StyledListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <StyledListItemButton
              onClick={handleLogout}
              sx={{
                backgroundColor: 'transparent !important',
                border: '1px solid transparent !important',
                '&:hover': {
                  backgroundColor: 'rgba(244, 67, 54, 0.08) !important',
                  border: '1px solid rgba(244, 67, 54, 0.12) !important',
                },
                '&:before': {
                  display: 'none !important',
                },
              }}
            >
              <Tooltip title={open ? '' : 'Logout'} placement="right" arrow>
                <StyledListItemIcon sx={{ 
                  color: '#d32f2f !important',
                  '& .MuiSvgIcon-root': {
                    color: '#d32f2f !important',
                  }
                }}>
                  <LogoutIcon />
                </StyledListItemIcon>
              </Tooltip>
              {open && (
                <StyledListItemText
                  primary="Logout"
                  sx={{
                    '& .MuiListItemText-primary': {
                      color: '#d32f2f !important',
                      fontWeight: 500,
                    }
                  }}
                />
              )}
            </StyledListItemButton>
          </ListItem>
        </List>
      </MenuSection>
    </StyledDrawer>
  );
};

export default Sidebar;
