import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Chip,
  InputAdornment,
  Snackbar,
  Alert,
  Switch,
  FormControlLabel,
  Breadcrumbs,
  Menu,
  Autocomplete,
} from '@mui/material';



import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  SupervisorAccount as AdminIcon,
  CheckCircle as CheckCircleIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  LinkedIn as LinkedInIcon,
  MusicVideo as MusicVideoIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { apiFetch } from '../../utils/api';
import { getCurrentUser } from '../../utils/auth';

interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  company_name?: string | null;
  company_id?: number | null;
  date_joined: string;
  global_role?: {
    role: string;
    role_display: string;
  };
}



interface Company {
  id: number;
  name: string;
  status: string;
  status_display: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface BrightdataConfig {
  id: number;
  name: string;
  platform: string;
  platform_display: string;
  description: string | null;
  dataset_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BrightdataConfigPayload {
  name: string;
  platform: string;
  dataset_id: string;
  description: string;
  is_active: boolean;
  api_token?: string;
}

interface UserUpdateFields {
  username?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
  company_id?: number | null;
}

interface CompanyUpdateFields {
  name?: string;
  status?: string;
  description?: string | null;
}

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [openCompanyDialog, setOpenCompanyDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    role: 'user',
    company_id: null as number | null,
  });

  const [newCompany, setNewCompany] = useState({
    name: '',
    status: 'active',
    description: '',
  });
  const [error, setError] = useState<string | null>(null);
  
