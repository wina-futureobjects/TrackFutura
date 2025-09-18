import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Box,
  Button,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  CircularProgress,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Card,
  CardActionArea,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import GroupIcon from '@mui/icons-material/Group';
import SettingsIcon from '@mui/icons-material/Settings';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { apiFetch } from '../utils/api';
import { getCurrentUser } from '../utils/auth';
import { useTheme } from '@mui/material/styles';

interface Project {
  id: number;
  name: string;
  description: string | null;
  owner: number;
  owner_name: string;
  organization: number;
  organization_name: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface Organization {
  id: number;
  name: string;
  description: string | null;
  owner: number;
  owner_name: string;
  members_count: number;
  created_at: string;
  updated_at: string;
}

interface Member {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    is_active: boolean;
  };
  role: string;
  display_name?: string;
  date_joined: string;
}

// Helper function to convert legacy routes to new organization/project structure
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
    '/settings': `${baseOrgProjectPath}/settings`,
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

const OrganizationProjects = () => {
  const navigate = useNavigate();
  const { organizationId } = useParams<{ organizationId: string }>();
  const theme = useTheme();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('last viewed');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [openNewProjectDialog, setOpenNewProjectDialog] = useState(false);
  const [openAddMemberDialog, setOpenAddMemberDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    is_public: false
  });
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ userId: number; newStatus: boolean } | null>(null);
  const [memberActionMenuAnchor, setMemberActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [projectActionMenuAnchor, setProjectActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Member edit dialog states
  const [editMemberDialogOpen, setEditMemberDialogOpen] = useState(false);
  const [editMemberForm, setEditMemberForm] = useState({
    name: '',
    role: 'member'
  });
  const [isEditingMember, setIsEditingMember] = useState(false);
  
  // Project edit dialog states
  const [editProjectDialogOpen, setEditProjectDialogOpen] = useState(false);
  const [editProjectForm, setEditProjectForm] = useState({
    name: '',
    description: '',
    is_public: false
  });
  const [isEditingProject, setIsEditingProject] = useState(false);
  
  // Delete confirmation dialogs
  const [deleteMemberDialogOpen, setDeleteMemberDialogOpen] = useState(false);
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  
  // State for current user's organization role
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');
  
  // Enhanced settings states
  const [isEditingOrganization, setIsEditingOrganization] = useState(false);
  const [orgEditForm, setOrgEditForm] = useState({ name: '', description: '' });
  
  // Delete organization states
  const [deleteOrgDialogOpen, setDeleteOrgDialogOpen] = useState(false);
  const [isDeletingOrganization, setIsDeletingOrganization] = useState(false);

  const fetchOrganizationDetails = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/users/organizations/${organizationId}/`);
      if (!response.ok) {
        throw new Error('Failed to fetch organization details');
      }
      
      const data = await response.json();
      setOrganization(data);
    } catch (error) {
      console.error('Error fetching organization details:', error);
      setError('Failed to load organization details.');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/users/projects/?organization=${organizationId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setProjects(data);
      } else if (data && typeof data === 'object' && 'results' in data) {
        setProjects(data.results || []);
      } else {
        console.error('API returned unexpected data format:', data);
        setProjects([]);
        setError('Received invalid data format from server.');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
      setError('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const fetchCurrentUserRole = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/users/organizations/${organizationId}/members/`);
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      
      const data = await response.json();
      const membersData = data.results || data;
      
      // Find current user's role in this organization
      const currentUser = getCurrentUser();
      if (currentUser && Array.isArray(membersData)) {
        const currentUserMembership = membersData.find(member => member.user.id === currentUser.id);
        if (currentUserMembership) {
          setCurrentUserRole(currentUserMembership.role);
        }
      }
    } catch (error) {
      console.error('Error fetching current user role:', error);
      // Keep default role as 'member' if fetch fails
    }
  }, [organizationId]);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/users/organizations/${organizationId}/members/`);
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      
      const data = await response.json();
      console.log('Raw API response:', data);
      
      // Handle paginated response from Django REST Framework
      const membersData = data.results || data;
      console.log('Members data:', membersData);
      
      setMembers(Array.isArray(membersData) ? membersData : []);
      
      // Find current user's role in this organization
      const currentUser = getCurrentUser();
      if (currentUser && Array.isArray(membersData)) {
        const currentUserMembership = membersData.find(member => member.user.id === currentUser.id);
        if (currentUserMembership) {
          setCurrentUserRole(currentUserMembership.role);
        }
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      setMembers([]);
      setError('Failed to load organization members.');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) {
      fetchOrganizationDetails();
      fetchProjects();
      fetchCurrentUserRole(); // Always fetch user role on load
      if (activeTab === 1) {
        fetchMembers();
      }
    }
  }, [organizationId, activeTab, fetchOrganizationDetails, fetchProjects, fetchCurrentUserRole, fetchMembers]);

  // Update edit form when organization data changes
  useEffect(() => {
    if (organization) {
      setOrgEditForm({
        name: organization.name || '',
        description: organization.description || ''
      });
    }
  }, [organization]);

  // Organization editing functions
  const handleEditOrganization = () => {
    setIsEditingOrganization(true);
  };

  const handleCancelEditOrganization = () => {
    setIsEditingOrganization(false);
    // Reset form to original values
    if (organization) {
      setOrgEditForm({
        name: organization.name || '',
        description: organization.description || ''
      });
    }
  };

  const handleSaveOrganization = async () => {
    if (!orgEditForm.name.trim()) {
      setError('Organization name is required');
      return;
    }

    try {
      const response = await apiFetch(`/api/users/organizations/${organizationId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: orgEditForm.name.trim(),
          description: orgEditForm.description.trim() || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to update organization');
      }

      const updatedOrganization = await response.json();
      setOrganization(updatedOrganization);
      setIsEditingOrganization(false);
      setSuccessMessage('Organization updated successfully');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error updating organization:', error);
      setError(error instanceof Error ? error.message : 'Failed to update organization');
    }
  };

  const handleDeleteOrganization = () => {
    setDeleteOrgDialogOpen(true);
  };

  const handleDeleteOrganizationConfirm = async () => {
    if (!organizationId) return;

    setIsDeletingOrganization(true);
    setError('');

    try {
      const response = await apiFetch(`/api/users/organizations/${organizationId}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete organization');
      }

      // Navigate back to organizations list after successful deletion
      navigate('/organizations');
    } catch (error) {
      console.error('Error deleting organization:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete organization');
      setDeleteOrgDialogOpen(false);
    } finally {
      setIsDeletingOrganization(false);
    }
  };

  const handleCancelDeleteOrganization = () => {
    setDeleteOrgDialogOpen(false);
  };

  const handleOpenProject = (projectId: number) => {
    const intendedDestination = sessionStorage.getItem('intendedDestination');
    
    if (intendedDestination && organizationId) {
      // Clear the stored destination
      sessionStorage.removeItem('intendedDestination');
      
      // Convert legacy route to new organization/project structure
      const convertedRoute = convertLegacyRoute(intendedDestination, organizationId, projectId.toString());
      navigate(convertedRoute, { replace: true });
    } else {
      // Normal navigation to project dashboard
      navigate(`/organizations/${organizationId}/projects/${projectId}`);
    }
  };

  const handleNewProject = () => {
    setNewProject({ name: '', description: '', is_public: false });
    setOpenNewProjectDialog(true);
  };

  const handleAddMember = () => {
    setNewMemberEmail('');
    setNewMemberName('');
    setNewMemberRole('member');
    setError('');
    setIsSubmitting(false);
    setOpenAddMemberDialog(true);
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      return;
    }

    try {
      const response = await apiFetch('/api/users/projects/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProject.name,
          description: newProject.description || null,
          organization: Number(organizationId),
          is_public: newProject.is_public
        }),
      });

      if (!response.ok) {
        let errorDetail = 'Failed to create project';
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorDetail = errorData.detail;
          } else if (typeof errorData === 'object') {
            errorDetail = Object.entries(errorData)
              .map(([field, errors]) => `${field}: ${errors}`)
              .join(', ');
          }
        } catch (e) {
          console.error('Could not parse error response:', e);
        }
        throw new Error(errorDetail);
      }

      fetchProjects();
      setOpenNewProjectDialog(false);
    } catch (error) {
      console.error('Error creating project:', error);
      setError(error instanceof Error ? error.message : 'Failed to create project. Please try again.');
    }
  };

  const handleAddMemberSubmit = async () => {
    if (!newMemberEmail.trim()) {
      setError('Email is required');
      return;
    }

    if (!newMemberName.trim()) {
      setError('Name is required');
      return;
    }

    if (isSubmitting) {
      return; // Prevent double submission
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Create new user and add to organization
      const response = await apiFetch(`/api/users/organizations/${organizationId}/members/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newMemberName.trim(),
          email: newMemberEmail.trim(),
          role: newMemberRole
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = 'Failed to add member to organization';
        
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (typeof errorData === 'object') {
          errorMessage = Object.entries(errorData)
            .map(([field, errors]) => `${field}: ${errors}`)
            .join(', ');
        }
        
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('Member added successfully:', responseData);

      // Show success message based on whether user was created or existing
      if (responseData.user_created) {
        // New user was created
        setSuccessMessage(`New user "${responseData.user.display_name || responseData.user.username}" created and added to organization. Login credentials have been sent to ${responseData.user.email}.`);
      } else {
        // Existing user was added
        setSuccessMessage(`Existing user "${responseData.user.display_name || responseData.user.username}" added to organization.`);
      }

      fetchMembers();
      setOpenAddMemberDialog(false);
      setError('');
      // Reset form
      setNewMemberEmail('');
      setNewMemberName('');
      setNewMemberRole('member');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error adding member:', error);
      setError(error instanceof Error ? error.message : 'Failed to add member. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    // Prevent non-admin users from accessing Settings tab (tab index 2)
    if (newValue === 2 && currentUserRole !== 'admin') {
      console.warn('Access denied: Only admin users can access Settings tab');
      return; // Don't change tab
    }
    
    setActiveTab(newValue);
    // Clear member search when switching away from members tab
    if (newValue !== 1) {
      setMemberSearchQuery('');
      setRoleFilter('all');
    }
  };

  const handleSortChange = (event: SelectChangeEvent) => {
    console.log('Sort changed to:', event.target.value);
    setSortBy(event.target.value);
  };

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: 'list' | 'grid',
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const handleChangeUserStatus = async (userId: number, newStatus: boolean) => {
    try {
      const response = await apiFetch(`/api/admin/users/${userId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to update user status');
      }

      // Update the user in the local state
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.user.id === userId 
            ? { ...member, user: { ...member.user, is_active: newStatus } }
            : member
        )
      );

      setError('');
    } catch (error) {
      console.error('Error updating user status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update user status');
    }
  };

  const handleStatusChangeClick = (userId: number, currentStatus: boolean) => {
    setPendingStatusChange({ userId, newStatus: !currentStatus });
    setStatusChangeDialogOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (pendingStatusChange) {
      await handleChangeUserStatus(pendingStatusChange.userId, pendingStatusChange.newStatus);
      setStatusChangeDialogOpen(false);
      setPendingStatusChange(null);
    }
  };

  const handleCancelStatusChange = () => {
    setStatusChangeDialogOpen(false);
    setPendingStatusChange(null);
  };

  const handleMemberActionClick = (event: React.MouseEvent<HTMLElement>, member: Member) => {
    event.stopPropagation();
    console.log('handleMemberActionClick called with member:', member);
    console.log('member.user:', member.user);
    setMemberActionMenuAnchor(event.currentTarget);
    setSelectedMember(member);
  };

  const handleMemberActionClose = () => {
    setMemberActionMenuAnchor(null);
    setSelectedMember(null);
  };

  const handleEditMemberRole = () => {
    console.log('handleEditMemberRole called');
    console.log('selectedMember:', selectedMember);
    if (selectedMember) {
      setEditMemberForm({ 
        name: selectedMember.display_name || selectedMember.user.username,
        role: selectedMember.role 
      });
      setEditMemberDialogOpen(true);
    }
    // Don't clear selectedMember here - only close the menu
    setMemberActionMenuAnchor(null);
  };

  const handleRemoveMember = () => {
    console.log('handleRemoveMember called');
    console.log('selectedMember:', selectedMember);
    console.log('selectedMember?.user:', selectedMember?.user);
    setDeleteMemberDialogOpen(true);
    // Don't clear selectedMember here - only close the menu
    setMemberActionMenuAnchor(null);
  };

  const handleProjectActionClick = (event: React.MouseEvent<HTMLElement>, project: Project) => {
    event.stopPropagation();
    setProjectActionMenuAnchor(event.currentTarget);
    setSelectedProject(project);
  };

  const handleProjectActionClose = () => {
    setProjectActionMenuAnchor(null);
    setSelectedProject(null);
  };

  const handleEditProject = () => {
    console.log('handleEditProject called');
    console.log('selectedProject:', selectedProject);
    if (selectedProject) {
      setEditProjectForm({
        name: selectedProject.name,
        description: selectedProject.description || '',
        is_public: selectedProject.is_public
      });
      setEditProjectDialogOpen(true);
    }
    setProjectActionMenuAnchor(null); // Only close the menu, don't clear selectedProject
  };

  const handleDeleteProject = () => {
    setDeleteProjectDialogOpen(true);
    setProjectActionMenuAnchor(null); // Only close the menu, don't clear selectedProject
  };

  // API functions for member operations
  const handleUpdateMember = async () => {
    if (!selectedMember || !organizationId) return;

    // Validate form data
    if (!editMemberForm.name.trim()) {
      setError('Name is required');
      return;
    }

    console.log('handleUpdateMember called');
    console.log('selectedMember:', selectedMember);
    console.log('editMemberForm:', editMemberForm);
    console.log('organizationId:', organizationId);

    setIsEditingMember(true);
    setError('');

    try {
      // Update the member's display_name and role
      const memberResponse = await apiFetch(`/api/users/organizations/${organizationId}/members/${selectedMember.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          display_name: editMemberForm.name,
          role: editMemberForm.role 
        }),
      });

      console.log('Member update response status:', memberResponse.status);
      console.log('Member update response ok:', memberResponse.ok);

      if (!memberResponse.ok) {
        const errorData = await memberResponse.json().catch(() => ({}));
        console.log('Member update error data:', errorData);
        throw new Error(errorData.detail || errorData.error || 'Failed to update member role');
      }

      console.log('Member updated successfully');

      // Update the member in local state
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.id === selectedMember.id 
            ? { 
                ...member, 
                role: editMemberForm.role,
                display_name: editMemberForm.name
              }
            : member
        )
      );

      setEditMemberDialogOpen(false);
      setSelectedMember(null);
      setMemberActionMenuAnchor(null);
    } catch (error) {
      console.error('Error updating member:', error);
      setError(error instanceof Error ? error.message : 'Failed to update member');
      // Clear selectedMember on error too
      setSelectedMember(null);
      setMemberActionMenuAnchor(null);
    } finally {
      setIsEditingMember(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember || !organizationId) return;

    setIsDeletingMember(true);
    setError('');

    try {
      console.log('Attempting to delete member:', selectedMember);
      console.log('Organization ID:', organizationId);
      console.log('Member ID:', selectedMember.id);
      
      const response = await apiFetch(`/api/users/organizations/${organizationId}/members/${selectedMember.id}/`, {
        method: 'DELETE',
      });

      console.log('Delete response status:', response.status);
      console.log('Delete response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('Error data:', errorData);
        throw new Error(errorData.detail || errorData.error || 'Failed to remove member');
      }

      console.log('Member deleted successfully');

      // Remove the member from local state
      setMembers(prevMembers => 
        prevMembers.filter(member => member.id !== selectedMember.id)
      );

      setDeleteMemberDialogOpen(false);
      setSelectedMember(null);
      setMemberActionMenuAnchor(null);
    } catch (error) {
      console.error('Error removing member:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove member');
      // Clear selectedMember on error too
      setSelectedMember(null);
      setMemberActionMenuAnchor(null);
    } finally {
      setIsDeletingMember(false);
    }
  };

  // API functions for project operations
  const handleUpdateProject = async () => {
    if (!selectedProject) return;

    console.log('handleUpdateProject called');
    console.log('selectedProject:', selectedProject);
    console.log('editProjectForm:', editProjectForm);

    setIsEditingProject(true);
    setError('');

    try {
      const response = await apiFetch(`/api/users/projects/${selectedProject.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editProjectForm.name,
          description: editProjectForm.description || null,
          is_public: editProjectForm.is_public
        }),
      });

      console.log('Project update response status:', response.status);
      console.log('Project update response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('Project update error data:', errorData);
        throw new Error(errorData.detail || 'Failed to update project');
      }

      console.log('Project updated successfully');

      // Update the project in local state
      setProjects(prevProjects => 
        prevProjects.map(project => 
          project.id === selectedProject.id 
            ? { 
                ...project, 
                name: editProjectForm.name,
                description: editProjectForm.description || null,
                is_public: editProjectForm.is_public
              }
            : project
        )
      );

      setEditProjectDialogOpen(false);
      setSelectedProject(null);
    } catch (error) {
      console.error('Error updating project:', error);
      setError(error instanceof Error ? error.message : 'Failed to update project');
      setSelectedProject(null); // Clear selectedProject on error too
    } finally {
      setIsEditingProject(false);
    }
  };

  const handleDeleteProjectConfirm = async () => {
    if (!selectedProject) return;

    setIsDeletingProject(true);
    setError('');

    try {
      const response = await apiFetch(`/api/users/projects/${selectedProject.id}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete project');
      }

      // Remove the project from local state
      setProjects(prevProjects => 
        prevProjects.filter(project => project.id !== selectedProject.id)
      );

      setDeleteProjectDialogOpen(false);
      setSelectedProject(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete project');
      setSelectedProject(null); // Clear selectedProject on error too
    } finally {
      setIsDeletingProject(false);
    }
  };

  // Filter and sort projects
  const filteredAndSortedProjects = projects
    .filter(project => 
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      console.log(`Sorting projects: ${a.name} vs ${b.name} by ${sortBy}`);
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'last viewed':
        default:
          // For "last viewed", we'll use updated_at as a proxy since we don't have view tracking
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

  // Return either grid or list view of projects
  const renderProjects = () => {
    if (filteredAndSortedProjects.length === 0) {
      return (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 2, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }}>
          <Typography variant="h6" gutterBottom>No projects found</Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Create your first project in this organization to get started.
          </Typography>
                     <Button 
             variant="contained" 
             startIcon={<AddIcon />} 
             onClick={handleNewProject}
             sx={{
               borderRadius: 2,
               bgcolor: '#62EF83', 
               color: '#000000', 
               textTransform: 'none',
               fontWeight: 500,
               boxShadow: 'none',
               px: 3,
               py: 1,
               transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
               '&:hover': {
                 bgcolor: '#4FD16C',
                 boxShadow: '0 2px 8px rgba(98, 239, 131, 0.3)'
               }
             }}
           >
             Create Project
           </Button>
        </Paper>
      );
    }

    if (viewMode === 'grid') {
      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1 }}>
          {filteredAndSortedProjects.map((project) => (
            <Box 
              key={project.id} 
              sx={{ 
                width: { xs: '100%', sm: '50%', md: '33.33%', lg: '25%' },
                p: 1
              }}
            >
              <Card 
                                 sx={{ 
                   height: '100%',
                   display: 'flex',
                   flexDirection: 'column',
                   transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                   '&:hover': {
                     transform: 'translateY(-4px)',
                     boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                   },
                   cursor: 'pointer',
                   borderRadius: '12px',
                   overflow: 'hidden',
                   border: '1px solid rgba(0,0,0,0.08)',
                   boxShadow: 'none',
                   position: 'relative'
                 }}
              >
                {/* Action button outside CardActionArea */}
                <IconButton 
                  size="small"
                  onClick={(e) => handleProjectActionClick(e, project)}
                  sx={{ 
                    position: 'absolute', 
                    top: 8, 
                    right: 8,
                    zIndex: 1
                  }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
                
                <CardActionArea 
                                   sx={{ 
                   flexGrow: 1, 
                   display: 'flex', 
                   flexDirection: 'column', 
                   alignItems: 'flex-start', 
                   p: 2.5,
                   transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                   '&:hover': {
                     bgcolor: 'transparent'
                   }
                 }}
                  onClick={() => handleOpenProject(project.id)}
                >
                  <Box 
                    sx={{ 
                      width: '100%', 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 1
                    }}
                  >
                    <Typography 
                      variant="h6" 
                      component="div" 
                      sx={{ 
                        fontWeight: 500,
                        color: theme => theme.palette.primary.main,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {project.name}
                    </Typography>
                  </Box>
                  
                  {project.description && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {project.description}
                    </Typography>
                  )}
                  
                  <Box sx={{ 
                    mt: 'auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%'
                  }}>
                    <Chip 
                      label={project.is_public ? 'Public' : 'Private'} 
                      size="small"
                      sx={{ 
                        bgcolor: project.is_public ? 'rgba(46, 204, 113, 0.1)' : 'rgba(52, 152, 219, 0.1)',
                        color: project.is_public ? 'rgb(46, 204, 113)' : 'rgb(52, 152, 219)',
                        borderRadius: '4px',
                        fontWeight: 500,
                        fontSize: '0.7rem',
                        height: '24px'
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(project.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardActionArea>
              </Card>
            </Box>
          ))}
        </Box>
      );
    }

    // List View
    return (
      <TableContainer component={Paper} sx={{ 
        boxShadow: 'none', 
        borderRadius: '8px',
        border: '1px solid rgba(0,0,0,0.12)'
      }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f9fafb' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Project name</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Owner</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Access</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Created</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedProjects.map((project) => (
              <TableRow 
                key={project.id}
                hover
                sx={{ cursor: 'pointer' }}
              >
                <TableCell 
                  sx={{ color: theme => theme.palette.primary.main, fontWeight: 500 }}
                  onClick={() => handleOpenProject(project.id)}
                >
                  {project.name}
                </TableCell>
                <TableCell onClick={() => handleOpenProject(project.id)}>
                  {project.owner_name}
                </TableCell>
                <TableCell onClick={() => handleOpenProject(project.id)}>
                  <Chip 
                    label={project.is_public ? 'Public' : 'Private'} 
                    size="small"
                    sx={{ 
                      bgcolor: project.is_public ? 'rgba(46, 204, 113, 0.1)' : 'rgba(52, 152, 219, 0.1)',
                      color: project.is_public ? 'rgb(46, 204, 113)' : 'rgb(52, 152, 219)',
                      borderRadius: '4px',
                      fontWeight: 500,
                      fontSize: '0.7rem',
                      height: '24px'
                    }}
                  />
                </TableCell>
                <TableCell onClick={() => handleOpenProject(project.id)}>
                  {new Date(project.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell align="center">
                  <IconButton 
                    size="small"
                    onClick={(e) => handleProjectActionClick(e, project)}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Filter members based on search query and role filter
  const filteredMembers = members.filter(member => {
    console.log('Filtering member:', member);
    
            const matchesSearch = (member.display_name || member.user.username).toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                              member.user.email.toLowerCase().includes(memberSearchQuery.toLowerCase());
    
    const matchesRoleFilter = roleFilter === 'all' || 
                             member.role === roleFilter;
    
    console.log('Search match:', matchesSearch, 'Role match:', matchesRoleFilter);
    
    return matchesSearch && matchesRoleFilter;
  });

  return (
    <Box sx={{ 
      width: '100%', 
      padding: '24px 32px',
      bgcolor: '#f8f9fa',
      minHeight: 'calc(100vh - 64px)',
    }}>
      {/* Tabs */}
      <Box sx={{ mb: 4, display: 'flex', borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="organization tabs"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '1rem',
              color: 'rgba(0, 0, 0, 0.7)',
              minWidth: 100,
              py: 1.5,
            },
            '& .Mui-selected': {
              color: theme => theme.palette.primary.main,
              fontWeight: 600,
            },
            '& .MuiTabs-indicator': {
              backgroundColor: theme => theme.palette.primary.main,
              height: 3,
            },
          }}
        >
          <Tab label="Projects List" id="tab-0" />
          <Tab label="Members" id="tab-1" />
          {/* Only show Settings tab if user is admin */}
          {currentUserRole === 'admin' && <Tab label="Settings" id="tab-2" />}
        </Tabs>
      </Box>
      
      {/* Projects Tab */}
      <Box role="tabpanel" hidden={activeTab !== 0}>
        {activeTab === 0 && (
          <>
            {/* Header and actions */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
              <Typography variant="h4" component="h1" fontWeight="600" my={1.5}>
                {organization?.name || 'Organization'}
              </Typography>
                             <Button 
                 variant="contained" 
                 startIcon={<AddIcon />}
                 onClick={handleNewProject}
                 sx={{ 
                   borderRadius: 8,
                   bgcolor: '#62EF83', 
                   color: '#000000', 
                   textTransform: 'none',
                   fontWeight: 500,
                   boxShadow: 'none',
                   px: 3,
                   py: 1.2,
                   transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                   '&:hover': {
                     bgcolor: '#4FD16C',
                     boxShadow: '0 2px 8px rgba(98, 239, 131, 0.3)'
                   }
                 }}
               >
                 Create project
               </Button>
            </Box>

            {/* Search and filters bar */}
            <Paper
              elevation={0}
              sx={{ 
                p: 2, 
                mb: 3, 
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: { xs: 2, md: 3 },
                borderRadius: 3,
                border: '1px solid rgba(0, 0, 0, 0.08)',
                bgcolor: 'white',
                minWidth: { xs: '100%', md: 1200 }, // Make the bar even longer on desktop
                width: { xs: '100%', md: '100%' },
                maxWidth: { xs: '100%', md: '1800px' }, // Allow for a very wide bar
              }}
            >
              {/* Search Box */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                flex: { xs: '1', md: '1 1 1200px' },
                minWidth: { xs: '100%', md: 700 },
                maxWidth: { xs: '100%', md: 1400 },
                borderRadius: 2,
                px: 2,
                py: 1,
                bgcolor: 'rgba(0, 0, 0, 0.03)',
                flexGrow: 1,
              }}>
                <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: '1.2rem' }} />
                <TextField
                  placeholder="Search projects"
                  variant="standard"
                  fullWidth
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ 
                    '& .MuiInput-root': {
                      '&::before, &::after': {
                        display: 'none'
                      }
                    },
                    '& .MuiInputBase-input': {
                      py: 0.5,
                      fontSize: '0.95rem'
                    }
                  }}
                />
              </Box>
              
              {/* Controls - Fixed to Right */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexShrink: 0,
                  flexWrap: { xs: 'wrap', md: 'nowrap' },
                  minWidth: 'fit-content',
                  ml: { xs: 0, md: 'auto' }, // Push to right in row on md+
                  justifyContent: { xs: 'center', md: 'flex-end' },
                  width: { xs: '100%', md: 'auto' }
                }}
              >
                {/* Sort Dropdown */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 0.75,
                    px: 2,
                    borderRadius: 2,
                    bgcolor: 'rgba(0, 0, 0, 0.03)',
                    minWidth: 'fit-content',
                    flexShrink: 0
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 500,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Sort by:
                  </Typography>
                  <Select
                    value={sortBy}
                    onChange={handleSortChange}
                    size="small"
                    variant="standard"
                    disableUnderline
                    sx={{
                      minWidth: { xs: 100, md: 120 },
                      '& .MuiSelect-select': {
                        fontWeight: 500,
                        py: 0,
                        color: theme => theme.palette.primary.main,
                        fontSize: '0.9rem'
                      }
                    }}
                  >
                    <MenuItem value="last viewed">Last viewed</MenuItem>
                    <MenuItem value="newest">Newest</MenuItem>
                    <MenuItem value="oldest">Oldest</MenuItem>
                    <MenuItem value="name">Name</MenuItem>
                  </Select>
                </Box>

                {/* View Mode Toggle */}
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={handleViewModeChange}
                  aria-label="view mode"
                  size="small"
                  sx={{
                    border: 'none',
                    bgcolor: 'rgba(0, 0, 0, 0.03)',
                    borderRadius: 2,
                    flexShrink: 0,
                    ml: { xs: 0, md: 1 },
                    '& .MuiToggleButton-root': {
                      border: 'none',
                      py: 0.75,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&.Mui-selected': {
                        bgcolor: 'white',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                        '&:hover': {
                          bgcolor: 'white'
                        }
                      }
                    }
                  }}
                >
                  <ToggleButton value="grid" aria-label="grid view">
                    <GridViewIcon />
                  </ToggleButton>
                  <ToggleButton value="list" aria-label="list view">
                    <ViewListIcon />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Paper>

            {/* Projects Count */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Showing {filteredAndSortedProjects.length} project{filteredAndSortedProjects.length !== 1 ? 's' : ''}
            </Typography>

            {/* Projects Display */}
            {loading ? (
              <Box display="flex" justifyContent="center" mt={4}>
                <CircularProgress />
              </Box>
            ) : (
              renderProjects()
            )}
          </>
        )}
      </Box>
      
      {/* Members Tab */}
      <Box role="tabpanel" hidden={activeTab !== 1}>
        {activeTab === 1 && (
          <>
            {/* Header and actions */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
              <Typography variant="h4" component="h1" fontWeight="600" my={1.5}>
                {organization?.name || 'Organization'} Members
              </Typography>
                <Button 
                 variant="contained" 
                 startIcon={<GroupIcon />}
                 onClick={handleAddMember}
                 sx={{ 
                   borderRadius: 8,
                   bgcolor: '#62EF83', 
                   color: '#000000', 
                   textTransform: 'none',
                   fontWeight: 500,
                   boxShadow: 'none',
                   px: 3,
                   py: 1.2,
                   transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                   '&:hover': {
                     bgcolor: '#4FD16C',
                     boxShadow: '0 2px 8px rgba(98, 239, 131, 0.3)'
                   }
                 }}
                >
                  Add Member
                </Button>
            </Box>

            {/* Search and filters for members */}
            <Paper
              elevation={0}
              sx={{ 
                p: 2, 
                mb: 3, 
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: { xs: 2, md: 3 },
                borderRadius: 3,
                border: '1px solid rgba(0, 0, 0, 0.08)',
                bgcolor: 'white' 
              }}
            >
              {/* Filter and Search Controls */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: 2,
                flex: 1
              }}>
                {/* Role Filter */}
                <FormControl 
                  size="small" 
                  sx={{ 
                    minWidth: { xs: '100%', sm: 150 },
                    maxWidth: { xs: '100%', sm: 200 }
                  }}
                >
                  <InputLabel>Filter by Role</InputLabel>
                  <Select
                    value={roleFilter}
                    label="Filter by Role"
                    onChange={(e) => setRoleFilter(e.target.value)}
                    sx={{
                      '& .MuiSelect-select': {
                        fontSize: '0.9rem'
                      }
                    }}
                  >
                    <MenuItem value="all">All Roles</MenuItem>
                    <MenuItem value="member">User</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
                
                {/* Search Box - Longer */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flex: { xs: 1, sm: '1 1 600px' }, // Make the search box much longer on desktop
                    minWidth: { xs: '100%', sm: '350px', md: '500px' },
                    maxWidth: { xs: '100%', md: '900px', lg: '1200px' }, // Allow for a very wide search bar
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    bgcolor: 'rgba(0, 0, 0, 0.03)',
                    flexGrow: 1,
                  }}
                >
                  <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: '1.2rem' }} />
                  <TextField
                    placeholder="Search members by name or email"
                    variant="standard"
                    fullWidth
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    sx={{
                      '& .MuiInput-root': {
                        '&::before, &::after': {
                          display: 'none'
                        }
                      },
                      '& .MuiInputBase-input': {
                        py: 0.5,
                        fontSize: '0.95rem'
                      }
                    }}
                    inputProps={{
                      style: {
                        minWidth: '200px',
                        maxWidth: '1000px',
                        width: '100%',
                        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }
                    }}
                  />
                </Box>
              </Box>
            </Paper>

            {/* Members Count */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Showing {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
            </Typography>

            {/* Members Table */}
            {loading ? (
              <Box display="flex" justifyContent="center" mt={4}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {filteredMembers.length > 0 ? (
                  <TableContainer component={Paper} sx={{ 
                    boxShadow: 'none', 
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.08)',
                    overflow: 'hidden'
                  }}>
                    <Table>
                      <TableHead sx={{ bgcolor: '#f9fafb' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Email</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Role</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Joined</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredMembers.map((member) => (
                          <TableRow key={member.id} hover>
                            <TableCell sx={{ fontWeight: 500, color: theme => theme.palette.primary.main }}>
                              {member.display_name || member.user.username}
                            </TableCell>
                            <TableCell>{member.user.email}</TableCell>
                            <TableCell>
                              <Chip 
                                label={
                                  member.role === 'member' ? 'User' : 
                                  member.role === 'admin' ? 'Admin' : 
                                  member.role
                                } 
                                size="small"
                                sx={{ 
                                  bgcolor: 
                                    member.role === 'member' ? 'rgba(52, 152, 219, 0.1)' : 
                                    member.role === 'admin' ? 'rgba(231, 76, 60, 0.1)' :
                                    'rgba(149, 165, 166, 0.1)',
                                  color:
                                    member.role === 'member' ? 'rgb(52, 152, 219)' : 
                                    member.role === 'admin' ? 'rgb(231, 76, 60)' :
                                    'rgb(149, 165, 166)',
                                  borderRadius: '4px',
                                  fontWeight: 500,
                                  fontSize: '0.7rem',
                                  height: '24px',
                                  textTransform: 'capitalize'
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={member.user.is_active ? <CheckCircleIcon /> : <CancelIcon />}
                                label={member.user.is_active ? 'Active' : 'Inactive'}
                                color={member.user.is_active ? 'success' : 'error'}
                                size="small"
                                variant="filled"
                                onClick={() => handleStatusChangeClick(member.user.id, member.user.is_active)}
                                sx={{ 
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  minWidth: '80px',
                                  bgcolor: member.user.is_active ? '#178a3a' : '#b71c1c',
                                  color: '#ffffff',
                                  '&:hover': {
                                    transform: 'scale(1.08)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                                    filter: 'brightness(0.95)',
                                    bgcolor: member.user.is_active ? '#11682b' : '#7f1818'
                                  },
                                  '& .MuiChip-icon': {
                                    fontSize: '1rem',
                                    marginLeft: '4px'
                                  },
                                  '& .MuiChip-label': {
                                    paddingLeft: '4px',
                                    paddingRight: '8px'
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>{new Date(member.date_joined).toLocaleDateString()}</TableCell>
                            <TableCell align="center">
                              <IconButton 
                                size="small"
                                onClick={(e) => handleMemberActionClick(e, member)}
                              >
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Paper sx={{ p: 4, textAlign: 'center', mt: 2, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <Typography variant="h6" gutterBottom>No members found</Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Add members to your organization to collaborate on projects.
                    </Typography>
                                         <Button 
                       variant="contained" 
                       startIcon={<GroupIcon />} 
                       onClick={handleAddMember}
                       sx={{
                         borderRadius: 8,
                         bgcolor: '#62EF83', 
                         color: '#000000', 
                         textTransform: 'none',
                         fontWeight: 500,
                         boxShadow: 'none',
                         px: 3,
                         py: 1.2,
                         transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                         '&:hover': {
                           bgcolor: '#4FD16C',
                           boxShadow: '0 2px 8px rgba(98, 239, 131, 0.3)'
                         }
                       }}
                     >
                       Add Member
                     </Button>
                  </Paper>
                )}
              </>
            )}
          </>
        )}
      </Box>
      
      {/* Settings Tab */}
      <Box role="tabpanel" hidden={activeTab !== 2}>
        {activeTab === 2 && currentUserRole !== 'admin' && (
          <Paper sx={{ 
            p: 4, 
            textAlign: 'center', 
            mt: 2, 
            borderRadius: 8, 
            border: '1px solid rgba(255, 68, 68, 0.3)',
            bgcolor: 'rgba(255, 68, 68, 0.08)'
          }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'warning.main' }}>
              Access Denied
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Only organization administrators can access the Settings tab.
            </Typography>
          </Paper>
        )}
        {activeTab === 2 && currentUserRole === 'admin' && (
          <>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
              <Typography variant="h4" component="h1" fontWeight="600" my={1.5}>
                {organization?.name || 'Organization'} Settings
              </Typography>
            </Box>
            
                        {/* Organization settings content */}
            <Paper sx={{ 
              p: 4, 
              mb: 4, 
              borderRadius: 3,
              boxShadow: 'none',
              border: '1px solid rgba(0,0,0,0.08)'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight={600}>Organization Information</Typography>
                {!isEditingOrganization && (
                  <Button 
                    variant="outlined" 
                    startIcon={<EditIcon />}
                    onClick={handleEditOrganization}
                    sx={{
                      borderRadius: 8,
                      borderColor: theme.palette.primary.main,
                      color: theme.palette.primary.main,
                      textTransform: 'none',
                      fontWeight: 500,
                      px: 3,
                      py: 1,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        backgroundColor: theme => theme.palette.primary.main,
                        color: '#fff',
                        borderColor: theme => theme.palette.primary.dark,
                      }
                    }}
                  >
                    Edit Organization
                  </Button>
                )}
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={500}>
                  Organization Name
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  value={isEditingOrganization ? orgEditForm.name : (organization?.name || '')}
                  onChange={(e) => isEditingOrganization && setOrgEditForm({ ...orgEditForm, name: e.target.value })}
                  InputProps={{
                    readOnly: !isEditingOrganization,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: isEditingOrganization ? 'white' : '#f8f9fa',
                      borderRadius: 2
                    }
                  }}
                />
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={500}>
                  Description
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                  size="small"
                  value={isEditingOrganization ? orgEditForm.description : (organization?.description || '')}
                  onChange={(e) => isEditingOrganization && setOrgEditForm({ ...orgEditForm, description: e.target.value })}
                  InputProps={{
                    readOnly: !isEditingOrganization,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: isEditingOrganization ? 'white' : '#f8f9fa',
                      borderRadius: 2
                    }
                  }}
                />
              </Box>
              
              {isEditingOrganization && (
                <Box mt={3} sx={{ display: 'flex', gap: 2 }}>
                  <Button 
                    variant="contained" 
                    startIcon={<SaveIcon />}
                    onClick={handleSaveOrganization}
                    sx={{
                      borderRadius: 8,
                      bgcolor: '#62EF83',
                      color: '#000000',
                      textTransform: 'none',
                      fontWeight: 500,
                      px: 3,
                      py: 1,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        bgcolor: '#4FD16C',
                        boxShadow: '0 2px 8px rgba(98, 239, 131, 0.3)'
                      }
                    }}
                  >
                    Save Changes
                  </Button>
                  <Button 
                    variant="outlined" 
                    onClick={handleCancelEditOrganization}
                    sx={{
                      borderRadius: 8,
                      borderColor: 'text.secondary',
                      color: 'text.secondary',
                      textTransform: 'none',
                      fontWeight: 500,
                      px: 3,
                      py: 1,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        borderColor: 'text.primary',
                        color: 'text.primary',
                      }
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </Paper>
            
                        <Paper sx={{ 
              p: 4, 
              borderRadius: 3,
              boxShadow: 'none',
              border: '1px solid rgba(255, 68, 68, 0.3)',
              bgcolor: 'rgba(255, 68, 68, 0.12)'
            }}>
              <Typography variant="h6" gutterBottom fontWeight={600} sx={{ color: 'warning.main' }}>
                Danger Zone
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Permanently delete this organization and all its data. This action cannot be undone.
              </Typography>
              <Box mt={2}>
                <Button 
                  variant="outlined" 
                  color="warning"
                  onClick={handleDeleteOrganization}
                  sx={{
                    borderRadius: 8,
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 3,
                    py: 1,
                    borderColor: 'warning.main',
                    color: 'warning.main',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      borderColor: 'warning.dark',
                      backgroundColor: 'rgba(255, 68, 68, 0.08)',
                    }
                  }}
                >
                  Delete Organization
                </Button>
              </Box>
            </Paper>
          </>
        )}
      </Box>

      {/* New Project Dialog */}
      <Dialog 
        open={openNewProjectDialog} 
        onClose={() => setOpenNewProjectDialog(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" fontWeight={600}>Create New Project</Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 2, pt: 2 }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            Create a new project to organize your findings.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Project Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            sx={{ mb: 3, mt: 2 }}
          />
          <TextField
            margin="dense"
            id="description"
            label="Description (Optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ mr: 0.5 }}>
              Project visibility 
            </Typography>
            <Tooltip
              title={newProject.is_public
                ? "Public projects can be viewed by anyone with the link."
                : "Private projects are only visible to organization members."}
              arrow
              placement="bottom"
              componentsProps={{
                tooltip: {
                  sx: { 
                    whiteSpace: 'nowrap',
                    width: 'fit-content',
                    maxWidth: 'none',
                    minWidth: 'unset',
                    p: 1
                  }
                }
              }}
            >
              <IconButton size="small" sx={{ mr: 0.25, p: 0.25, color: 'text.secondary' }}>
                <HelpOutlineIcon fontSize="inherit" sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Typography variant="body2" sx={{ mr: 2 }}>
              :
            </Typography>
            <FormControl component="fieldset">
              <Select
                value={newProject.is_public ? "public" : "private"}
                onChange={(e) => setNewProject({ ...newProject, is_public: e.target.value === "public" })}
                size="small"
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="private">Private</MenuItem>
                <MenuItem value="public">Public</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
          <Button 
            onClick={() => setOpenNewProjectDialog(false)}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
                     <Button 
             onClick={handleCreateProject} 
             variant="contained"
             disabled={!newProject.name.trim()}
             sx={{ 
               borderRadius: 2,
               bgcolor: '#62EF83',
               color: '#000000',
               textTransform: 'none',
               px: 3,
               transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
               '&.Mui-disabled': {
                 bgcolor: 'rgba(26, 115, 232, 0.5)',
                 color: 'white'
               }
             }}
           >
             Create
           </Button>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog 
        open={openAddMemberDialog} 
        onClose={() => setOpenAddMemberDialog(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" fontWeight={600}>Add Member</Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 2, pt: 2 }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            Add a member to your organization. If the user doesn't exist, a new account will be created and they will receive login credentials via email. If the user already exists, they will be added to this organization.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Full Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            sx={{ mb: 3, mt: 2 }}
          />
          <TextField
            margin="dense"
            id="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            sx={{ mb: 3 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ mr: 2 }}>
              Member role:
            </Typography>
            <FormControl component="fieldset">
              <Select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                size="small"
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="member">User</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Users can create and edit projects, but cannot manage organization settings.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
          <Button 
            onClick={() => setOpenAddMemberDialog(false)}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
                     <Button 
             onClick={handleAddMemberSubmit} 
             variant="contained"
             disabled={!newMemberEmail.trim() || !newMemberName.trim() || isSubmitting}
             sx={{ 
               borderRadius: 2,
               bgcolor: '#62EF83',
               color: '#000000',
               textTransform: 'none',
               px: 3,
               transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
               '&.Mui-disabled': {
                 bgcolor: 'rgba(26, 115, 232, 0.5)',
                 color: 'white'
               }
             }}
           >
             {isSubmitting ? 'Adding...' : 'Add Member'}
           </Button>
        </DialogActions>
      </Dialog>

      {/* Status Change Confirmation Dialog */}
      <Dialog
        open={statusChangeDialogOpen}
        onClose={handleCancelStatusChange}
      >
        <DialogTitle>Confirm Status Change</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to change this user's status to{' '}
            <strong>
              {pendingStatusChange?.newStatus ? 'Active' : 'Inactive'}
            </strong>?
            <br></br>
            {pendingStatusChange?.newStatus 
              ? 'This will allow the user to access the system and perform their assigned tasks.'
              : 'This will prevent the user from accessing the system and performing any actions.'
            }
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelStatusChange}>Cancel</Button>
          <Button 
            onClick={handleConfirmStatusChange} 
            variant="contained"
            sx={{
              backgroundColor: '#d32f2f',
              color: '#fff',
              '&:hover': {
                backgroundColor: '#b71c1c',
                color: '#fff',
              },
            }}
          >
            Confirm Status Change
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog 
        open={editMemberDialogOpen} 
        onClose={() => {
          setEditMemberDialogOpen(false);
          setSelectedMember(null);
          setMemberActionMenuAnchor(null);
        }}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" fontWeight={600}>Edit Member</Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 2, pt: 2 }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            Update the details for {selectedMember?.display_name || selectedMember?.user.username} ({selectedMember?.user.email})
          </Typography>
          
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Name"
            type="text"
            fullWidth
            variant="outlined"
            value={editMemberForm.name}
            onChange={(e) => setEditMemberForm({ ...editMemberForm, name: e.target.value })}
            sx={{ mb: 3, mt: 2 }}
          />
          
          <Box sx={{ mt: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={editMemberForm.role}
                label="Role"
                onChange={(e) => setEditMemberForm({ ...editMemberForm, role: e.target.value })}
              >
                <MenuItem value="member">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
          <Button 
            onClick={() => {
              setEditMemberDialogOpen(false);
              setSelectedMember(null);
              setMemberActionMenuAnchor(null);
            }}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateMember} 
            variant="contained"
            disabled={isEditingMember || !editMemberForm.name.trim()}
            sx={{ 
              borderRadius: 2,
              bgcolor: '#62EF83',
              color: '#000000',
              textTransform: 'none',
              px: 3,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&.Mui-disabled': {
                bgcolor: 'rgba(26, 115, 232, 0.5)',
                color: 'white'
              }
            }}
          >
            {isEditingMember ? 'Updating...' : 'Update Member'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Member Confirmation Dialog */}
      <Dialog
        open={deleteMemberDialogOpen}
        onClose={() => setDeleteMemberDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" fontWeight={600} sx={{ color: '#d32f2f' }}>Remove Member</Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 2, pt: 2 }}>
          <DialogContentText>
            Are you sure you want to remove <strong>{selectedMember?.display_name || selectedMember?.user?.username || 'Unknown User'}</strong> ({selectedMember?.user?.email || 'No email'}) from this organization?
            <br></br>
            This action cannot be undone and the member will lose access to all organization projects.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
          <Button 
            onClick={() => {
              setDeleteMemberDialogOpen(false);
              setSelectedMember(null);
              setMemberActionMenuAnchor(null);
            }}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteMember} 
            variant="contained"
            disabled={isDeletingMember}
            sx={{ 
              borderRadius: 2,
              bgcolor: '#d32f2f',
              color: '#fff',
              textTransform: 'none',
              px: 3,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: '#b71c1c',
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(211, 47, 47, 0.5)',
                color: 'white'
              }
            }}
          >
            {isDeletingMember ? 'Removing...' : 'Remove Member'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog 
        open={editProjectDialogOpen} 
        onClose={() => {
          setEditProjectDialogOpen(false);
          setSelectedProject(null);
        }}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" fontWeight={600}>Edit Project</Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 2, pt: 2 }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            Update the project details
          </Typography>
          
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Project Name"
            type="text"
            fullWidth
            variant="outlined"
            value={editProjectForm.name}
            onChange={(e) => setEditProjectForm({ ...editProjectForm, name: e.target.value })}
            sx={{ mb: 3, mt: 2 }}
          />
          
          <TextField
            margin="dense"
            id="description"
            label="Description (Optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={editProjectForm.description}
            onChange={(e) => setEditProjectForm({ ...editProjectForm, description: e.target.value })}
            sx={{ mb: 3 }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ mr: 0.5 }}>
              Project visibility 
            </Typography>
            <Tooltip
              title={editProjectForm.is_public
                ? "Public projects can be viewed by anyone with the link."
                : "Private projects are only visible to organization members."}
              arrow
              placement="bottom"
              componentsProps={{
                tooltip: {
                  sx: { 
                    whiteSpace: 'nowrap',
                    width: 'fit-content',
                    maxWidth: 'none',
                    minWidth: 'unset',
                    p: 1
                  }
                }
              }}
            >
              <IconButton size="small" sx={{ mr: 0.25, p: 0.25, color: 'text.secondary' }}>
                <HelpOutlineIcon fontSize="inherit" sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Typography variant="body2" sx={{ mr: 2 }}>
              :
            </Typography>
            <FormControl component="fieldset">
              <Select
                value={editProjectForm.is_public ? "public" : "private"}
                onChange={(e) => setEditProjectForm({ ...editProjectForm, is_public: e.target.value === "public" })}
                size="small"
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="private">Private</MenuItem>
                <MenuItem value="public">Public</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
          <Button 
            onClick={() => {
              setEditProjectDialogOpen(false);
              setSelectedProject(null);
            }}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateProject} 
            variant="contained"
            disabled={!editProjectForm.name.trim() || isEditingProject}
            sx={{ 
              borderRadius: 2,
              bgcolor: '#62EF83',
              color: '#000000',
              textTransform: 'none',
              px: 3,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&.Mui-disabled': {
                bgcolor: 'rgba(26, 115, 232, 0.5)',
                color: 'white'
              }
            }}
          >
            {isEditingProject ? 'Updating...' : 'Update Project'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog
        open={deleteProjectDialogOpen}
        onClose={() => setDeleteProjectDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" fontWeight={600} sx={{ color: '#d32f2f' }}>Delete Project</Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 2, pt: 2 }}>
          <DialogContentText>
            Are you sure you want to delete the project <strong>"{selectedProject?.name || 'Unknown Project'}"</strong>?
            <br></br>
            This action cannot be undone and all project data will be permanently lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
          <Button 
            onClick={() => {
              setDeleteProjectDialogOpen(false);
              setSelectedProject(null);
            }}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteProjectConfirm} 
            variant="contained"
            disabled={isDeletingProject}
            sx={{ 
              borderRadius: 2,
              bgcolor: '#d32f2f',
              color: '#fff',
              textTransform: 'none',
              px: 3,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: '#b71c1c',
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(211, 47, 47, 0.5)',
                color: 'white'
              }
            }}
          >
            {isDeletingProject ? 'Deleting...' : 'Delete Project'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Organization Confirmation Dialog */}
      <Dialog
        open={deleteOrgDialogOpen}
        onClose={handleCancelDeleteOrganization}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" fontWeight={600} sx={{ color: '#d32f2f' }}>Delete Organization</Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 2, pt: 2 }}>
          <DialogContentText>
            Are you sure you want to delete the organization <strong>"{organization?.name || 'Unknown Organization'}"</strong>?
            <br></br>
            <br></br>
            This action will:
            <br></br>
            • Permanently delete all projects in this organization
            <br></br>
            • Remove all organization members
            <br></br>
            • Delete all associated data including posts, folders, and reports
            <br></br>
            <br></br>
            <strong>This action cannot be undone.</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
          <Button 
            onClick={handleCancelDeleteOrganization}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteOrganizationConfirm} 
            variant="contained"
            disabled={isDeletingOrganization}
            sx={{ 
              borderRadius: 2,
              bgcolor: '#d32f2f',
              color: '#fff',
              textTransform: 'none',
              px: 3,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: '#b71c1c',
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(211, 47, 47, 0.5)',
                color: 'white'
              }
            }}
          >
            {isDeletingOrganization ? 'Deleting...' : 'Delete Organization'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error message */}
      {error && (
        <Paper sx={{ 
          mt: 3,
          p: 2, 
                     bgcolor: 'rgba(255, 68, 68, 0.05)',
           color: 'warning.main',
           borderRadius: 3,
           border: '1px solid rgba(255, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Typography variant="body2" fontWeight={500}>{error}</Typography>
        </Paper>
      )}

      {/* Success message */}
      {successMessage && (
        <Paper sx={{ 
          mt: 3,
          p: 2, 
          bgcolor: 'rgba(98, 239, 131, 0.1)',
          color: 'success.main',
          borderRadius: 3,
          border: '1px solid rgba(98, 239, 131, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
          <Typography variant="body2" fontWeight={500}>{successMessage}</Typography>
        </Paper>
      )}

      {/* Member Action Menu */}
      <Menu
        anchorEl={memberActionMenuAnchor}
        open={Boolean(memberActionMenuAnchor)}
        onClose={handleMemberActionClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleEditMemberRole}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Users</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleRemoveMember} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <CancelIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Remove from Organization</ListItemText>
        </MenuItem>
      </Menu>

      {/* Project Action Menu */}
      <Menu
        anchorEl={projectActionMenuAnchor}
        open={Boolean(projectActionMenuAnchor)}
        onClose={handleProjectActionClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleEditProject}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Project</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteProject} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <CancelIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete Project</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default OrganizationProjects; 