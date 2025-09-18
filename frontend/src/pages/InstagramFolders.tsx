import React, { useState, useEffect, useRef } from 'react';
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
  ToggleButtonGroup,
  ToggleButton,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Snackbar,
  Alert,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import PostAddIcon from '@mui/icons-material/PostAdd';
import CommentIcon from '@mui/icons-material/Comment';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import { apiFetch } from '../utils/api';

interface Folder {
  id: number;
  name: string;
  description: string | null;
  category: 'posts' | 'reels' | 'comments';
  category_display: string;
  created_at: string;
  updated_at: string;
  post_count: number;
  reel_count: number;
  comment_count: number;
}

const InstagramFolders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNewFolderDialog, setOpenNewFolderDialog] = useState(false);
  const [openEditFolderDialog, setOpenEditFolderDialog] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [folderCategory, setFolderCategory] = useState<'posts' | 'reels' | 'comments'>('posts');
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Add loading states for create and update operations
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Add refs to prevent race conditions and multiple submissions
  const isCreatingRef = useRef(false);
  const isUpdatingRef = useRef(false);
  
  // Extract project ID from URL path or query parameters
  const getProjectId = () => {
    // First try to extract from URL path: /organizations/{orgId}/projects/{projectId}/...
    const pathMatch = location.pathname.match(/\/organizations\/\d+\/projects\/(\d+)/);
    if (pathMatch) {
      return pathMatch[1];
    }
    
    // Fallback to query parameter: ?project=13
    const queryParams = new URLSearchParams(location.search);
    return queryParams.get('project');
  };
  
  const projectId = getProjectId();

  // Fetch folders
  const fetchFolders = async () => {
    try {
      setLoading(true);
      
      // Don't fetch folders if no project is found
      if (!projectId) {
        console.error('No project ID found in URL');
        setError('No project context found. Please navigate to this page from within a project.');
        setFolders([]);
        setLoading(false);
        return;
      }
      
      // Add project filter
      const url = `/api/instagram-data/folders/?project=${projectId}`;
      
      console.log('=== FRONTEND FETCH FOLDERS DEBUG ===');
      console.log('Project ID from URL path:', projectId);
      console.log('Current URL:', location.pathname);
      console.log('Fetch URL:', url);
      
      const response = await apiFetch(url);
      console.log('Fetch response status:', response.status);
      console.log('Fetch response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }
      
      const data = await response.json();
      console.log('Raw response data:', data);
      
      // Check if the response is paginated (has a 'results' key)
      if (data && typeof data === 'object' && 'results' in data) {
        console.log('Using paginated data, count:', data.count);
        console.log('Results:', data.results);
        setFolders(data.results || []);
      } else if (Array.isArray(data)) {
        // Handle case where API returns direct array
        console.log('Using direct array data, length:', data.length);
        setFolders(data);
      } else {
        console.error('API returned unexpected data format:', data);
        setFolders([]);
        setError('Received invalid data format from server. Please try again.');
      }
      console.log('=== END FRONTEND FETCH FOLDERS DEBUG ===');
    } catch (error) {
      console.error('Error fetching folders:', error);
      setFolders([]);
      setError('Failed to load folders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, [projectId]); // Add projectId as dependency

  // Cleanup effect to reset states on unmount
  useEffect(() => {
    return () => {
      // Reset all refs on unmount
      isCreatingRef.current = false;
      isUpdatingRef.current = false;
    };
  }, []);

  const handleOpenFolder = (folderId: number) => {
    // Extract organization and project IDs from URL
    const match = location.pathname.match(/\/organizations\/(\d+)\/projects\/(\d+)/);
    
    if (match) {
      const [, orgId, projId] = match;
      navigate(`/organizations/${orgId}/projects/${projId}/instagram-data/${folderId}`);
    } else if (projectId) {
      // If not in the pathname but we have projectId in query params
      navigate(`/instagram-data/${folderId}?project=${projectId}`);
    } else {
      navigate(`/instagram-data/${folderId}`);
    }
  };

  const handleNewFolder = () => {
    // Reset all states and refs
    setFolderName('');
    setFolderDescription('');
    setFolderCategory('posts');
    setIsCreating(false);
    isCreatingRef.current = false;
    setError(null);
    setOpenNewFolderDialog(true);
  };

  const handleEditFolder = (folder: Folder) => {
    // Reset all states and refs
    setSelectedFolder(folder);
    setFolderName(folder.name);
    setFolderDescription(folder.description || '');
    setFolderCategory(folder.category);
    setIsUpdating(false);
    isUpdatingRef.current = false;
    setError(null);
    setOpenEditFolderDialog(true);
  };

  const handleCreateFolder = async () => {
    // Double check - use both state and ref to prevent race conditions
    if (!folderName.trim() || isCreating || isCreatingRef.current) {
      console.log('Create folder blocked:', { 
        folderName: folderName.trim(), 
        isCreating, 
        isCreatingRef: isCreatingRef.current 
      });
      return;
    }

    try {
      // Set both state and ref immediately
      setIsCreating(true);
      isCreatingRef.current = true;
      setError(null);
      
      console.log('Starting folder creation...');
      
      const requestData = {
        name: folderName,
        description: folderDescription || null,
        category: folderCategory,
        project: projectId ? parseInt(projectId, 10) : null,
      };
      
      console.log('=== FRONTEND FOLDER CREATION DEBUG ===');
      console.log('Project ID from URL:', projectId);
      console.log('Request data being sent:', requestData);
      console.log('API endpoint:', '/api/instagram-data/folders/');
      
      const response = await apiFetch('/api/instagram-data/folders/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.log('Error response:', errorData);
        throw new Error('Failed to create folder');
      }

      const responseData = await response.json();
      console.log('Success response data:', responseData);
      console.log('=== END FRONTEND FOLDER CREATION DEBUG ===');

      // Refresh folders list
      await fetchFolders();
      setOpenNewFolderDialog(false);
      
      // Reset form
      setFolderName('');
      setFolderDescription('');
      setFolderCategory('posts');
      
      console.log('Folder creation completed successfully');
    } catch (error) {
      console.error('Error creating folder:', error);
      setError('Failed to create folder. Please try again.');
    } finally {
      // Clear both state and ref
      setIsCreating(false);
      isCreatingRef.current = false;
      console.log('Create folder operation finished');
    }
  };

  const handleUpdateFolder = async () => {
    // Double check - use both state and ref to prevent race conditions
    if (!selectedFolder || !folderName.trim() || isUpdating || isUpdatingRef.current) {
      console.log('Update folder blocked:', { 
        selectedFolder: !!selectedFolder, 
        folderName: folderName.trim(), 
        isUpdating, 
        isUpdatingRef: isUpdatingRef.current 
      });
      return;
    }

    try {
      // Set both state and ref immediately
      setIsUpdating(true);
      isUpdatingRef.current = true;
      setError(null);
      
      console.log('Starting folder update...');
      
      const requestData = {
        name: folderName,
        description: folderDescription || null,
        category: folderCategory,
        project: projectId ? parseInt(projectId, 10) : null,
      };
      
      console.log('=== FRONTEND FOLDER UPDATE DEBUG ===');
      console.log('Folder ID:', selectedFolder.id);
      console.log('Request data being sent:', requestData);
      
      // Include project parameter in URL for consistency with backend expectations
      const updateUrl = projectId 
        ? `/api/instagram-data/folders/${selectedFolder.id}/?project=${projectId}`
        : `/api/instagram-data/folders/${selectedFolder.id}/`;
      
      console.log('API endpoint:', updateUrl);
      
      const response = await apiFetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('Update response status:', response.status);
      console.log('Update response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.text();
        console.log('Update error response:', errorData);
        throw new Error('Failed to update folder');
      }

      const responseData = await response.json();
      console.log('Update success response data:', responseData);
      console.log('=== END FRONTEND FOLDER UPDATE DEBUG ===');

      // Refresh folders list
      await fetchFolders();
      setOpenEditFolderDialog(false);
      setSelectedFolder(null);
      
      console.log('Folder update completed successfully');
    } catch (error) {
      console.error('Error updating folder:', error);
      setError('Failed to update folder. Please try again.');
    } finally {
      // Clear both state and ref
      setIsUpdating(false);
      isUpdatingRef.current = false;
      console.log('Update folder operation finished');
    }
  };

  const handleDeleteFolder = async (folderId: number) => {
    if (!window.confirm('Are you sure you want to delete this folder? All posts inside will be moved to uncategorized.')) {
      return;
    }

    try {
      const response = await apiFetch(`/api/instagram-data/folders/${folderId}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete folder');
      }

      // Refresh folders list
      fetchFolders();
    } catch (error) {
      console.error('Error deleting folder:', error);
      setError('Failed to delete folder. Please try again.');
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'posts':
        return <PostAddIcon />;
      case 'reels':
        return <VideoLibraryIcon />;
      case 'comments':
        return <CommentIcon />;
      default:
        return <FolderIcon />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'posts':
        return 'primary';
      case 'reels':
        return 'secondary';
      case 'comments':
        return 'success';
      default:
        return 'default';
    }
  };

  const getContentCount = (folder: Folder) => {
    switch (folder.category) {
      case 'posts':
        return folder.post_count || 0;
      case 'reels':
        return folder.reel_count || 0;
      case 'comments':
        return folder.comment_count || 0;
      default:
        return 0;
    }
  };

  const renderGridView = () => (
    <Stack spacing={3} direction="row" useFlexGap flexWrap="wrap">
      {folders.map((folder) => (
        <Box key={folder.id} sx={{ width: { xs: '100%', sm: '45%', md: '30%' }, mb: 3 }}>
          <Card 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                cursor: 'pointer'
              }
            }}
          >
            <CardContent 
              sx={{ flexGrow: 1 }}
              onClick={() => handleOpenFolder(folder.id)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FolderIcon color="primary" sx={{ mr: 1, fontSize: 30 }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="div">
                    {folder.name}
                  </Typography>
                  <Chip 
                    icon={getCategoryIcon(folder.category)}
                    label={folder.category_display || folder.category}
                    size="small"
                    color={getCategoryColor(folder.category) as any}
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {folder.description || 'No description'}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                {getContentCount(folder)} {folder.category === 'comments' ? 'comments' : folder.category === 'reels' ? 'reels' : 'posts'}
              </Typography>
              
              <Typography variant="caption" color="text.secondary" display="block">
                Created: {new Date(folder.created_at).toLocaleDateString()}
              </Typography>
            </CardContent>
            
            <CardActions sx={{ justifyContent: 'flex-end', p: 1 }}>
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditFolder(folder);
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton 
                size="small" 
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFolder(folder.id);
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </CardActions>
          </Card>
        </Box>
      ))}
    </Stack>
  );

  const renderListView = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Description</TableCell>
            <TableCell align="right">Content Count</TableCell>
            <TableCell>Created</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {folders.map((folder) => (
            <TableRow 
              key={folder.id} 
              onClick={() => handleOpenFolder(folder.id)}
              sx={{ 
                cursor: 'pointer', 
                '&:hover': { backgroundColor: 'action.hover' } 
              }}
            >
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FolderIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body1">{folder.name}</Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Chip 
                  icon={getCategoryIcon(folder.category)}
                  label={folder.category_display || folder.category}
                  size="small"
                  color={getCategoryColor(folder.category) as any}
                />
              </TableCell>
              <TableCell>{folder.description || 'No description'}</TableCell>
              <TableCell align="right">{getContentCount(folder)}</TableCell>
              <TableCell>{new Date(folder.created_at).toLocaleDateString()}</TableCell>
              <TableCell align="center">
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditFolder(folder);
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.id);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Instagram Data Folders
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              aria-label="view mode"
              size="small"
              sx={{ mr: 2 }}
            >
              <ToggleButton value="list" aria-label="list view">
                <Tooltip title="List View">
                  <ViewListIcon />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="grid" aria-label="grid view">
                <Tooltip title="Grid View">
                  <GridViewIcon />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleNewFolder}
              disabled={!projectId}
            >
              New Folder
            </Button>
          </Box>
        </Box>
        <Divider sx={{ mb: 4 }} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
            {error}
          </Paper>
        ) : folders.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              No folders yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Create a new folder to organize your Instagram data
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleNewFolder}
            >
              Create First Folder
            </Button>
          </Paper>
        ) : (
          viewMode === 'grid' ? renderGridView() : renderListView()
        )}
      </Box>

      {/* New Folder Dialog */}
      <Dialog 
        open={openNewFolderDialog} 
        onClose={() => {
          if (!isCreating && !isCreatingRef.current) {
            setOpenNewFolderDialog(false);
            // Reset form
            setFolderName('');
            setFolderDescription('');
            setFolderCategory('posts');
          }
        }}
      >
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            type="text"
            fullWidth
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            required
            variant="outlined"
            sx={{ mb: 2, mt: 1 }}
            disabled={isCreating}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={folderCategory}
              label="Category"
              onChange={(e) => setFolderCategory(e.target.value as 'posts' | 'reels' | 'comments')}
              disabled={isCreating}
            >
              <MenuItem value="posts">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PostAddIcon sx={{ mr: 1 }} />
                  Posts
                </Box>
              </MenuItem>
              <MenuItem value="reels">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <VideoLibraryIcon sx={{ mr: 1 }} />
                  Reels
                </Box>
              </MenuItem>
              <MenuItem value="comments">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CommentIcon sx={{ mr: 1 }} />
                  Comments
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            margin="dense"
            label="Description (optional)"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={folderDescription}
            onChange={(e) => setFolderDescription(e.target.value)}
            variant="outlined"
            disabled={isCreating}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              if (!isCreating && !isCreatingRef.current) {
                setOpenNewFolderDialog(false);
                // Reset form
                setFolderName('');
                setFolderDescription('');
                setFolderCategory('posts');
              }
            }}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCreateFolder();
            }}
            variant="contained" 
            color="primary"
            disabled={!folderName.trim() || isCreating || isCreatingRef.current}
            startIcon={isCreating ? <CircularProgress size={20} /> : undefined}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Folder Dialog */}
      <Dialog open={openEditFolderDialog} onClose={() => !isUpdating && !isUpdatingRef.current && setOpenEditFolderDialog(false)}>
        <DialogTitle>Edit Folder</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            type="text"
            fullWidth
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            required
            variant="outlined"
            sx={{ mb: 2, mt: 1 }}
            disabled={isUpdating}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={folderCategory}
              label="Category"
              onChange={(e) => setFolderCategory(e.target.value as 'posts' | 'reels' | 'comments')}
              disabled={isUpdating}
            >
              <MenuItem value="posts">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PostAddIcon sx={{ mr: 1 }} />
                  Posts
                </Box>
              </MenuItem>
              <MenuItem value="reels">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <VideoLibraryIcon sx={{ mr: 1 }} />
                  Reels
                </Box>
              </MenuItem>
              <MenuItem value="comments">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CommentIcon sx={{ mr: 1 }} />
                  Comments
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            margin="dense"
            label="Description (optional)"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={folderDescription}
            onChange={(e) => setFolderDescription(e.target.value)}
            variant="outlined"
            disabled={isUpdating}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              if (!isUpdating && !isUpdatingRef.current) {
                setOpenEditFolderDialog(false);
                setSelectedFolder(null);
              }
            }}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleUpdateFolder();
            }}
            variant="contained" 
            color="primary"
            disabled={!folderName.trim() || isUpdating || isUpdatingRef.current}
            startIcon={isUpdating ? <CircularProgress size={20} /> : undefined}
          >
            {isUpdating ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default InstagramFolders; 