  // Scraper configuration dialog state
  const [brightdataDialogOpen, setBrightdataDialogOpen] = useState(false);
  const [brightdataForm, setBrightdataForm] = useState({
    name: '',
    platform: '',
    description: '',
    apiToken: '',
    datasetId: '',
    isActive: true,
  });
  const [brightdataConfigs, setBrightdataConfigs] = useState<BrightdataConfig[]>([]);
  const [brightdataLoading, setBrightdataLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [editConfigId, setEditConfigId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<number | null>(null);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [deleteCompanyDialogOpen, setDeleteCompanyDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<number | null>(null);
  const [editCompanyDialogOpen, setEditCompanyDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [originalCompany, setOriginalCompany] = useState<Company | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [roleMenuAnchor, setRoleMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: number; newRole: string } | null>(null);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ userId: number; newStatus: boolean } | null>(null);
  const [companyStatusChangeDialogOpen, setCompanyStatusChangeDialogOpen] = useState(false);
  const [pendingCompanyStatusChange, setPendingCompanyStatusChange] = useState<{ companyId: number; oldStatus: string; newStatus: string } | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrgs: 0,
    totalProjects: 0,
    totalCompanies: 0,
    superAdmins: 0,
    tenantAdmins: 0,
    regularUsers: 0,
  });

  // User edit state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [editUserForm, setEditUserForm] = useState({
    username: '',
    email: '',
    role: '',
    is_active: true,
    company_id: null as number | null,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch Brightdata configurations when Scrapper Configuration tab is active
  useEffect(() => {
    if (activeTab === 2) {
      fetchBrightdataConfigs();
    }
  }, [activeTab]);

  const fetchBrightdataConfigs = async () => {
    try {
      setBrightdataLoading(true);
      const response = await apiFetch('/api/brightdata/configs/');
      if (!response.ok) {
        throw new Error('Failed to fetch configurations');
      }
      const responseData = await response.json();
      const data = responseData.results || responseData;
      const configsArray = Array.isArray(data) ? data : [];
      setBrightdataConfigs(configsArray);
    } catch (error) {
      console.error('Error fetching scraper configs:', error);
    } finally {
      setBrightdataLoading(false);
    }
  };

  const handleCreateBrightdataConfig = async () => {
    // Validate required fields
    if (!brightdataForm.name || !brightdataForm.platform || !brightdataForm.datasetId) {
      setSuccessMessage('Please fill in all required fields');
      return;
    }

    // For new configurations, API token is required
    if (editConfigId === null && !brightdataForm.apiToken) {
      setSuccessMessage('API token is required for new configurations');
      return;
    }

    // For editing, if API token is provided, validate it's not just whitespace
    if (editConfigId !== null && brightdataForm.apiToken && brightdataForm.apiToken.trim() === '') {
      setSuccessMessage('API token cannot be empty. Leave the field empty to keep existing token.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload: BrightdataConfigPayload = {
        name: brightdataForm.name,
        platform: brightdataForm.platform,
        dataset_id: brightdataForm.datasetId,
        description: brightdataForm.description || '',
        is_active: brightdataForm.isActive,
      };
      
      // Only include API token for new configs or if the user has entered a new one
      if (brightdataForm.apiToken) {
        payload.api_token = brightdataForm.apiToken;
      }
      
      const url = editConfigId !== null 
        ? `/api/brightdata/configs/${editConfigId}/` 
        : '/api/brightdata/configs/';
      
      const method = editConfigId !== null ? 'PATCH' : 'POST';
      
      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }

      setSuccessMessage(editConfigId !== null ? 'Configuration updated successfully!' : 'Configuration created successfully!');
      setBrightdataDialogOpen(false);
      setBrightdataForm({ name: '', platform: '', description: '', apiToken: '', datasetId: '', isActive: true });
      setEditConfigId(null);
      fetchBrightdataConfigs(); // Refresh the list
    } catch (error: unknown) {
      console.error('Error saving config:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error saving configuration. Please try again.';
      setSuccessMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditConfig = (config: BrightdataConfig) => {
    setEditConfigId(config.id);
    setBrightdataForm({
      name: config.name,
      platform: config.platform,
      description: config.description || '',
      apiToken: '', // Don't set API token for security
      datasetId: config.dataset_id,
      isActive: config.is_active,
    });
    setBrightdataDialogOpen(true);
  };

  const handleDeleteClick = (configId: number) => {
    setConfigToDelete(configId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (configToDelete === null) return;
    
    try {
      setBrightdataLoading(true);
      const response = await apiFetch(`/api/brightdata/configs/${configToDelete}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete configuration');
      }

      setSuccessMessage('Configuration deleted successfully');
      fetchBrightdataConfigs();
    } catch (error) {
      console.error('Error deleting config:', error);
      setSuccessMessage('Failed to delete configuration');
    } finally {
      setBrightdataLoading(false);
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setConfigToDelete(null);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchUsers(),
        fetchCompanies(),
        fetchStats(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiFetch('/api/admin/users/');
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : data.results || []);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users.');
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await apiFetch('/api/admin/companies/');
      if (response.ok) {
        const data = await response.json();
        setCompanies(Array.isArray(data) ? data : data.results || []);
      } else {
        throw new Error('Failed to fetch companies');
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      setError('Failed to load companies.');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiFetch('/api/admin/stats/');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        throw new Error('Failed to fetch stats');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };



  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCreateUser = async () => {
    try {
      setIsCreatingUser(true);
      setError(null);
      
      // Validate required fields
      if (!newUser.username || !newUser.email) {
        setError('Username and email are required');
        return;
      }

      // Validate company selection for non-super admin users
      if (newUser.role !== 'super_admin' && !newUser.company_id) {
        setError('Company is required for non-super admin users');
        return;
      }

      const response = await apiFetch('/api/admin/users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle different types of error responses
        let errorMessage = 'Failed to create user';
        
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors.join(', ');
        } else if (typeof errorData === 'object') {
          // Handle field-specific validation errors
          const fieldErrors = Object.entries(errorData)
            .map(([field, errors]) => {
              if (Array.isArray(errors)) {
                return `${field}: ${errors.join(', ')}`;
              }
              return `${field}: ${errors}`;
            })
            .join('; ');
          
          if (fieldErrors) {
            errorMessage = fieldErrors;
          }
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setOpenUserDialog(false);
      fetchUsers();
      fetchStats(); // Refresh stats after creating user
      resetNewUser();
      
      // Show success message
      setSuccessMessage(result.message || 'User created successfully. Welcome email sent.');
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleCreateCompany = async () => {
    try {
      setIsCreatingCompany(true);
      setError(null);
      
      const response = await apiFetch('/api/admin/companies/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCompany),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle different types of error responses
        let errorMessage = 'Failed to create company';
        
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors.join(', ');
        } else if (typeof errorData === 'object') {
          // Handle field-specific validation errors
          const fieldErrors = Object.entries(errorData)
            .map(([field, errors]) => {
              if (Array.isArray(errors)) {
                return `${field}: ${errors.join(', ')}`;
              }
              return `${field}: ${errors}`;
            })
            .join('; ');
          
          if (fieldErrors) {
            errorMessage = fieldErrors;
          }
        }
        
        throw new Error(errorMessage);
      }

      setOpenCompanyDialog(false);
      fetchCompanies();
      fetchStats(); // Refresh stats after creating company
      setNewCompany({
        name: '',
        status: 'active',
        description: '',
      });
      setSuccessMessage('Company created successfully!');
    } catch (error) {
      console.error('Error creating company:', error);
      setError(error instanceof Error ? error.message : 'Failed to create company');
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const handleChangeUserRole = async (userId: number, newRole: string) => {
    try {
      const response = await apiFetch(`/api/admin/users/${userId}/role/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      // Get the updated user data from the response
      const updatedUser = await response.json();
      
      // Update the user in the local state with the complete updated data
      setUsers(users.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              username: updatedUser.username,
              email: updatedUser.email,
              is_active: updatedUser.is_active,
              // Use the company info from the response (could be null if user has no company)
              company_name: updatedUser.company_name,
              company_id: updatedUser.company_id,
              date_joined: updatedUser.date_joined,
              global_role: updatedUser.global_role
            }
          : user
      ));

      setSuccessMessage('User role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
      setError('Failed to update user role');
    }
  };

  const handleDeleteUserClick = (userId: number) => {
    setUserToDelete(userId);
    setDeleteUserDialogOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (userToDelete === null) return;
    
    try {
      const response = await apiFetch(`/api/admin/users/${userToDelete}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      fetchUsers();
      fetchStats(); // Refresh stats after deleting user
      setSuccessMessage('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setDeleteUserDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleCancelDeleteUser = () => {
    setDeleteUserDialogOpen(false);
    setUserToDelete(null);
  };

  const handleDeleteCompanyClick = (companyId: number) => {
    setCompanyToDelete(companyId);
    setDeleteCompanyDialogOpen(true);
  };

  const handleConfirmDeleteCompany = async () => {
    if (companyToDelete === null) return;
    
    try {
      const response = await apiFetch(`/api/admin/companies/${companyToDelete}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete company');
      }

      fetchCompanies();
      fetchStats(); // Refresh stats after deleting company
      setSuccessMessage('Company deleted successfully');
    } catch (error) {
      console.error('Error deleting company:', error);
      setError('Failed to delete company');
    } finally {
      setDeleteCompanyDialogOpen(false);
      setCompanyToDelete(null);
    }
  };

  const handleCancelDeleteCompany = () => {
    setDeleteCompanyDialogOpen(false);
    setCompanyToDelete(null);
  };

  const handleEditCompanyClick = (company: Company) => {
    setEditingCompany(company);
    setOriginalCompany(company);
    setEditCompanyDialogOpen(true);
  };

  const handleUpdateCompany = async () => {
    if (!editingCompany || !originalCompany) return;

    // Check if status has changed
    if (editingCompany.status !== originalCompany.status) {
      // Show confirmation dialog for status change
      setPendingCompanyStatusChange({ 
        companyId: editingCompany.id, 
        oldStatus: originalCompany.status, 
        newStatus: editingCompany.status 
      });
      setCompanyStatusChangeDialogOpen(true);
      return;
    }

    // If no status change, proceed with normal update
    await performCompanyUpdate();
  };

  const performCompanyUpdate = async () => {
    if (!editingCompany || !originalCompany) return;

    // Create an object with only the fields that have changed
    const changedFields: CompanyUpdateFields = {};
    
    // Compare each field with the original company data
    if (editingCompany.name !== originalCompany.name) {
      changedFields.name = editingCompany.name;
    }
    
    if (editingCompany.status !== originalCompany.status) {
      changedFields.status = editingCompany.status;
    }
    
    if (editingCompany.description !== originalCompany.description) {
      changedFields.description = editingCompany.description;
    }

    // If no fields have changed, show a message and return early
    if (Object.keys(changedFields).length === 0) {
      setSuccessMessage('No changes detected');
      return;
    }

    try {
      const response = await apiFetch(`/api/admin/companies/${editingCompany.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changedFields),
      });

      if (!response.ok) {
        throw new Error('Failed to update company');
      }

      // Get the updated company data from the response
      const updatedCompany = await response.json();

      // Update the company in the local state with the response data
      setCompanies(prevCompanies => 
        prevCompanies.map(company => 
          company.id === editingCompany.id 
            ? { ...company, ...updatedCompany }
            : company
        )
      );

      setEditCompanyDialogOpen(false);
      setEditingCompany(null);
      setOriginalCompany(null);
      setSuccessMessage('Company updated successfully');
    } catch (error) {
      console.error('Error updating company:', error);
      setError('Failed to update company');
    }
  };

  const handleCancelEditCompany = () => {
    setEditCompanyDialogOpen(false);
    setEditingCompany(null);
    setOriginalCompany(null);
  };

  const handleConfirmRoleChange = async () => {
    if (pendingRoleChange) {
      const currentUser = getCurrentUser();
      
      // Check if the user is trying to change their own role
      if (currentUser && currentUser.id === pendingRoleChange.userId) {
        setError('You cannot change your own role.');
        setRoleChangeDialogOpen(false);
        setPendingRoleChange(null);
        return;
      }
      
      try {
        // Use the role-specific endpoint for all role changes
        await handleChangeUserRole(pendingRoleChange.userId, pendingRoleChange.newRole);
        
        setRoleChangeDialogOpen(false);
        setPendingRoleChange(null);
      } catch (error) {
        console.error('Error updating user role:', error);
        setError('Failed to update user role');
      }
    }
  };

  const handleCancelRoleChange = () => {
    setRoleChangeDialogOpen(false);
    setPendingRoleChange(null);
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
        throw new Error('Failed to update user status');
      }

      // Get the updated user data from the response
      const updatedUser = await response.json();
      console.log('Status update response:', updatedUser); // Debug log
      
      // Update the user in the local state with the complete updated data
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { 
                ...user, 
                username: updatedUser.username,
                email: updatedUser.email,
                is_active: updatedUser.is_active,
                // Use the company info from the response (could be null if user has no company)
                company_name: updatedUser.company_name,
                company_id: updatedUser.company_id,
                date_joined: updatedUser.date_joined,
                global_role: updatedUser.global_role
              }
            : user
        )
      );

      setSuccessMessage(`User status updated successfully to ${newStatus ? 'Active' : 'Inactive'}`);
    } catch (error) {
      console.error('Error updating user status:', error);
      setError('Failed to update user status');
    }
  };

  const handleStatusChangeClick = (userId: number, currentStatus: boolean) => {
    setPendingStatusChange({ userId, newStatus: !currentStatus });
    setStatusChangeDialogOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (pendingStatusChange) {
      const currentUser = getCurrentUser();
      
      // Check if the user is trying to change their own status
      if (currentUser && currentUser.id === pendingStatusChange.userId) {
        setError('You cannot change your own status.');
        setStatusChangeDialogOpen(false);
        setPendingStatusChange(null);
        return;
      }
      
      await handleChangeUserStatus(pendingStatusChange.userId, pendingStatusChange.newStatus);
      setStatusChangeDialogOpen(false);
      setPendingStatusChange(null);
    }
  };

  const handleCancelStatusChange = () => {
    setStatusChangeDialogOpen(false);
    setPendingStatusChange(null);
  };



  const handleConfirmCompanyStatusChange = async () => {
    if (pendingCompanyStatusChange && editingCompany) {
      // Update the editing company with the new status
      setEditingCompany({ ...editingCompany, status: pendingCompanyStatusChange.newStatus });
      setCompanyStatusChangeDialogOpen(false);
      setPendingCompanyStatusChange(null);
      // Perform the actual update
      await performCompanyUpdate();
    }
  };

  const handleCancelCompanyStatusChange = () => {
    setCompanyStatusChangeDialogOpen(false);
    setPendingCompanyStatusChange(null);
  };

  const resetNewUser = () => {
    setNewUser({
      username: '',
      email: '',
      role: 'user',
      company_id: null,
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(search.toLowerCase()) ||
                         user.email.toLowerCase().includes(search.toLowerCase()) ||
                         (user.company_name && user.company_name.toLowerCase().includes(search.toLowerCase()));
    
    const matchesRoleFilter = roleFilter === 'all' || 
                             user.global_role?.role === roleFilter;
    
    return matchesSearch && matchesRoleFilter;
  });

  const filteredCompanies = companies.filter(company => 
    company.name.toLowerCase().includes(search.toLowerCase()) ||
    (company.description && company.description.toLowerCase().includes(search.toLowerCase()))
  );

  const getRoleChip = (role: string | undefined, userId: number) => {
    if (!role) return null;
    
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      setRoleMenuAnchor(event.currentTarget);
      setSelectedUserId(userId);
    };
    
    const handleClose = () => {
      setRoleMenuAnchor(null);
      setSelectedUserId(null);
    };
    
    const handleRoleChange = (newRole: string) => {
      if (selectedUserId) {
        // If changing to super_admin, check if user is already in Future Objects company
        if (newRole === 'super_admin') {
          const futureObjectsCompany = companies.find(company => 
            company.name.toLowerCase() === 'future objects' && company.status === 'active'
          );
          
          if (!futureObjectsCompany) {
            setError('Future Objects company not found. Please create the Future Objects company first.');
            handleClose();
            return;
          }
          
          // Find the current user to check their company
          const currentUser = users.find(user => user.id === selectedUserId);
          if (currentUser && currentUser.company_id !== futureObjectsCompany.id) {
            // User is not in Future Objects company, show warning and require company change first
            setError('To assign Super Admin role, the user must first be assigned to the Future Objects company. Please change the user\'s company to Future Objects first, then change the role.');
            handleClose();
            return;
          }
          
          // User is already in Future Objects company, proceed with role change
          setPendingRoleChange({ 
            userId: selectedUserId, 
            newRole
          });
        } else {
          // For other role changes, just update the role
          setPendingRoleChange({ userId: selectedUserId, newRole });
        }
        setRoleChangeDialogOpen(true);
      }
      handleClose();
    };
    
    const getRoleConfig = (roleType: string) => {
      switch (roleType) {
        case 'super_admin':
          return { icon: <AdminIcon />, label: "Super Admin", color: "primary" as const };
        case 'tenant_admin':
          return { icon: <BusinessIcon />, label: "Tenant Admin", color: "secondary" as const };
        case 'user':
          return { icon: <PersonIcon />, label: "User", color: "default" as const };
        default:
          return { icon: <PersonIcon />, label: roleType, color: "default" as const };
      }
    };
    
    const roleConfig = getRoleConfig(role);
    const open = Boolean(roleMenuAnchor) && selectedUserId === userId;
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Chip 
          icon={roleConfig.icon} 
          label={roleConfig.label} 
          color={roleConfig.color} 
          size="small"
          onClick={handleClick}
          sx={{ 
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: 2
            }
          }}
        />
        <Menu
          anchorEl={roleMenuAnchor}
          open={open}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          sx={{
            '& .MuiPaper-root': {
              minWidth: '120px',
              maxWidth: '150px',
            },
            '& .MuiMenuItem-root': {
              fontSize: '0.875rem',
              padding: '6px 12px',
              minHeight: '32px',
            },
            '& .MuiSvgIcon-root': {
              fontSize: '1rem',
            }
          }}
        >
          <MenuItem
            onClick={() => handleRoleChange('super_admin')}
            sx={{
              color: '#7b1fa2',
              '&:hover': {
                backgroundColor: '#f3e5f5',
                color: '#4a148c'
              }
            }}
          >
            <AdminIcon sx={{ mr: 1, fontSize: '1rem', color: '#7b1fa2' }} />
            Super Admin
          </MenuItem>
          <MenuItem
            onClick={() => handleRoleChange('tenant_admin')}
            sx={{
              color: '#1565c0',
              '&:hover': {
                backgroundColor: '#e3f2fd',
                color: '#0d47a1'
              }
            }}
          >
            <BusinessIcon sx={{ mr: 1, fontSize: '1rem', color: '#1565c0' }} />
            Tenant Admin
          </MenuItem>
          <MenuItem
            onClick={() => handleRoleChange('user')}
            sx={{
              color: '#424242',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                color: '#212121'
              }
            }}
          >
            <PersonIcon sx={{ mr: 1, fontSize: '1rem', color: '#424242' }} />
            User
          </MenuItem>
        </Menu>
      </Box>
    );
  };

  const handleEditUserClick = (user: User) => {
    setEditingUser(user);
    setEditUserForm({
      username: user.username,
      email: user.email,
      role: user.global_role?.role || '',
      is_active: user.is_active,
      company_id: user.company_id || null,
    });
    setEditUserDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    // Create an object with only the fields that have changed
    const changedFields: UserUpdateFields = {};
    
    // Compare each field with the original user data
    if (editUserForm.username !== editingUser.username) {
      changedFields.username = editUserForm.username;
    }
    
    if (editUserForm.email !== editingUser.email) {
      changedFields.email = editUserForm.email;
    }
    
    if (editUserForm.role !== (editingUser.global_role?.role || '')) {
      changedFields.role = editUserForm.role;
    }
    
    if (editUserForm.is_active !== editingUser.is_active) {
      changedFields.is_active = editUserForm.is_active;
    }
    
    if (editUserForm.company_id !== editingUser.company_id) {
      changedFields.company_id = editUserForm.company_id;
    }

    // If no fields have changed, show a message and return early
    if (Object.keys(changedFields).length === 0) {
      setSuccessMessage('No changes detected');
      return;
    }

    try {
      const response = await apiFetch(`/api/admin/users/${editingUser.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changedFields),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        
        // Update the user in the local state with all the updated information
        setUsers(users.map(user => 
          user.id === editingUser.id 
            ? { 
                ...user, 
                username: updatedUser.username,
                email: updatedUser.email,
                is_active: updatedUser.is_active,
                company_name: updatedUser.company_name,
                company_id: updatedUser.company_id,
                date_joined: updatedUser.date_joined,
                global_role: updatedUser.global_role
              }
            : user
        ));

        setEditUserDialogOpen(false);
        setEditingUser(null);
        setEditUserForm({ username: '', email: '', role: '', is_active: true, company_id: null });
        setSuccessMessage('User updated successfully');
      } else {
        const errorData = await response.json();
        let errorMessage = 'Failed to update user';
        
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors.join(', ');
        } else {
          // Check for field-specific errors
          const fieldErrors = Object.entries(errorData)
            .filter(([key]) => key !== 'detail' && key !== 'error' && key !== 'message')
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join(', ');
          
          if (fieldErrors) {
            errorMessage = fieldErrors;
          }
        }
        
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Failed to update user');
    }
  };

  const handleCancelEditUser = () => {
    setEditUserDialogOpen(false);
    setEditingUser(null);
    setEditUserForm({ username: '', email: '', role: '', is_active: true, company_id: null });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
      width: '100%',
      padding: '16px 32px',
      bgcolor: '#f5f5f5',
      minHeight: 'calc(100vh - 56px)',
    }}>
      {/* Breadcrumbs */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Typography color="text.primary">Dashboard</Typography>
        </Breadcrumbs>
      </Box>

      {/* Header and actions */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h3" component="h1" fontWeight="500">
          Super Admin Dashboard
        </Typography>
        <Box sx={{ width: 200 }} />
      </Box>

      {/* Stats Cards */}
      <Box sx={{ mb: 4, width: '100%', overflow: 'hidden' }}>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: 3, 
          width: '100%' 
        }}>
          <Card sx={{ height: '100%', overflow: 'hidden', width: '100%', minWidth: '260px' }}>
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 }, height: '100%' }}>
              <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                Total Company
              </Typography>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                  fontWeight: 600,
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {stats.totalCompanies}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ height: '100%', overflow: 'hidden', width: '100%', minWidth: '260px' }}>
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 }, height: '100%' }}>
              <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                Total Users
              </Typography>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                  fontWeight: 600,
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {stats.totalUsers}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ height: '100%', overflow: 'hidden', width: '100%', minWidth: '260px' }}>
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 }, height: '100%' }}>
              <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                Projects
              </Typography>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                  fontWeight: 600,
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {stats.totalProjects}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ height: '100%', overflow: 'hidden', width: '100%', minWidth: '260px' }}>
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 }, height: '100%' }}>
              <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                User Distribution
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <AdminIcon color="primary" sx={{ mr: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  Super Admins: {stats.superAdmins}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <BusinessIcon color="secondary" sx={{ mr: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  Tenant Admins: {stats.tenantAdmins}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <PersonIcon sx={{ mr: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  Users: {stats.regularUsers}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} centered>
          <Tab label="Company" />
          <Tab label="Users" />
          <Tab label="Scraper Configuration" />
          <Tab label="System Settings" />
        </Tabs>
      </Paper>

      {/* Search and Add Button - Only for Companies and Users tabs */}
      {(activeTab === 0 || activeTab === 1) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {activeTab === 1 && (
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Filter by Role</InputLabel>
                <Select
                  value={roleFilter}
                  label="Filter by Role"
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <MenuItem value="all">All Roles</MenuItem>
                  <MenuItem value="super_admin">Super Admin</MenuItem>
                  <MenuItem value="tenant_admin">Tenant Admin</MenuItem>
                  <MenuItem value="user">User</MenuItem>
                </Select>
              </FormControl>
            )}
            <TextField
              placeholder="Search..."
              variant="outlined"
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          {activeTab === 0 && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCompanyDialog(true)}
            >
              Add Company
            </Button>
          )}
          {activeTab === 1 && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
              setOpenUserDialog(true);
              resetNewUser(); // Generate random password when opening dialog
            }}
            >
              Add User
            </Button>
          )}
        </Box>
      )}



      {/* Company Tab */}
      {activeTab === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>{company.id}</TableCell>
                    <TableCell>{company.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={company.status_display}
                        color={company.status === 'active' ? 'success' : company.status === 'inactive' ? 'default' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {company.description ? (
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {company.description}
                        </Typography>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{new Date(company.created_at).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleEditCompanyClick(company)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        sx={{ 
                          color: '#d32f2f',
                          '&:hover': {
                            backgroundColor: '#f44336',
                            color: 'white'
                          }
                        }}
                        onClick={() => handleDeleteCompanyClick(company.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No companies found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Users Tab */}
      {activeTab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.company_name || '-'}</TableCell>
                    <TableCell>
                      {getRoleChip(user.global_role?.role, user.id)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={user.is_active ? <CheckCircleIcon /> : <CancelIcon />}
                        label={user.is_active ? 'Active' : 'Inactive'}
                        color={user.is_active ? 'success' : 'error'}
                        size="small"
                        variant="filled"
                        onClick={() => handleStatusChangeClick(user.id, user.is_active)}
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          fontWeight: 400,
                          fontSize: '0.75rem',
                          minWidth: '80px',
                          backgroundColor: user.is_active ? '#219653' : '#d32f2f', // lighter dark green or dark red
                          color: '#fff',
                          '&:hover': {
                            transform: 'scale(1.08)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            filter: 'brightness(1.1)',
                            backgroundColor: user.is_active
                              ? '#17643a' // darker green on hover
                              : '#b71c1c', // darker red on hover for inactive
                          },
                          '& .MuiChip-icon': {
                            fontSize: '0.85rem',
                            marginLeft: '4px'
                          },
                          '& .MuiChip-label': {
                            paddingLeft: '4px',
                            paddingRight: '8px'
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>{new Date(user.date_joined).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleEditUserClick(user)}
                        sx={{ mr: 1 }}
                        title="Edit user"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        sx={{ 
                          color: '#d32f2f',
                          '&:hover': {
                            backgroundColor: '#f44336',
                            color: 'white'
                          }
                        }}
                        onClick={() => handleDeleteUserClick(user.id)}
                        size="small"
                        title="Delete user"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Scraper Configuration Tab */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h4" gutterBottom component="h1">
            Scraper Configuration
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 3 }}>
            Manage your platform-specific scraper configurations for automated data scraping. Each platform and service requires its own configuration with a unique dataset ID.
          </Typography>

          {/* Platform Overview Cards */}
          <Card sx={{ 
            mb: 4, 
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            border: '1px solid #dee2e6',
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: '#495057' }}>
                Platform-Specific Configurations
              </Typography>
              <Typography variant="body1" sx={{ mb: 3, color: '#6c757d', lineHeight: 1.6 }}>
                The automated batch scraper requires separate Scraper configurations for each social media platform. 
                Each platform uses different dataset structures and may require different API tokens.
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
                {[
                  { value: 'facebook_posts', label: 'Facebook Posts', icon: <FacebookIcon />, color: '#1877F2', description: 'Scrape Facebook posts and content' },
                  { value: 'facebook_reels', label: 'Facebook Reels', icon: <FacebookIcon />, color: '#1877F2', description: 'Collect Facebook video content' },
                  { value: 'facebook_comments', label: 'Facebook Comments', icon: <FacebookIcon />, color: '#1877F2', description: 'Extract comment data from posts' },
                  { value: 'instagram_posts', label: 'Instagram Posts', icon: <InstagramIcon />, color: '#E4405F', description: 'Scrape Instagram posts and images' },
                  { value: 'instagram_reels', label: 'Instagram Reels', icon: <InstagramIcon />, color: '#E4405F', description: 'Collect Instagram video content' },
                  { value: 'instagram_comments', label: 'Instagram Comments', icon: <InstagramIcon />, color: '#E4405F', description: 'Extract comment data from posts' },
                  { value: 'linkedin_posts', label: 'LinkedIn Posts', icon: <LinkedInIcon />, color: '#0A66C2', description: 'Scrape LinkedIn posts and articles' },
                  { value: 'tiktok_posts', label: 'TikTok Posts', icon: <MusicVideoIcon />, color: '#000000', description: 'Collect TikTok video content' },
                  { value: 'linkedin_posts', label: 'LinkedIn Posts', icon: <LinkedInIcon />, color: '#0A66C2', description: 'Scrape LinkedIn posts and articles' },
                  { value: 'tiktok_posts', label: 'TikTok Posts', icon: <MusicVideoIcon />, color: '#000000', description: 'Collect TikTok video content' },
                ].map((platform) => {
                  const hasConfig = brightdataConfigs.some(c => c.platform === platform.value);
                  return (
                    <Paper
                      key={platform.value}
                      elevation={hasConfig ? 3 : 1}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: hasConfig ? `2px solid #28a745` : '1px solid #dee2e6',
                        background: hasConfig ? 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)' : 'white',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: hasConfig ? '0 8px 25px rgba(40, 167, 69, 0.2)' : '0 6px 20px rgba(0,0,0,0.1)'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: platform.color,
                            color: 'white',
                            mr: 2,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                          }}
                        >
                          {platform.icon}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: '#495057' }}>
                            {platform.label}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6c757d', fontSize: '0.875rem' }}>
                            {platform.description}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {hasConfig ? (
                            <Chip
                              label="Configured"
                              size="small"
                              color="success"
                              sx={{ 
                                fontWeight: 600,
                                '& .MuiChip-label': { px: 1.5 }
                              }}
                            />
                          ) : (
                            <Chip
                              label="Not Configured"
                              size="small"
                              variant="outlined"
                              sx={{ 
                                fontWeight: 500,
                                color: '#6c757d',
                                borderColor: '#dee2e6',
                                '& .MuiChip-label': { px: 1.5 }
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          {/* Configurations Table */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  API Configurations
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />} 
                  onClick={() => {
                    setEditConfigId(null);
                    setBrightdataForm({ name: '', platform: '', description: '', apiToken: '', datasetId: '', isActive: true });
                    setBrightdataDialogOpen(true);
                  }}
                >
                  Add New Configuration
                </Button>
              </Box>

              {brightdataLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Status</TableCell>
                        <TableCell>Platform</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Dataset ID</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Updated</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {brightdataConfigs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            No configurations found. Click "Add New Configuration" to create one.
                          </TableCell>
                        </TableRow>
                      ) : (
                        brightdataConfigs.map((config) => (
                          <TableRow key={config.id}>
                            <TableCell>
                              <Chip
                                label={config.is_active ? "Active" : "Inactive"}
                                color={config.is_active ? "success" : "default"}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {config.platform === 'linkedin_posts' && <LinkedInIcon />}
                                {config.platform === 'tiktok_posts' && <MusicVideoIcon />}
                                {config.platform === 'linkedin_posts' && <LinkedInIcon />}
                                {config.platform === 'tiktok_posts' && <MusicVideoIcon />}
                                {config.platform.includes('instagram') && <InstagramIcon />}
                                {config.platform.includes('facebook') && <FacebookIcon />}
                                <Typography sx={{ ml: 1 }}>
                                  {config.platform_display || config.platform}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>{config.name}</TableCell>
                            <TableCell>{config.dataset_id}</TableCell>
                            <TableCell>{new Date(config.created_at).toLocaleString()}</TableCell>
                            <TableCell>{new Date(config.updated_at).toLocaleString()}</TableCell>
                            <TableCell>
                              <IconButton size="small" onClick={() => handleEditConfig(config)}>
                                <EditIcon />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                sx={{ 
                                  color: '#d32f2f',
                                  '&:hover': {
                                    backgroundColor: '#f44336',
                                    color: 'white'
                                  }
                                }}
                                onClick={() => handleDeleteClick(config.id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* System Settings Tab */}
      {activeTab === 3 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>System Settings</Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            This section is under development. It will include settings for:
          </Typography>
          <ul>
            <li>Email configuration</li>
            <li>Storage settings</li>
            <li>Security policies</li>
            <li>API rate limits</li>
            <li>Backup and maintenance</li>
          </ul>
        </Paper>
      )}

             {/* Create User Dialog */}
       <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)} maxWidth="sm" fullWidth>
         <DialogTitle>Create New User</DialogTitle>
         <DialogContent>
           <DialogContentText sx={{ mb: 2 }}>
             Enter the user's information below. A secure password will be automatically generated and sent to their email address.
           </DialogContentText>
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            required
          />
                       <TextField
               label="Email"
               type="email"
               fullWidth
               margin="normal"
               value={newUser.email}
               onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
               required
             />
             
                            <Autocomplete
                 options={companies.filter(company => company.status === 'active')}
                 getOptionLabel={(option) => option.name}
                 value={companies.find(company => company.id === newUser.company_id) || null}
                 onChange={(event, newValue) => {
                   setNewUser({
                     ...newUser,
                     company_id: newValue ? newValue.id : null
                   });
                 }}
                 renderInput={(params) => (
                   <TextField
                     {...params}
                     label="Company"
                     margin="normal"
                     fullWidth
                     required
                                      disabled={newUser.role === 'super_admin'}
                 helperText={newUser.role === 'super_admin' ? 'Super admins are automatically assigned to Future Objects company' : ''}
                   />
                 )}
                 filterOptions={(options, { inputValue }) => {
                   return options.filter(option =>
                     option.name.toLowerCase().includes(inputValue.toLowerCase())
                   );
                 }}
                 isOptionEqualToValue={(option, value) => option.id === value.id}
                 noOptionsText="no companies found"
                 disabled={newUser.role === 'super_admin'}
               />

          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select
              value={newUser.role}
              label="Role"
              onChange={(e) => {
                const newRole = e.target.value;
                
                // If changing to super_admin, check if Future Objects company is selected
                if (newRole === 'super_admin') {
                  const futureObjectsCompany = companies.find(company => 
                    company.name.toLowerCase() === 'future objects' && company.status === 'active'
                  );
                  if (!futureObjectsCompany) {
                    setError('Future Objects company not found. Please create the Future Objects company first.');
                    return;
                  }
                  if (newUser.company_id !== futureObjectsCompany.id) {
                    setError('To assign Super Admin role, the user must be assigned to the Future Objects company. Please select Future Objects as the company first.');
                    return;
                  }
                }
                
                setNewUser({ 
                  ...newUser, 
                  role: newRole
                });
              }}
            >
              <MenuItem value="super_admin">Super Admin</MenuItem>
              <MenuItem value="tenant_admin">Tenant Admin</MenuItem>
              <MenuItem value="user">User</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenUserDialog(false);
          }} disabled={isCreatingUser}>Cancel</Button>
          <Button 
            onClick={handleCreateUser} 
            variant="contained" 
            color="primary"
            disabled={isCreatingUser}
            startIcon={isCreatingUser ? <CircularProgress size={20} /> : null}
          >
            {isCreatingUser ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Company Dialog */}
      <Dialog open={openCompanyDialog} onClose={() => setOpenCompanyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Company</DialogTitle>
        <DialogContent>
          <TextField
            label="Company Name"
            fullWidth
            margin="normal"
            value={newCompany.name}
            onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
            required
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
                    <Select
          value={newCompany.status}
          label="Status"
          onChange={(e) => setNewCompany({ ...newCompany, status: e.target.value })}
        >
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </Select>
          </FormControl>
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={newCompany.description}
            onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCompanyDialog(false)} disabled={isCreatingCompany}>Cancel</Button>
          <Button 
            onClick={handleCreateCompany} 
            variant="contained" 
            color="primary"
            disabled={isCreatingCompany}
            startIcon={isCreatingCompany ? <CircularProgress size={20} /> : null}
          >
            {isCreatingCompany ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog open={editCompanyDialogOpen} onClose={handleCancelEditCompany} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Company</DialogTitle>
        <DialogContent>
          <TextField
            label="Company Name"
            fullWidth
            margin="normal"
            value={editingCompany?.name || ''}
            onChange={(e) => setEditingCompany(editingCompany ? { ...editingCompany, name: e.target.value } : null)}
            required
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              value={editingCompany?.status || 'active'}
              label="Status"
              onChange={(e) => setEditingCompany(editingCompany ? { ...editingCompany, status: e.target.value } : null)}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={editingCompany?.description || ''}
            onChange={(e) => setEditingCompany(editingCompany ? { ...editingCompany, description: e.target.value } : null)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEditCompany}>Cancel</Button>
          <Button onClick={handleUpdateCompany} variant="contained" color="primary">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Scraper Configuration Dialog */}
      <Dialog open={brightdataDialogOpen} onClose={() => setBrightdataDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editConfigId !== null ? 'Edit Configuration' : 'Add New Scraper Configuration'}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {editConfigId !== null 
              ? 'Edit your Scraper configuration. API tokens are securely stored and will not be displayed.'
              : 'Create a new Scraper configuration for data scraping. API tokens are securely stored and encrypted.'
            }
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Configuration Name"
            fullWidth
            value={brightdataForm.name}
            onChange={(e) => setBrightdataForm({ ...brightdataForm, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            value={brightdataForm.description}
            onChange={(e) => setBrightdataForm({ ...brightdataForm, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Platform</InputLabel>
            <Select
              value={brightdataForm.platform}
              onChange={(e) => {
                const selectedPlatform = e.target.value;
                let datasetId = '';
                
                // Set dataset ID based on platform selection
                switch (selectedPlatform) {
                  case 'linkedin_posts':
                    datasetId = 'gd_lyy3tktm25m4avu764';
                    break;
                  case 'tiktok_posts':
                    datasetId = 'gd_lu702nij2f790tmv9h';
                    break;
                  case 'instagram_posts':
                    datasetId = 'gd_lk5ns7kz21pck8jpis';
                    break;
                  case 'instagram_reels':
                    datasetId = 'gd_lyclm20il4r5helnj';
                    break;
                  case 'instagram_comments':
                    datasetId = 'gd_ltppn085pokosxh13';
                    break;
                  case 'facebook_comments':
                    datasetId = 'gd_lkay758p1eanlolqw8';
                    break;
                  case 'facebook_reels':
                    datasetId = 'gd_lyclm3ey2q6rww027t';
                    break;
                  case 'facebook_posts':
                    datasetId = 'gd_lkaxegm826bjpoo9m5';
                    break;
                  default:
                    datasetId = '';
                }
                
                setBrightdataForm({ 
                  ...brightdataForm, 
                  platform: selectedPlatform,
                  datasetId: datasetId
                });
              }}
              label="Platform"
            >
              <MenuItem value="linkedin_posts">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LinkedInIcon />
                  <Typography sx={{ ml: 1 }}>LinkedIn Posts</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="tiktok_posts">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <MusicVideoIcon />
                  <Typography sx={{ ml: 1 }}>TikTok Posts</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="instagram_posts">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <InstagramIcon />
                  <Typography sx={{ ml: 1 }}>Instagram Posts</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="instagram_reels">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <InstagramIcon />
                  <Typography sx={{ ml: 1 }}>Instagram Reels</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="instagram_comments">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <InstagramIcon />
                  <Typography sx={{ ml: 1 }}>Instagram Comments</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="facebook_comments">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FacebookIcon />
                  <Typography sx={{ ml: 1 }}>Facebook Comments</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="facebook_reels">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FacebookIcon />
                  <Typography sx={{ ml: 1 }}>Facebook Reels</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="facebook_posts">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FacebookIcon />
                  <Typography sx={{ ml: 1 }}>Facebook Posts</Typography>
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Dataset ID"
            fullWidth
            value={brightdataForm.datasetId}
            InputProps={{
              readOnly: true,
            }}
            sx={{ mb: 2 }}
            helperText="Automatically set based on the selected platform"
          />
          <TextField
            margin="dense"
            label="API Token"
            type="password"
            fullWidth
            value={brightdataForm.apiToken}
            onChange={(e) => setBrightdataForm({ ...brightdataForm, apiToken: e.target.value })}
            helperText={
              editConfigId !== null 
                ? "Leave empty to keep existing token unchanged" 
                : "Authentication API token assigned to access to the services"
            }
            placeholder={editConfigId !== null ? "••••••••••••••••" : ""}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: editConfigId !== null && brightdataForm.apiToken === '' ? (
                <InputAdornment position="end">
                  <Chip 
                    label="Keep Existing" 
                    size="small" 
                    color="info" 
                    variant="outlined"
                  />
                </InputAdornment>
              ) : undefined
            }}
          />
          {editConfigId !== null && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Security Note:</strong> For security reasons, existing API tokens are not displayed. 
                Leave the token field empty to keep the current token unchanged, or enter a new token to update it.
              </Typography>
            </Alert>
          )}
          <FormControlLabel
            control={
              <Switch
                checked={brightdataForm.isActive}
                onChange={(e) => setBrightdataForm({ ...brightdataForm, isActive: e.target.checked })}
                color="primary"
              />
            }
            label="Active Configuration"
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBrightdataDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateBrightdataConfig}
            variant="contained" 
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} /> : (editConfigId !== null ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

             {/* Success Message */}
       {successMessage && (
         <Snackbar 
           open={!!successMessage} 
           autoHideDuration={6000} 
           onClose={() => setSuccessMessage(null)}
         >
           <Alert 
             onClose={() => setSuccessMessage(null)} 
             severity="success" 
             sx={{ width: '100%' }}
           >
             {successMessage}
           </Alert>
         </Snackbar>
       )}

       {/* Error Message */}
       {error && (
         <Snackbar 
           open={!!error} 
           autoHideDuration={6000} 
           onClose={() => setError(null)}
         >
           <Alert 
             onClose={() => setError(null)} 
             severity="error" 
             sx={{ width: '100%' }}
           >
             {error}
           </Alert>
         </Snackbar>
       )}

             {/* Delete Confirmation Dialog for Scraper Configurations */}
       <Dialog
         open={deleteDialogOpen}
         onClose={handleCancelDelete}
       >
         <DialogTitle>Confirm Deletion</DialogTitle>
         <DialogContent>
           <DialogContentText>
             Are you sure you want to delete this configuration? This action cannot be undone.
           </DialogContentText>
         </DialogContent>
         <DialogActions>
           <Button onClick={handleCancelDelete}>Cancel</Button>
           <Button onClick={handleConfirmDelete} color="error" variant="contained">
             Delete
           </Button>
         </DialogActions>
       </Dialog>

       {/* Delete User Confirmation Dialog */}
       <Dialog
         open={deleteUserDialogOpen}
         onClose={handleCancelDeleteUser}
       >
         <DialogTitle>Confirm User Deletion</DialogTitle>
         <DialogContent>
           <DialogContentText>
             Are you sure you want to delete this user? This action cannot be undone and will permanently remove the user from the system.
           </DialogContentText>
         </DialogContent>
         <DialogActions>
           <Button onClick={handleCancelDeleteUser}>Cancel</Button>
           <Button
             onClick={handleConfirmDeleteUser}
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
             Delete User
           </Button>
         </DialogActions>
       </Dialog>

       {/* Delete Company Confirmation Dialog */}
       <Dialog
         open={deleteCompanyDialogOpen}
         onClose={handleCancelDeleteCompany}
       >
         <DialogTitle>Confirm Company Deletion</DialogTitle>
         <DialogContent>
           <DialogContentText>
             Are you sure you want to delete this company? This action cannot be undone and will permanently remove the company and all associated data.
           </DialogContentText>
         </DialogContent>
         <DialogActions>
           <Button onClick={handleCancelDeleteCompany}>Cancel</Button>
           <Button 
             onClick={handleConfirmDeleteCompany}
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
             Delete Company
           </Button>
         </DialogActions>
       </Dialog>

       {/* Role Change Confirmation Dialog */}
       <Dialog
         open={roleChangeDialogOpen}
         onClose={handleCancelRoleChange}
       >
         <DialogTitle>Confirm Role Change</DialogTitle>
         <DialogContent>
           <DialogContentText>
             Are you sure you want to change this user's role to{' '}
             <strong>
               {pendingRoleChange?.newRole === 'super_admin' ? 'Super Admin' :
                pendingRoleChange?.newRole === 'tenant_admin' ? 'Tenant Admin' : 'User'}
             </strong>?
             <br></br>
             This action will immediately update the user's permissions and access levels.
             {pendingRoleChange?.newRole === 'super_admin' && (
               <>
                 <br></br>
                 <strong>Note:</strong> This user is already assigned to the Future Objects company, so the role change can proceed.
               </>
             )}
           </DialogContentText>
         </DialogContent>
         <DialogActions>
           <Button onClick={handleCancelRoleChange}>Cancel</Button>
           <Button 
             onClick={handleConfirmRoleChange} 
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
             Confirm Role Change
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

       {/* Company Status Change Confirmation Dialog */}
       <Dialog
         open={companyStatusChangeDialogOpen}
         onClose={handleCancelCompanyStatusChange}
       >
         <DialogTitle>Confirm Company Status Change</DialogTitle>
         <DialogContent>
           <DialogContentText>
             Are you sure you want to change this company's status from{' '}
             <strong>
               {pendingCompanyStatusChange?.oldStatus === 'active' ? 'Active' : 'Inactive'}
             </strong>{' '}
             to{' '}
             <strong>
               {pendingCompanyStatusChange?.newStatus === 'active' ? 'Active' : 'Inactive'}
             </strong>?
             <br></br>
             {pendingCompanyStatusChange?.newStatus === 'active'
               ? 'This will allow the company to be used for user assignments and to carry out data studies.'
               : 'This will prevent the company from being used for new user assignments and may affect existing users.'
             }
           </DialogContentText>
         </DialogContent>
         <DialogActions>
           <Button onClick={handleCancelCompanyStatusChange}>Cancel</Button>
           <Button 
             onClick={handleConfirmCompanyStatusChange} 
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

       {/* Edit User Dialog */}
       <Dialog open={editUserDialogOpen} onClose={handleCancelEditUser}>
         <DialogTitle>Edit User</DialogTitle>
         <DialogContent>
           <TextField
             label="Name"
             fullWidth
             margin="normal"
             value={editUserForm.username}
             onChange={(e) => setEditUserForm({ ...editUserForm, username: e.target.value })}
             required
           />
           <TextField
             label="Email"
             type="email"
             fullWidth
             margin="normal"
             value={editUserForm.email}
             onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
             required
           />
           <Autocomplete
             options={companies.filter(company => company.status === 'active')}
             getOptionLabel={(option) => option.name}
             value={companies.find(company => company.id === editUserForm.company_id) || null}
             onChange={(event, newValue) => {
               setEditUserForm({
                 ...editUserForm,
                 company_id: newValue ? newValue.id : null
               });
             }}
             renderInput={(params) => (
               <TextField
                 {...params}
                 label="Company"
                 margin="normal"
                 fullWidth
                 disabled={editUserForm.role === 'super_admin'}
                 helperText={editUserForm.role === 'super_admin' ? 'Super admins are automatically assigned to Future Objects company' : ''}
               />
             )}
             filterOptions={(options, { inputValue }) => {
               return options.filter(option =>
                 option.name.toLowerCase().includes(inputValue.toLowerCase())
               );
             }}
             isOptionEqualToValue={(option, value) => option.id === value.id}
             noOptionsText="No Companies Found"
             disabled={editUserForm.role === 'super_admin'}
           />
           <FormControl fullWidth margin="normal">
             <InputLabel>Role</InputLabel>
             <Select
               value={editUserForm.role}
               label="Role"
                             onChange={(e) => {
                const newRole = e.target.value;
                
                // If changing to super_admin, check if Future Objects company is selected
                if (newRole === 'super_admin') {
                  const futureObjectsCompany = companies.find(company => 
                    company.name.toLowerCase() === 'future objects' && company.status === 'active'
                  );
                  if (!futureObjectsCompany) {
                    setError('Future Objects company not found. Please create the Future Objects company first.');
                    return;
                  }
                  if (editUserForm.company_id !== futureObjectsCompany.id) {
                    setError('To assign Super Admin role, the user must be assigned to the Future Objects company. Please select Future Objects as the company first.');
                    return;
                  }
                }
                
                setEditUserForm({ 
                  ...editUserForm, 
                  role: newRole
                });
              }}
             >
               <MenuItem value="super_admin">Super Admin</MenuItem>
               <MenuItem value="tenant_admin">Tenant Admin</MenuItem>
               <MenuItem value="user">User</MenuItem>
             </Select>
           </FormControl>
           <FormControl fullWidth margin="normal">
             <InputLabel>Status</InputLabel>
             <Select
               value={editUserForm.is_active ? 'active' : 'inactive'}
               label="Status"
               onChange={(e) => setEditUserForm({ ...editUserForm, is_active: e.target.value === 'active' })}
             >
               <MenuItem value="active">Active</MenuItem>
               <MenuItem value="inactive">Inactive</MenuItem>
             </Select>
           </FormControl>
         </DialogContent>
         <DialogActions>
           <Button onClick={handleCancelEditUser}>Cancel</Button>
           <Button onClick={handleUpdateUser} variant="contained" color="primary">
             Update
           </Button>
         </DialogActions>
       </Dialog>
    </Box>
  );
};

export default SuperAdminDashboard; 