import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';

interface Organization {
  id: number;
  name: string;
  description: string | null;
  owner: number;
  owner_name: string;
  members_count: number;
  projects_count?: number;
  created_at: string;
  updated_at: string;
}

interface RawOrganization {
  id: number;
  name: string;
  description: string | null;
  owner: number;
  owner_name: string;
  members_count: number;
  created_at: string;
  updated_at: string;
}

const OrganizationsList = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('last viewed');

  // Fetch organizations with project counts
  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/users/organizations/');
      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }

      const data = await response.json();
      let organizationsData: RawOrganization[] = [];

      if (Array.isArray(data)) {
        organizationsData = data;
      } else if (data && typeof data === 'object' && 'results' in data) {
        organizationsData = data.results || [];
      } else {
        console.error('API returned unexpected data format:', data);
        setOrganizations([]);
        setError('Received invalid data format from server.');
        return;
      }

             // Fetch project counts for each organization
       const organizationsWithProjectCounts = await Promise.all(
         organizationsData.map(async (org: RawOrganization) => {
           try {
             const projectsResponse = await apiFetch(`/api/users/projects/?organization=${org.id}`);
             if (projectsResponse.ok) {
               const projectsData = await projectsResponse.json();
               const projectCount = Array.isArray(projectsData) ? projectsData.length : 
                                  (projectsData.results ? projectsData.results.length : 0);
               return { ...org, projects_count: projectCount };
             } else {
               return { ...org, projects_count: 0 };
             }
           } catch (error) {
             console.error(`Error fetching projects for organization ${org.id}:`, error);
             return { ...org, projects_count: 0 };
           }
         })
       );

      setOrganizations(organizationsWithProjectCounts);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setOrganizations([]);
      setError('Failed to load organizations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleOpenOrganization = (organizationId: number) => {
    navigate(`/organizations/${organizationId}/projects`);
  };

  const handleNewOrganization = () => {
    setOrgName('');
    setOrgDescription('');
    setOpenNewDialog(true);
  };

  const handleEditOrganization = (organization: Organization) => {
    setSelectedOrganization(organization);
    setOrgName(organization.name);
    setOrgDescription(organization.description || '');
    setOpenEditDialog(true);
  };

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      return;
    }

    try {
      const response = await apiFetch('/api/users/organizations/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: orgName,
          description: orgDescription || null,
        }),
      });

      if (!response.ok) {
        // Try to get the detailed error message
        let errorDetail = 'Failed to create organization';
        try {
          const errorData = await response.json();
          console.error('Error data from server:', errorData);
          if (errorData.detail) {
            errorDetail = errorData.detail;
          } else if (typeof errorData === 'object') {
            // For field-specific errors
            errorDetail = Object.entries(errorData)
              .map(([field, errors]) => `${field}: ${errors}`)
              .join(', ');
          }
        } catch (e) {
          console.error('Could not parse error response:', e);
        }
        throw new Error(errorDetail);
             }

       fetchOrganizations();
      setOpenNewDialog(false);
    } catch (error) {
      console.error('Error creating organization:', error);
      setError(error instanceof Error ? error.message : 'Failed to create organization. Please try again.');
    }
  };

  const handleUpdateOrganization = async () => {
    if (!selectedOrganization || !orgName.trim()) {
      return;
    }

    try {
      const response = await apiFetch(`/api/users/organizations/${selectedOrganization.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: orgName,
          description: orgDescription || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update organization');
      }

      fetchOrganizations();
      setOpenEditDialog(false);
      setSuccess('Organization updated successfully!');
      setError(null); // Clear any previous errors
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Error updating organization:', error);
      setError('Failed to update organization. Please try again.');
      setSuccess(null); // Clear any previous success messages
    }
  };

  const handleDeleteOrganization = async (organizationId: number) => {
    try {
      const response = await apiFetch(`/api/users/organizations/${organizationId}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete organization');
      }

      fetchOrganizations();
      setOpenDeleteDialog(false);
      setOpenEditDialog(false);
    } catch (error) {
      console.error('Error deleting organization:', error);
      setError('Failed to delete organization. Please try again.');
    }
  };

  const handleDeleteClick = (organization: Organization) => {
    setSelectedOrganization(organization);
    setOpenDeleteDialog(true);
  };

  const handleSortChange = (event: SelectChangeEvent) => {
    setSortBy(event.target.value);
  };

  // Filter and sort organizations
  const filteredAndSortedOrganizations = organizations
    .filter(org =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.owner_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'last viewed':
        default:
          // For "last viewed", we'll sort by updated_at as a proxy
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

  return (
    <Box sx={{
      width: '100%',
      padding: '16px 32px',
      bgcolor: '#f5f5f5',
      minHeight: 'calc(100vh - 56px)',
    }}>
      {/* Breadcrumbs */}

      {/* Header and actions */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h3" component="h1" fontWeight="500">
          Organizations
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNewOrganization}
          sx={{
            borderRadius: 1,
            bgcolor: '#e5e8eb',
            color: '#000000',
            textTransform: 'none',
            fontWeight: 500,
            boxShadow: 'none',
            '&:hover': {
              bgcolor: '#d5d8db',
              boxShadow: 'none'
            }
          }}
        >
          Create organization
        </Button>
      </Box>

      {/* Search and filters bar */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          mb: 1,
        }}
      >
                 <TextField
           placeholder="Search organizations or owners"
           variant="outlined"
           size="small"
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           sx={{
             width: '300px',
             '& .MuiOutlinedInput-root': {
               backgroundColor: 'white',
               '& fieldset': {
                 borderColor: 'rgba(0, 0, 0, 0.23)',
               },
             },
           }}
           InputProps={{
             startAdornment: (
               <InputAdornment position="start">
                 <SearchIcon />
               </InputAdornment>
             ),
           }}
         />
        <FormControl size="small" sx={{ minWidth: 180, backgroundColor: 'white' }}>
          <InputLabel id="sort-select-label">Sort by</InputLabel>
          <Select
            labelId="sort-select-label"
            id="sort-select"
            value={sortBy}
            label="Sort by"
            onChange={handleSortChange}
          >
            <MenuItem value="last viewed">last viewed</MenuItem>
            <MenuItem value="newest">newest</MenuItem>
            <MenuItem value="oldest">oldest</MenuItem>
            <MenuItem value="name">name</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Organizations Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Showing {filteredAndSortedOrganizations.length} organization{filteredAndSortedOrganizations.length !== 1 ? 's' : ''}
      </Typography>

      {/* Organizations Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {filteredAndSortedOrganizations.length > 0 ? (
            <TableContainer component={Paper} sx={{
              boxShadow: 'none',
              borderRadius: '4px',
              border: '1px solid rgba(0,0,0,0.12)'
            }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f9fafb' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Organization name</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Owner</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Members</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Projects</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Created</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAndSortedOrganizations.map((org) => (
                    <TableRow
                      key={org.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleOpenOrganization(org.id)}
                    >
                                             <TableCell sx={{ color: theme.palette.primary.main, fontWeight: 500 }}>{org.name}</TableCell>
                       <TableCell>{org.owner_name}</TableCell>
                       <TableCell>{org.members_count}</TableCell>
                       <TableCell>{org.projects_count || 0}</TableCell>
                       <TableCell>{new Date(org.created_at).toLocaleDateString()}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditOrganization(org);
                          }}
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
            <Paper sx={{ p: 4, textAlign: 'center', mt: 2, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>No organizations found</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Create your first organization to get started.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleNewOrganization}
                sx={{
                  borderRadius: 1,
                  bgcolor: '#e5e8eb',
                  color: '#000000',
                  textTransform: 'none',
                  fontWeight: 500,
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: '#d5d8db',
                    boxShadow: 'none'
                  }
                }}
              >
                Create Organization
              </Button>
            </Paper>
          )}
        </>
      )}

      {/* New Organization Dialog */}
      <Dialog open={openNewDialog} onClose={() => setOpenNewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Organization</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Organization Name"
            type="text"
            fullWidth
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={orgDescription}
            onChange={(e) => setOrgDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateOrganization} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Organization</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Organization Name"
            type="text"
            fullWidth
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={orgDescription}
            onChange={(e) => setOrgDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => selectedOrganization && handleDeleteClick(selectedOrganization)}
            color="error"
            variant="outlined"
            sx={{
              borderColor: '#d32f2f',
              color: '#d32f2f',
              '&:hover': {
                borderColor: '#b71c1c',
                backgroundColor: 'rgba(211, 47, 47, 0.04)',
              }
            }}
          >
            Delete
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateOrganization} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
             </Dialog>

       {/* Delete Confirmation Dialog */}
       <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} maxWidth="sm" fullWidth>
         <DialogTitle>Delete Organization</DialogTitle>
         <DialogContent>
           <Typography variant="body1" sx={{ mb: 2 }}>
             Are you sure you want to delete the organization "{selectedOrganization?.name}"?
           </Typography>
           <Typography
             variant="body2"
             sx={{
               mb: 1,
               color: 'red',
               fontWeight: 500,
             }}
           >
             Notes: This action cannot be undone. 
             All projects inside this organization will be permanently deleted.
           </Typography>
         </DialogContent>
         <DialogActions>
           <Button onClick={() => setOpenDeleteDialog(false)}>
             Cancel
           </Button>
           <Button
             onClick={() => selectedOrganization && handleDeleteOrganization(selectedOrganization.id)}
             color="error"
             variant="contained"
             sx={{
               backgroundColor: '#d32f2f',
               '&:hover': {
                 backgroundColor: '#b71c1c',
               }
             }}
           >
             Delete Organization
           </Button>
         </DialogActions>
       </Dialog>

               {/* Error message */}
       {error && (
         <Box mt={2} p={2} bgcolor="error.light" color="error.dark" borderRadius={1}>
           <Typography variant="body2">{error}</Typography>
         </Box>
       )}

                       {/* Success Snackbar */}
         <Snackbar
           open={!!success}
           autoHideDuration={3000}
           onClose={() => setSuccess(null)}
           anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
         >
           <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
             {success}
           </Alert>
         </Snackbar>
    </Box>
  );
};

export default OrganizationsList;
