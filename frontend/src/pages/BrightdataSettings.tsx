import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Stack,
  Tooltip,
  Breadcrumbs,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { Link } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import MusicVideoIcon from '@mui/icons-material/MusicVideo';
import { apiFetch } from '../utils/api';

interface BrightdataConfig {
  id: number;
  name: string;
  platform: string;
  platform_display: string;
  dataset_id: string;
  api_token: string;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

const BrightdataSettings = () => {
  const [configs, setConfigs] = useState<BrightdataConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [description, setDescription] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [datasetId, setDatasetId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<number | null>(null);
  
  // Test connection state
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    success?: boolean;
    message?: string;
    token?: string;
  } | null>(null);

  const platformOptions = [
    { 
      value: 'facebook_posts', 
      label: 'Facebook Posts', 
      icon: <FacebookIcon />,
      color: '#1877F2',
      description: 'Scrape Facebook posts and content'
    },
    { 
      value: 'facebook_reels', 
      label: 'Facebook Reels', 
      icon: <FacebookIcon />,
      color: '#1877F2',
      description: 'Collect Facebook video content'
    },
    { 
      value: 'facebook_comments', 
      label: 'Facebook Comments', 
      icon: <FacebookIcon />,
      color: '#1877F2',
      description: 'Extract comment data from posts'
    },
    { 
      value: 'instagram_posts', 
      label: 'Instagram Posts', 
      icon: <InstagramIcon />,
      color: '#E4405F',
      description: 'Scrape Instagram posts and images'
    },
    { 
      value: 'instagram_reels', 
      label: 'Instagram Reels', 
      icon: <InstagramIcon />,
      color: '#E4405F',
      description: 'Collect Instagram video content'
    },
    { 
      value: 'instagram_comments', 
      label: 'Instagram Comments', 
      icon: <InstagramIcon />,
      color: '#E4405F',
      description: 'Extract comment data from posts'
    },
    { 
      value: 'linkedin_posts', 
      label: 'LinkedIn Posts', 
      icon: <LinkedInIcon />,
      color: '#0A66C2',
      description: 'Scrape LinkedIn posts and articles'
    },
    { 
      value: 'tiktok_posts', 
      label: 'TikTok Posts', 
      icon: <MusicVideoIcon />,
      color: '#000000',
      description: 'Collect TikTok video content'
    },
  ];

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/brightdata/configs/');
      if (!response.ok) {
        throw new Error('Failed to fetch configurations');
      }
      const responseData = await response.json();
      
      // Handle paginated response format (results array) or direct array
      const data = responseData.results || responseData;
      
      // Ensure data is an array before setting state
      const configsArray = Array.isArray(data) ? data : [];
      setConfigs(configsArray);
      
      // Check if there's an active configuration
      const hasActive = configsArray.some((config) => config.is_active);
      
      if (!hasActive && configsArray.length > 0) {
        setError('No active Brightdata configuration found. Please set one in the settings.');
      }
    } catch (error) {
      console.error('Error fetching configs:', error);
      setError('Failed to load Brightdata configurations');
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConfig = () => {
    setEditId(null);
    setName('');
    setPlatform('');
    setDescription('');
    setApiToken('');
    setDatasetId('');
    setFormOpen(true);
  };

  const handleEditConfig = (config: BrightdataConfig) => {
    setEditId(config.id);
    setName(config.name);
    setPlatform(config.platform);
    setDescription(config.description || '');
    setApiToken(''); // Don't set the API token for security reasons
    setDatasetId(config.dataset_id);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
  };

  const handleSubmit = async () => {
    if (!name || !platform || !datasetId || (editId === null && !apiToken)) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload: any = {
        name,
        platform,
        dataset_id: datasetId,
        description: description || '',
      };
      
      // Only include API token for new configs or if the user has entered a new one
      if (apiToken) {
        payload.api_token = apiToken;
      }
      
      const url = editId !== null 
        ? `/api/brightdata/configs/${editId}/` 
        : '/api/brightdata/configs/';
      
      const method = editId !== null ? 'PATCH' : 'POST';
      
      console.log('Submitting config:', url, method, payload);
      
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

      setSuccessMessage(editId !== null ? 'Configuration updated successfully' : 'Configuration created successfully');
      fetchConfigs();
      setFormOpen(false);
    } catch (error: any) {
      console.error('Error saving config:', error);
      setError(error.message || 'Error saving configuration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetActive = async (configId: number) => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/brightdata/configs/${configId}/set_active/`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to set configuration as active');
      }

      setSuccessMessage('Configuration set as active');
      fetchConfigs();
    } catch (error) {
      console.error('Error setting active config:', error);
      setError('Failed to set configuration as active');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (configId: number) => {
    setConfigToDelete(configId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (configToDelete === null) return;
    
    try {
      setLoading(true);
      const response = await apiFetch(`/api/brightdata/configs/${configToDelete}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete configuration');
      }

      setSuccessMessage('Configuration deleted successfully');
      fetchConfigs();
    } catch (error) {
      console.error('Error deleting config:', error);
      setError('Failed to delete configuration');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setConfigToDelete(null);
  };

  const handleCloseSnackbar = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const testBrightDataConnection = async () => {
    try {
      setTestingConnection(true);
      setConnectionStatus(null);
      
      const response = await apiFetch('/api/scrapy/api/jobs/test_brightdata_connection/');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Connection test failed');
      }
      
      const data = await response.json();
      setConnectionStatus(data);
      
      if (data.success) {
        setSuccessMessage('Successfully connected to Bright Data API!');
      } else {
        setError(data.message || 'Connection test failed');
      }
      
    } catch (error: any) {
      console.error('Connection test error:', error);
      setConnectionStatus({
        success: false,
        message: error.message || 'Failed to test connection'
      });
      setError(error.message || 'Failed to test connection to Bright Data API');
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />
            Home
          </Link>
          <Typography sx={{ display: 'flex', alignItems: 'center' }} color="text.primary">
            <SettingsIcon sx={{ mr: 0.5 }} fontSize="small" />
            Brightdata Settings
          </Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" gutterBottom component="h1">
          Brightdata API Settings
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Manage your platform-specific Brightdata API configurations for automated data scraping. Each platform requires its own configuration with a unique dataset ID.
        </Typography>
      </Box>

      {/* Connection Test Card */}
      <Card sx={{ mb: 4, border: connectionStatus?.success ? '2px solid #28a745' : '1px solid #dee2e6' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">
              Bright Data Local API Connection
            </Typography>
            <Button 
              variant="outlined" 
              onClick={testBrightDataConnection}
              disabled={testingConnection}
              startIcon={testingConnection ? <CircularProgress size={16} /> : undefined}
            >
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </Button>
          </Stack>

          <Typography variant="body2" sx={{ mb: 2, color: '#6c757d' }}>
            Test connection to your local Bright Data API at <code>http://127.0.0.1:22999</code>. 
            This new integration replaces the old Apify scraper with direct Bright Data API calls.
          </Typography>

          {connectionStatus && (
            <Alert 
              severity={connectionStatus.success ? 'success' : 'error'}
              sx={{ mt: 2 }}
            >
              <Typography variant="body2">
                <strong>Status:</strong> {connectionStatus.message}
              </Typography>
              {connectionStatus.success && connectionStatus.token && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>API Token:</strong> {connectionStatus.token.substring(0, 20)}...
                </Typography>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

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
             The automated batch scraper requires separate Brightdata configurations for each social media platform. 
             Each platform uses different dataset structures and may require different API tokens.
           </Typography>
           
           <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
             {platformOptions.map((platform) => {
               const hasConfig = configs.some(c => c.platform === platform.value);
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
           
           <Box sx={{ mt: 3, p: 2, backgroundColor: '#f8f9fa', borderRadius: 1, border: '1px solid #e9ecef' }}>
             <Typography variant="body2" sx={{ color: '#6c757d', textAlign: 'center' }}>
               💡 <strong>Tip:</strong> Configure at least one platform to enable automated data scraping. 
               Each platform requires a unique Brightdata dataset ID and API token.
             </Typography>
           </Box>
         </CardContent>
       </Card>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">
              API Configurations
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={handleCreateConfig}
            >
              Add New Configuration
            </Button>
          </Stack>

          {loading && configs.length === 0 ? (
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
                  {!Array.isArray(configs) || configs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No configurations found. Click "Add New Configuration" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    configs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell>
                          <Tooltip title={config.is_active ? "Active Configuration" : "Set as Active"}>
                            <IconButton 
                              color={config.is_active ? "primary" : "default"} 
                              onClick={() => !config.is_active && handleSetActive(config.id)}
                              disabled={config.is_active}
                            >
                              {config.is_active ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {platformOptions.find(p => p.value === config.platform)?.icon}
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
                          <IconButton onClick={() => handleEditConfig(config)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => handleDeleteClick(config.id)} color="error">
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

      <Dialog open={formOpen} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <DialogTitle>{editId !== null ? 'Edit Configuration' : 'Add New Configuration'}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {editId !== null 
              ? 'Update your Brightdata API configuration.' 
              : 'Create a new Brightdata API configuration for data scraping.'}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Configuration Name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Platform</InputLabel>
            <Select
              value={platform}
              onChange={(e: SelectChangeEvent) => setPlatform(e.target.value)}
              label="Platform"
            >
              {platformOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {option.icon}
                    <Typography sx={{ ml: 1 }}>{option.label}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mb: 2 }}
            helperText="A brief description of this configuration"
          />
          <TextField
            margin="dense"
            label="Dataset ID"
            fullWidth
            value={datasetId}
            onChange={(e) => setDatasetId(e.target.value)}
            sx={{ mb: 2 }}
            helperText="The ID of the Brightdata dataset (found in the dataset settings)"
          />
          <TextField
            margin="dense"
            label="API Token"
            type="password"
            fullWidth
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            helperText={editId !== null 
              ? "Leave blank to keep the current API token" 
              : "Your Brightdata API token (found in your account settings)"}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary" 
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

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

      <Snackbar 
        open={!!error || !!successMessage} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={error ? "error" : "success"} 
          sx={{ width: '100%' }}
        >
          {error || successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default BrightdataSettings; 