import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Stack,
  Card,
  CardContent,
  CardActions,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
  Divider,
  Breadcrumbs,
  Link,
  ToggleButtonGroup,
  ToggleButton,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Select,
  MenuItem,
  InputAdornment,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import { apiFetch } from '../utils/api';

interface Project {
  id: number;
  name: string;
  description: string | null;
  owner: number;
  owner_name: string;
  created_at: string;
  updated_at: string;
  organization?: {
    id: number;
    name: string;
  };
}

const ProjectsList = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNewProjectDialog, setOpenNewProjectDialog] = useState(false);
  const [openEditProjectDialog, setOpenEditProjectDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('last viewed');

  // Fetch projects
  const fetchProjects = async () => {
    try {
      setLoading(true);
      // Explicitly request the API to include organization details
      const response = await apiFetch('/api/users/projects/?include_organization=true');
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
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleOpenProject = (projectId: number) => {
    // Find the project to get its organization
    const project = projects.find(p => p.id === projectId);
    
    if (project && project.organization && project.organization.id) {
      // If project has organization info, use the new URL structure
      navigate(`/organizations/${project.organization.id}/projects/${projectId}`);
    } else {
      // Fallback to legacy URL if organization info is not available
      navigate(`/dashboard/${projectId}`);
    }
  };

  const handleNewProject = () => {
    setProjectName('');
    setProjectDescription('');
    setOpenNewProjectDialog(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setProjectName(project.name);
    setProjectDescription(project.description || '');
    setOpenEditProjectDialog(true);
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      return;
    }

    try {
      console.log('Creating project with data:', {
        name: projectName,
        description: projectDescription || null,
      });

      const response = await apiFetch('/api/users/projects/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          description: projectDescription || null,
        }),
      });

      if (!response.ok) {
        // Try to get the detailed error message
        let errorDetail = 'Failed to create project';
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

      const data = await response.json();
      console.log('Project created successfully:', data);
      
      fetchProjects();
      setOpenNewProjectDialog(false);
    } catch (error) {
      console.error('Error creating project:', error);
      setError(error instanceof Error ? error.message : 'Failed to create project. Please try again.');
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject || !projectName.trim()) {
      return;
    }

    try {
      const response = await apiFetch(`/api/users/projects/${selectedProject.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          description: projectDescription || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      fetchProjects();
      setOpenEditProjectDialog(false);
    } catch (error) {
      console.error('Error updating project:', error);
      setError('Failed to update project. Please try again.');
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!window.confirm('Are you sure you want to delete this project? All data inside this project will be deleted.')) {
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
    } catch (error) {
      console.error('Error deleting project:', error);
      setError('Failed to delete project. Please try again.');
    }
  };

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: 'list' | 'grid',
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const handleSortChange = (event: SelectChangeEvent) => {
    setSortBy(event.target.value);
  };

  // Filter and sort projects
  const filteredAndSortedProjects = projects
    .filter(project =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
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
      <Box sx={{ mb: 2 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link 
            underline="hover" 
            color="inherit" 
            href="#" 
            onClick={() => navigate('/')}
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <FolderOutlinedIcon sx={{ mr: 0.5, fontSize: 20 }} />
            All Projects
          </Link>
        </Breadcrumbs>
      </Box>
      
      {/* Header and actions */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="500">
          Projects
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleNewProject}
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
          Create project
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
          placeholder="Search projects"
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

      {/* Projects Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Showing {filteredAndSortedProjects.length} project{filteredAndSortedProjects.length !== 1 ? 's' : ''}
      </Typography>

      {/* Projects Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {filteredAndSortedProjects.length > 0 ? (
            <TableContainer component={Paper} sx={{ 
              boxShadow: 'none', 
              borderRadius: '4px',
              border: '1px solid rgba(0,0,0,0.12)'
            }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f9fafb' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Project name</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Indexes</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Assistants</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>API keys</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Users</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', py: 1.5 }}>Tags</TableCell>
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
                      onClick={() => handleOpenProject(project.id)}
                    >
                      <TableCell sx={{ color: 'primary.main', fontWeight: 500 }}>{project.name}</TableCell>
                      <TableCell>
                        {project.id.toString().padStart(8, '0').substring(0, 8)}
                      </TableCell>
                      <TableCell>0</TableCell>
                      <TableCell>0</TableCell>
                      <TableCell>1</TableCell>
                      <TableCell>2</TableCell>
                      <TableCell>0</TableCell>
                      <TableCell>{new Date(project.created_at).toLocaleDateString()}</TableCell>
                      <TableCell align="center">
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Add actions menu here
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
              <Typography variant="h6" gutterBottom>No projects found</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Create your first project to get started.
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={handleNewProject}
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
                Create Project
              </Button>
            </Paper>
          )}
        </>
      )}

      {/* New Project Dialog */}
      <Dialog 
        open={openNewProjectDialog} 
        onClose={() => setOpenNewProjectDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Project Name"
            type="text"
            fullWidth
            variant="outlined"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            sx={{ mb: 2 }}
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
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewProjectDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateProject} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog 
        open={openEditProjectDialog} 
        onClose={() => setOpenEditProjectDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="edit-name"
            label="Project Name"
            type="text"
            fullWidth
            variant="outlined"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="edit-description"
            label="Description (Optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditProjectDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateProject} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectsList; 