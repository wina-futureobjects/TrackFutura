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
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  FolderOpen as ProjectIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';

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

interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
}

interface Member {
  id: number;
  user: User;
  role: string;
  date_joined: string;
}

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

const TenantAdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [myOrganizations, setMyOrganizations] = useState<Organization[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [openAddMemberDialog, setOpenAddMemberDialog] = useState(false);
  const [openNewProjectDialog, setOpenNewProjectDialog] = useState(false);
  const [newMember, setNewMember] = useState({
    email: '',
    role: 'member',
  });
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    is_public: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ userId: number; newStatus: boolean } | null>(null);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalProjects: 0,
    organizations: 0,
  });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      fetchMembers();
      fetchProjects();
      fetchStats();
    }
  }, [selectedOrg]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/users/organizations/');
      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }

      const data = await response.json();
      const orgs = Array.isArray(data) ? data : data.results || [];
      setMyOrganizations(orgs);

      // Auto-select the first organization if none is selected
      if (orgs.length > 0 && !selectedOrg) {
        setSelectedOrg(orgs[0]);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setError('Failed to load organizations.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!selectedOrg) return;

    try {
      setLoading(true);
      const response = await apiFetch(`/api/users/organizations/${selectedOrg.id}/members/`);
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }

      const data = await response.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching members:', error);
      setError('Failed to load organization members.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    if (!selectedOrg) return;

    try {
      setLoading(true);
      const response = await apiFetch(`/api/users/projects/?organization=${selectedOrg.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!selectedOrg) return;

    try {
      const response = await apiFetch(`/api/users/organizations/${selectedOrg.id}/stats/`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAddMember = async () => {
    if (!selectedOrg) return;

    try {
      // First, try to find the user by email
      const userResponse = await apiFetch(`/api/users/search/?email=${encodeURIComponent(newMember.email)}`);
      
      if (!userResponse.ok) {
        throw new Error('User not found with this email');
      }
      
      const userData = await userResponse.json();
      
      if (!userData || !userData.id) {
        throw new Error('User not found with this email');
      }
      
      // Now add the user to the organization
      const response = await apiFetch(`/api/users/organizations/${selectedOrg.id}/members/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userData.id,
          role: newMember.role,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add member to organization');
      }

      fetchMembers();
      fetchStats();
      setOpenAddMemberDialog(false);
      setNewMember({
        email: '',
        role: 'member',
      });
    } catch (error) {
      console.error('Error adding member:', error);
      setError(error instanceof Error ? error.message : 'Failed to add member.');
    }
  };

  const handleCreateProject = async () => {
    if (!selectedOrg) return;

    try {
      const response = await apiFetch('/api/users/projects/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProject.name,
          description: newProject.description || null,
          organization: selectedOrg.id,
          is_public: newProject.is_public,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      fetchProjects();
      fetchStats();
      setOpenNewProjectDialog(false);
      setNewProject({
        name: '',
        description: '',
        is_public: false,
      });
    } catch (error) {
      console.error('Error creating project:', error);
      setError(error instanceof Error ? error.message : 'Failed to create project.');
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!selectedOrg) return;

    if (!window.confirm('Are you sure you want to remove this member from the organization?')) {
      return;
    }

    try {
      const response = await apiFetch(`/api/users/organizations/${selectedOrg.id}/members/${memberId}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove member from organization');
      }

      fetchMembers();
      fetchStats();
    } catch (error) {
      console.error('Error removing member:', error);
      setError('Failed to remove member from organization.');
    }
  };

  const handleChangeMemberRole = async (memberId: number, newRole: string) => {
    if (!selectedOrg) return;

    try {
      const response = await apiFetch(`/api/users/organizations/${selectedOrg.id}/members/${memberId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: newRole,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update member role');
      }

      fetchMembers();
    } catch (error) {
      console.error('Error updating member role:', error);
      setError('Failed to update member role.');
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!window.confirm('Are you sure you want to delete this project? All data within it will be lost.')) {
      return;
    }

    try {
      const response = await apiFetch(`/api/users/projects/${projectId}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      fetchProjects();
      fetchStats();
    } catch (error) {
      console.error('Error deleting project:', error);
      setError('Failed to delete project.');
    }
  };

  const handleOpenProject = (projectId: number) => {
    navigate(`/dashboard/${projectId}`);
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

      // Update the user in the local state
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.user.id === userId 
            ? { ...member, user: { ...member.user, is_active: newStatus } }
            : member
        )
      );

      setError(null);
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
      await handleChangeUserStatus(pendingStatusChange.userId, pendingStatusChange.newStatus);
      setStatusChangeDialogOpen(false);
      setPendingStatusChange(null);
    }
  };

  const handleCancelStatusChange = () => {
    setStatusChangeDialogOpen(false);
    setPendingStatusChange(null);
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.user.username.toLowerCase().includes(search.toLowerCase()) ||
                         member.user.email.toLowerCase().includes(search.toLowerCase());
    
    const matchesRoleFilter = roleFilter === 'all' || 
                             member.role === roleFilter;
    
    return matchesSearch && matchesRoleFilter;
  });

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(search.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(search.toLowerCase())) ||
    project.owner_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && myOrganizations.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Tenant Admin Dashboard
        </Typography>
        
        {myOrganizations.length > 0 && (
          <FormControl variant="outlined" sx={{ minWidth: 200 }}>
            <InputLabel>Organization</InputLabel>
            <Select
              value={selectedOrg?.id || ''}
              onChange={(e) => {
                const orgId = e.target.value;
                const org = myOrganizations.find(o => o.id === orgId);
                if (org) setSelectedOrg(org);
              }}
              label="Organization"
            >
              {myOrganizations.map(org => (
                <MenuItem key={org.id} value={org.id}>
                  {org.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {selectedOrg ? (
        <>
          {/* Organization Details */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h5" gutterBottom>{selectedOrg.name}</Typography>
            {selectedOrg.description && (
              <Typography variant="body1" color="text.secondary" paragraph>
                {selectedOrg.description}
              </Typography>
            )}
            <Box sx={{ mt: 2, display: 'flex', gap: 3 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Owner</Typography>
                <Typography variant="body1">{selectedOrg.owner_name}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Created</Typography>
                <Typography variant="body1">{new Date(selectedOrg.created_at).toLocaleDateString()}</Typography>
              </Box>
            </Box>
          </Paper>

          {/* Stats Cards */}
          <Box sx={{ mb: 4 }}>
            <Grid container spacing={3}>
              <Grid item md={4} sm={6} xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="text.secondary">Members</Typography>
                    <Typography variant="h3">{stats.totalMembers}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item md={4} sm={6} xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="text.secondary">Projects</Typography>
                    <Typography variant="h3">{stats.totalProjects}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item md={4} sm={12} xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="text.secondary">Organizations</Typography>
                    <Typography variant="h3">{stats.organizations}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>

          <Paper sx={{ mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange} centered>
              <Tab label="Members" />
              <Tab label="Projects" />
              <Tab label="Settings" />
            </Tabs>
          </Paper>

          {/* Search and Add Button */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {activeTab === 0 && (
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Filter by Role</InputLabel>
                  <Select
                    value={roleFilter}
                    label="Filter by Role"
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Roles</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="member">Member</MenuItem>
                    <MenuItem value="viewer">Viewer</MenuItem>
                  </Select>
                </FormControl>
              )}
              <TextField
                placeholder={`Search ${activeTab === 0 ? 'members' : activeTab === 1 ? 'projects' : ''}...`}
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
                onClick={() => setOpenAddMemberDialog(true)}
              >
                Add Member
              </Button>
            )}
            {activeTab === 1 && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenNewProjectDialog(true)}
              >
                Create Project
              </Button>
            )}
          </Box>

          {error && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light', color: 'error.dark' }}>
              <Typography>{error}</Typography>
            </Paper>
          )}

          {/* Members Tab */}
          {activeTab === 0 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Username</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Joined</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>{member.user.username}</TableCell>
                        <TableCell>{member.user.email}</TableCell>
                        <TableCell>
                          <Chip 
                            label={member.role} 
                            color={member.role === 'admin' ? 'primary' : member.role === 'member' ? 'secondary' : 'default'} 
                            size="small" 
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
                              '&:hover': {
                                transform: 'scale(1.08)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                filter: 'brightness(1.1)'
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
                        <TableCell align="right">
                          <FormControl variant="outlined" size="small" sx={{ minWidth: 120, mr: 1 }}>
                            <Select
                              value={member.role}
                              onChange={(e) => handleChangeMemberRole(member.id, e.target.value)}
                              displayEmpty
                            >
                              <MenuItem value="admin">Admin</MenuItem>
                              <MenuItem value="member">Member</MenuItem>
                              <MenuItem value="viewer">Viewer</MenuItem>
                            </Select>
                          </FormControl>
                          <IconButton 
                            color="error" 
                            onClick={() => handleRemoveMember(member.id)}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No members found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Projects Tab */}
          {activeTab === 1 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>Access</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => (
                      <TableRow 
                        key={project.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleOpenProject(project.id)}
                      >
                        <TableCell>{project.name}</TableCell>
                        <TableCell>{project.description || 'N/A'}</TableCell>
                        <TableCell>{project.owner_name}</TableCell>
                        <TableCell>
                          <Chip 
                            label={project.is_public ? 'Public' : 'Private'} 
                            color={project.is_public ? 'success' : 'default'} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>{new Date(project.created_at).toLocaleDateString()}</TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <IconButton 
                            color="primary" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProject(project.id);
                            }}
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            <ProjectIcon />
                          </IconButton>
                          <IconButton 
                            color="error" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No projects found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Settings Tab */}
          {activeTab === 2 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Organization Settings</Typography>
              <TextField
                label="Organization Name"
                fullWidth
                margin="normal"
                value={selectedOrg.name}
                InputProps={{
                  readOnly: true,
                }}
              />
              <TextField
                label="Description"
                fullWidth
                margin="normal"
                multiline
                rows={3}
                value={selectedOrg.description || ''}
                InputProps={{
                  readOnly: true,
                }}
              />
              <TextField
                label="Owner"
                fullWidth
                margin="normal"
                value={selectedOrg.owner_name}
                InputProps={{
                  readOnly: true,
                }}
              />
              
              <Box sx={{ mt: 3 }}>
                <Button 
                  variant="outlined" 
                  startIcon={<EditIcon />}
                  sx={{ mr: 2 }}
                  onClick={() => {
                    // Edit organization functionality could be implemented here
                    alert('Edit organization feature coming soon');
                  }}
                >
                  Edit Organization
                </Button>
              </Box>
            </Paper>
          )}
        </>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>No Organizations Found</Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            You don't seem to have any organizations yet. Please contact a Super Admin to create one for you.
          </Typography>
        </Paper>
      )}

      {/* Add Member Dialog */}
      <Dialog open={openAddMemberDialog} onClose={() => setOpenAddMemberDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Member</DialogTitle>
        <DialogContent>
          <TextField
            label="Email Address"
            type="email"
            fullWidth
            margin="normal"
            value={newMember.email}
            onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
            required
            helperText="Enter the email of a registered user"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select
              value={newMember.role}
              label="Role"
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="member">Member</MenuItem>
              <MenuItem value="viewer">Viewer</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddMemberDialog(false)}>Cancel</Button>
          <Button onClick={handleAddMember} variant="contained" color="primary">
            Add Member
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={openNewProjectDialog} onClose={() => setOpenNewProjectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <TextField
            label="Project Name"
            fullWidth
            margin="normal"
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            required
          />
          <TextField
            label="Description (optional)"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Access Level</InputLabel>
            <Select
              value={newProject.is_public ? 'public' : 'private'}
              label="Access Level"
              onChange={(e) => setNewProject({ ...newProject, is_public: e.target.value === 'public' })}
            >
              <MenuItem value="private">Private - Only you and specific users can access</MenuItem>
              <MenuItem value="public">Public - All organization members can access</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewProjectDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateProject} variant="contained" color="primary">
            Create Project
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
    </Box>
  );
};

export default TenantAdminDashboard; 