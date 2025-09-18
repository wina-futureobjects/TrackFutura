import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Link,
  Breadcrumbs,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';
import HomeIcon from '@mui/icons-material/Home';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import axios from 'axios';

// Inline implementation of the API client to avoid path resolution issues
const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add request interceptor to include CSRF token
api.interceptors.request.use((config) => {
  // Get CSRF token from cookie if it exists
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];

  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken;
  }

  return config;
});

type Report = {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  report_count?: number;
  total_posts?: number;
  matched_posts?: number;
};

const ReportFolders = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Create/edit dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  
  // Delete dialog state
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { organizationId, projectId } = useParams<{ 
    organizationId?: string;
    projectId?: string;
  }>();
  
  // Also get project ID from URL query parameter if not in params
  const queryParams = new URLSearchParams(location.search);
  const queryProjectId = queryParams.get('project');
  
  // Use project ID from params or query string
  const effectiveProjectId = projectId || queryProjectId;

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Add project filter if projectId is available
      let url = '/api/track-accounts/reports/';
      if (effectiveProjectId) {
        url += `?project=${effectiveProjectId}`;
      }
      
      const response = await api.get(url);
      if (response.status === 200) {
        // Ensure response.data is an array
        if (Array.isArray(response.data)) {
          setReports(response.data);
        } else if (response.data.results && Array.isArray(response.data.results)) {
          // Handle paginated response
          setReports(response.data.results);
        } else {
          console.error('Unexpected API response format:', response.data);
          setReports([]);
          setError('Received unexpected data format from server');
        }
      } else {
        throw new Error('Failed to fetch reports');
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [effectiveProjectId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleOpenDialog = (mode: 'create' | 'edit', report?: Report) => {
    setDialogMode(mode);
    if (mode === 'edit' && report) {
      setCurrentReport(report);
      setReportName(report.name);
      setReportDescription(report.description || '');
    } else {
      setCurrentReport(null);
      setReportName('');
      setReportDescription('');
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setReportName('');
    setReportDescription('');
    setCurrentReport(null);
  };

  const handleSubmitReport = async () => {
    if (!reportName.trim()) {
      setSnackbar({
        open: true,
        message: 'Report name is required',
        severity: 'error'
      });
      return;
    }

    try {
      // Get current date for start_date and end_date
      const currentDate = new Date().toISOString();
      
      console.log('Creating report folder with data:', {
        name: reportName,
        description: reportDescription,
        start_date: currentDate,
        end_date: currentDate
      });

      if (dialogMode === 'create') {
        try {
          const response = await api.post('/api/track-accounts/reports/', {
            name: reportName,
            description: reportDescription,
            start_date: currentDate,  // Required field
            end_date: currentDate,    // Required field
            total_posts: 0,
            matched_posts: 0
          });
          
          console.log('Report creation response:', response);
          
          if (response.status === 201) {
            setSnackbar({
              open: true,
              message: 'Report folder created successfully',
              severity: 'success'
            });
            fetchReports();
          }
        } catch (err: any) {
          // Log the detailed error
          console.error('Detailed error when creating report folder:', err);
          if (err.response) {
            console.error('Error response data:', err.response.data);
            console.error('Error response status:', err.response.status);
          }
          throw err;  // Re-throw to be caught by the outer catch
        }
      } else if (dialogMode === 'edit' && currentReport) {
        const response = await api.put(`/api/track-accounts/reports/${currentReport.id}/`, {
          name: reportName,
          description: reportDescription,
          // Don't update start_date and end_date when editing
        });
        
        if (response.status === 200) {
          setSnackbar({
            open: true,
            message: 'Report folder updated successfully',
            severity: 'success'
          });
          fetchReports();
        }
      }
      handleCloseDialog();
    } catch (err: any) {
      console.error('Error saving report folder:', err);
      let errorMessage = 'Failed to save report folder';
      
      // Extract error message from response if available
      if (err.response && err.response.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        }
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  const handleOpenDeleteDialog = (report: Report) => {
    setReportToDelete(report);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setReportToDelete(null);
  };

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;
    
    try {
      const response = await api.delete(`/api/track-accounts/reports/${reportToDelete.id}/`);
      
      if (response.status === 204) {
        setSnackbar({
          open: true,
          message: 'Report folder deleted successfully',
          severity: 'success'
        });
        fetchReports();
      }
    } catch (err) {
      console.error('Error deleting report folder:', err);
      setSnackbar({
        open: true,
        message: 'Failed to delete report folder',
        severity: 'error'
      });
    }
    
    handleCloseDeleteDialog();
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleViewFolder = (folderId: number) => {
    if (organizationId && projectId) {
      navigate(`/organizations/${organizationId}/projects/${projectId}/report-folders/${folderId}`);
    } else if (effectiveProjectId) {
      navigate(`/report-folders/${folderId}?project=${effectiveProjectId}`);
    } else {
      navigate(`/report-folders/${folderId}`);
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

  const renderGridView = () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {Array.isArray(reports) && reports.map((report) => (
        <Box key={report.id} sx={{ width: { xs: '100%', sm: '46%', md: '30%' } }}>
          <Card>
            <CardContent sx={{ cursor: 'pointer' }} onClick={() => handleViewFolder(report.id)}>
              <Box display="flex" alignItems="center" mb={1}>
                <FolderIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  {report.name}
                </Typography>
              </Box>
              {report.description && (
                <Typography variant="body2" color="text.secondary">
                  {report.description}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Reports: {report.total_posts || 0} total / {report.matched_posts || 0} matched
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                Created: {new Date(report.created_at).toLocaleDateString()}
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: 'space-between' }}>
              <Box>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDialog('edit', report);
                  }}
                  aria-label="edit"
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDeleteDialog(report);
                  }}
                  aria-label="delete"
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              <Button
                variant="contained"
                size="small"
                color="primary"
                onClick={() => handleViewFolder(report.id)}
              >
                View Details
              </Button>
            </CardActions>
          </Card>
        </Box>
      ))}
    </Box>
  );

  const renderListView = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Description</TableCell>
            <TableCell align="right">Total Posts</TableCell>
            <TableCell align="right">Matched Posts</TableCell>
            <TableCell>Created</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {reports.map((report) => (
            <TableRow 
              key={report.id}
              hover
              onClick={() => handleViewFolder(report.id)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FolderIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body1">{report.name}</Typography>
                </Box>
              </TableCell>
              <TableCell>{report.description || 'No description'}</TableCell>
              <TableCell align="right">{report.total_posts || 0}</TableCell>
              <TableCell align="right">{report.matched_posts || 0}</TableCell>
              <TableCell>{new Date(report.created_at).toLocaleDateString()}</TableCell>
              <TableCell align="center">
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDialog('edit', report);
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDeleteDialog(report);
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

  if (loading && reports.length === 0) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading report folders...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">Report Folders</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label="view mode"
            size="small"
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
            onClick={() => handleOpenDialog('create')}
          >
            New Folder
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate('/report-folders/create/multi-platform')}
          >
            Create Multi-Platform Report
          </Button>
        </Box>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {reports.length === 0 && !loading ? (
        <Box textAlign="center" py={4}>
          <FolderIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6">No report folders yet</Typography>
          <Typography color="text.secondary" mb={2}>
            Create your first report folder to organize your reports
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('create')}
          >
            Create Report Folder
          </Button>
        </Box>
      ) : (
        viewMode === 'grid' ? renderGridView() : renderListView()
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Create New Report Folder' : 'Edit Report Folder'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {dialogMode === 'create'
              ? 'Enter the details to create a new report folder.'
              : 'Update the details of this report folder.'}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Folder Name"
            type="text"
            fullWidth
            variant="outlined"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="description"
            label="Description (Optional)"
            type="text"
            fullWidth
            variant="outlined"
            value={reportDescription}
            onChange={(e) => setReportDescription(e.target.value)}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSubmitReport} color="primary" variant="contained">
            {dialogMode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Report Folder</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the folder "{reportToDelete?.name}"?
            {reportToDelete?.report_count && reportToDelete.report_count > 0 && (
              <strong> This folder contains {reportToDelete.report_count} report(s).</strong>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDeleteReport} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ReportFolders; 