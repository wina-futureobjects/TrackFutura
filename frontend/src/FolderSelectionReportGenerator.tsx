import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Breadcrumbs,
  Link,
  Checkbox,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  TextField,
  InputAdornment,
  FormGroup,
  FormControlLabel,
  Chip,
  LinearProgress,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InstagramIcon from '@mui/icons-material/Instagram';
import axios from 'axios';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

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

interface InstagramFolder {
  id: number;
  name: string;
  description: string | null;
  post_count: number;
  created_at: string;
  updated_at: string;
}

interface ReportParams {
  name: string;
  description: string;
  start_date: Date;
  end_date: Date;
  folder_ids: number[];
}

const InstagramFolderSelector = () => {
  const navigate = useNavigate();
  const { reportId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [folders, setFolders] = useState<InstagramFolder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [reportParams, setReportParams] = useState<ReportParams>({
    name: '',
    description: '',
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)), // Default to last 30 days
    end_date: new Date(),
    folder_ids: [],
  });
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  useEffect(() => {
    if (reportId) {
      fetchReportDetails();
    }
    fetchInstagramFolders();
  }, [reportId]);

  const fetchReportDetails = async () => {
    try {
      setReportLoading(true);
      const response = await api.get(`/api/track-accounts/reports/${reportId}/`);
      if (response.status === 200) {
        const data = response.data;
        setReportData(data);
        setReportParams(prev => ({
          ...prev,
          name: data.name,
          description: data.description || '',
          start_date: new Date(data.start_date),
          end_date: new Date(data.end_date),
        }));
      }
    } catch (error) {
      console.error('Error fetching report details:', error);
      showSnackbar('Failed to load report details', 'error');
    } finally {
      setReportLoading(false);
    }
  };

  const fetchInstagramFolders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/instagram-data/folders/');
      if (response.status === 200) {
        const folderData = response.data.results || response.data;
        console.log('Fetched folders:', folderData); // Debug log
        if (folderData.length > 0) {
          // Check to confirm post_count is coming from API
          console.log('First folder post_count:', folderData[0].post_count);
        }
        setFolders(folderData);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
      showSnackbar('Failed to load Instagram folders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderToggle = (folderId: number) => {
    setReportParams(prev => {
      const currentIds = [...prev.folder_ids];
      if (currentIds.includes(folderId)) {
        return { ...prev, folder_ids: currentIds.filter(id => id !== folderId) };
      } else {
        return { ...prev, folder_ids: [...currentIds, folderId] };
      }
    });
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleBackToReport = () => {
    navigate(`/report-folders/${reportId}`);
  };

  const handleDateChange = (field: 'start_date' | 'end_date', date: Date | null) => {
    if (date) {
      setReportParams(prev => ({
        ...prev,
        [field]: date
      }));
    }
  };

  const handleGenerateReport = async () => {
    if (reportParams.folder_ids.length === 0) {
      showSnackbar('Please select at least one Instagram folder', 'error');
      return;
    }

    try {
      setGenerating(true);
      
      // Add entries to the existing report
      const response = await api.post(`/api/track-accounts/reports/${reportId}/add_instagram_data/`, {
        folder_ids: reportParams.folder_ids,
        start_date: reportParams.start_date.toISOString(),
        end_date: reportParams.end_date.toISOString(),
        append_entries: true  // Flag to indicate we want to add entries, not replace
      });
      
      console.log('API response:', response.data);
      
      if (response.status === 200 || response.status === 201) {
        const newPostsAdded = response.data.new_posts_added || 0;
        const postsSkipped = response.data.posts_skipped || 0;
        const totalPosts = response.data.total_posts || 0;
        const matchPercentage = response.data.match_percentage || 0;
        
        let message = '';
        let severity: 'success' | 'info' | 'warning' | 'error' = 'success';
        
        if (newPostsAdded > 0) {
          message = `Successfully added ${newPostsAdded} new posts to report! Match rate: ${matchPercentage}%.`;
          if (postsSkipped > 0) {
            message += ` (${postsSkipped} posts were already in the report and skipped.)`;
          }
        } else if (postsSkipped > 0) {
          message = `No new posts added. All ${postsSkipped} posts were already in this report.`;
          severity = 'info';
        } else {
          message = 'No posts found in the selected folders.';
          severity = 'warning';
        }
        
        showSnackbar(message, severity);
        
        // Navigate back to the report detail page
        setTimeout(() => {
          navigate(`/report-folders/${reportId}`);
        }, 2000); // Longer delay to show success message
      } else {
        throw new Error('Failed to add Instagram data to report');
      }
    } catch (error) {
      console.error('Error adding Instagram data to report:', error);
      showSnackbar(
        'Failed to add Instagram data to report. Please check the console for details.', 
        'error'
      );
    } finally {
      setGenerating(false);
    }
  };

  // Filter folders based on search term
  const filteredFolders = folders.filter(folder => 
    folder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (folder.description && folder.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center' }}
          color="inherit"
          href="/"
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Home
        </Link>
        <Link
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center' }}
          color="inherit"
          href="/report-folders"
        >
          <DescriptionIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Report Folders
        </Link>
        <Link
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center' }}
          color="inherit"
          onClick={handleBackToReport}
          style={{ cursor: 'pointer' }}
        >
          <FolderIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          {reportData?.name || 'Report Details'}
        </Link>
        <Typography
          sx={{ display: 'flex', alignItems: 'center' }}
          color="text.primary"
        >
          Select Instagram Data
        </Typography>
      </Breadcrumbs>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Select Instagram Data for Report
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToReport}
          >
            Back to Report
          </Button>
        </Box>

        <Typography variant="body1" color="text.secondary" paragraph>
          Select Instagram folders to include in your report and set the date range.
        </Typography>

        {/* Report Details Display */}
        {reportLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={20} />
          </Box>
        ) : reportData ? (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Report: {reportData.name}
            </Typography>
            {reportData.description && (
              <Typography variant="body2" color="text.secondary" paragraph>
                {reportData.description}
              </Typography>
            )}
          </Box>
        ) : null}

        {/* Date Range Selection */}
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Date Range (Optional)
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Date range is for reference only. All posts from selected folders will be included regardless of date.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
              <DatePicker
                label="Start Date (Optional)"
                value={reportParams.start_date}
                onChange={(date) => handleDateChange('start_date', date)}
              />
              <DatePicker
                label="End Date (Optional)"
                value={reportParams.end_date}
                onChange={(date) => handleDateChange('end_date', date)}
              />
            </Box>
          </Box>
        </LocalizationProvider>

        <Divider sx={{ my: 3 }} />

        {/* Folder Selection Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Select Instagram Folders
          </Typography>
          <TextField
            fullWidth
            placeholder="Search folders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            margin="normal"
            variant="outlined"
            sx={{ mb: 2 }}
          />

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredFolders.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No Instagram folders found. Please create folders in the Instagram Data section first.
              </Typography>
            </Box>
          ) : (
            <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto', mt: 2 }}>
              <List dense>
                {filteredFolders.map((folder) => (
                  <React.Fragment key={folder.id}>
                    <ListItemButton
                      onClick={() => handleFolderToggle(folder.id)}
                      selected={reportParams.folder_ids.includes(folder.id)}
                      dense
                    >
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={reportParams.folder_ids.includes(folder.id)}
                          tabIndex={-1}
                          disableRipple
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={folder.name} 
                        secondary={
                          <>
                            {folder.description && <span>{folder.description}<br /></span>}
                            <span>{typeof folder.post_count === 'number' ? folder.post_count : 'Unknown'} posts</span>
                          </>
                        }
                      />
                      <InstagramIcon color="action" />
                    </ListItemButton>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Selected folders: {reportParams.folder_ids.length}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {reportParams.folder_ids.map((id) => {
                const folder = folders.find(f => f.id === id);
                return folder && (
                  <Chip 
                    key={id}
                    label={`${folder.name} (${folder.post_count || 0} posts)`}
                    onDelete={() => handleFolderToggle(id)}
                    color="primary"
                    variant="outlined"
                  />
                );
              })}
            </Box>
          </Box>
        </Box>

        {generating && (
          <Box sx={{ width: '100%', mb: 3 }}>
            <Typography variant="body2" gutterBottom align="center">
              Adding Instagram data to report...
            </Typography>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mt: 1 }}>
              This might take a moment depending on the amount of data being processed
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateReport}
            disabled={generating || reportParams.folder_ids.length === 0}
          >
            Generate Report
          </Button>
        </Box>
      </Paper>

      {/* Snackbar */}
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

export default InstagramFolderSelector; 