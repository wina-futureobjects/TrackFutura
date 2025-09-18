import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Breadcrumbs,
  Stack,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  FormGroup,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  Switch,
  Divider
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import CommentIcon from '@mui/icons-material/Comment';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FolderIcon from '@mui/icons-material/Folder';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import SettingsIcon from '@mui/icons-material/Settings';
import { apiFetch } from '../utils/api';

interface BrightdataConfig {
  id: number;
  name: string;
  platform: string;
  platform_display: string;
  is_active: boolean;
}

interface Folder {
  id: number;
  name: string;
  description: string | null;
  post_count: number;
  created_at: string;
}

interface CommentScrapingJob {
  id: number;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  selected_folders: number[];
  comment_limit: number;
  get_all_replies: boolean;
  total_posts: number;
  processed_posts: number;
  total_comments_scraped: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_log: string | null;
}

interface CommentScraperRequest {
  platform: string;
  post_urls?: string[];
  comment_limit: number;
  get_all_replies: boolean;
  result_folder_name: string;
  // For folder-based scraping
  selected_folders?: number[];
  job_name?: string;
  project_id?: number;
}

const CommentsScraper: React.FC = () => {
  const location = useLocation();
  
  // Extract project ID from URL path: /organizations/3/projects/14/comments-scraper
  const pathMatch = location.pathname.match(/\/organizations\/\d+\/projects\/(\d+)/);
  const projectId = pathMatch ? pathMatch[1] : null;
  
  console.log('🔍 Comments Scraper - Current URL:', location.pathname);
  console.log('🔍 Comments Scraper - Extracted Project ID:', projectId);

  // BrightData configurations
  const [configs, setConfigs] = useState<BrightdataConfig[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Platform and scraping mode
  const [platform, setPlatform] = useState<string>('facebook_comments');
  const [useFolderMode, setUseFolderMode] = useState<boolean>(true);
  
  // URL-based scraping (legacy mode)
  const [postUrls, setPostUrls] = useState<string>('');
  
  // Folder-based scraping
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<number[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  
  // Job management
  const [jobs, setJobs] = useState<CommentScrapingJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [openJobDialog, setOpenJobDialog] = useState(false);
  const [jobName, setJobName] = useState('');
  
  // Scraping parameters
  const [commentLimit, setCommentLimit] = useState<number>(10);
  const [getAllReplies, setGetAllReplies] = useState<boolean>(false);
  const [resultFolderName, setResultFolderName] = useState<string>('');
  
  // UI state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const commentPlatforms = [
    { value: 'facebook_comments', label: 'Facebook Comments', icon: <FacebookIcon />, api_endpoint: '/api/facebook-data/' },
    { value: 'instagram_comments', label: 'Instagram Comments', icon: <InstagramIcon />, api_endpoint: '/api/instagram-data/' },
  ];

  useEffect(() => {
    fetchConfigs();
    if (useFolderMode) {
      fetchFolders();
      fetchJobs();
    }
  }, [platform, useFolderMode, projectId]);

  const fetchConfigs = async () => {
    try {
      const response = await apiFetch('/api/brightdata/configs/');
      if (response.ok) {
        const data = await response.json();
        const configsArray = data.results || data;
        // Filter to only show comment-related configurations
        const commentConfigs = configsArray.filter((config: BrightdataConfig) => 
          config.platform.includes('comments')
        );
        setConfigs(commentConfigs);
      }
    } catch (error) {
      console.error('Error fetching configs:', error);
      setError('Failed to load configurations');
    }
  };

  const fetchFolders = async () => {
    if (!useFolderMode) return;
    
    try {
      setLoadingFolders(true);
      const platformInfo = commentPlatforms.find(p => p.value === platform);
      if (!platformInfo) {
        console.error('❌ Platform info not found for platform:', platform);
        return;
      }

      const url = projectId 
        ? `${platformInfo.api_endpoint}folders/?project=${projectId}` 
        : `${platformInfo.api_endpoint}folders/`;
      
      console.log('🔍 Comments Scraper - Fetching folders from:', url);
      console.log('🔍 Platform:', platform, 'Project ID:', projectId);
      
      const response = await apiFetch(url);
      console.log('📥 Folders API response status:', response.status, 'OK:', response.ok);
      
      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }
      
      const data = await response.json();
      console.log('📊 Folders API response data:', data);
      console.log('📊 Folders response structure:', {
        hasResults: 'results' in data,
        resultsLength: data.results?.length || 0,
        isArray: Array.isArray(data),
        arrayLength: Array.isArray(data) ? data.length : 0,
        dataType: typeof data,
        dataKeys: Object.keys(data || {})
      });
      
      const foldersData = data.results || data;
      console.log('📁 Processed folders data:', foldersData);
      console.log('📁 Setting folders with length:', Array.isArray(foldersData) ? foldersData.length : 0);
      
      setFolders(Array.isArray(foldersData) ? foldersData : []);
    } catch (error) {
      console.error('❌ Error fetching folders:', error);
      setError('Failed to load folders. Please try again.');
      setFolders([]);
    } finally {
      setLoadingFolders(false);
    }
  };

  const fetchJobs = async () => {
    if (!useFolderMode) return;
    
    try {
      setLoadingJobs(true);
      
      // Determine the correct API endpoint based on platform
      const platformInfo = commentPlatforms.find(p => p.value === platform);
      if (!platformInfo) return;

      const url = projectId 
        ? `${platformInfo.api_endpoint}comment-scraping-jobs/?project=${projectId}` 
        : `${platformInfo.api_endpoint}comment-scraping-jobs/`;
      
      const response = await apiFetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      
      const data = await response.json();
      const jobsData = data.results || data;
      setJobs(Array.isArray(jobsData) ? jobsData : []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setError('Failed to load scraping jobs. Please try again.');
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handlePlatformChange = (event: SelectChangeEvent) => {
    setPlatform(event.target.value);
    setSelectedFolders([]);
    setError(null);
  };

  const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUseFolderMode(event.target.checked);
    setSelectedFolders([]);
    setPostUrls('');
    setError(null);
  };

  const createScrapingJob = async () => {
    if (!jobName.trim()) {
      setError('Job name is required');
      return;
    }

    if (!resultFolderName.trim()) {
      setError('Result folder name is required');
      return;
    }

    if (selectedFolders.length === 0) {
      setError('Please select at least one folder');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Determine the correct API endpoint based on platform
      const platformInfo = commentPlatforms.find(p => p.value === platform);
      if (!platformInfo) {
        setError('Invalid platform selected');
        return;
      }

      const endpoint = `${platformInfo.api_endpoint}comment-scraping-jobs/create_job/`;

      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: jobName,
          project_id: projectId ? parseInt(projectId, 10) : null,
          selected_folders: selectedFolders,
          comment_limit: commentLimit,
          get_all_replies: getAllReplies,
          result_folder_name: resultFolderName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create scraping job');
      }

      const result = await response.json();
      
      if (result.success) {
        setSuccess(`Comment scraping job created and submitted successfully! Results will be saved to folder: ${resultFolderName}`);
        setOpenJobDialog(false);
        setJobName('');
        setResultFolderName('');
        setSelectedFolders([]);
        setCommentLimit(10);
        setGetAllReplies(false);
        fetchJobs(); // Refresh jobs list
      } else {
        setError('Job created but submission failed. Check your BrightData configuration.');
      }
    } catch (error) {
      console.error('Error creating scraping job:', error);
      setError(error instanceof Error ? error.message : 'Failed to create scraping job');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitUrls = async () => {
    if (!postUrls.trim()) {
      setError('Please enter at least one post URL');
      return;
    }

    if (!resultFolderName.trim()) {
      setError('Please enter a result folder name');
      return;
    }

    // Check if platform configuration exists
    const platformConfig = configs.find(config => 
      config.platform === platform && config.is_active
    );

    if (!platformConfig) {
      setError(`No active configuration found for ${platform}. Please configure it in BrightData Settings.`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const urlList = postUrls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      const payload: CommentScraperRequest = {
        platform,
        post_urls: urlList,
        comment_limit: commentLimit,
        get_all_replies: getAllReplies,
        result_folder_name: resultFolderName
      };

      const response = await apiFetch('/api/comments/scrape/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Comment scraping job submitted successfully! Job ID: ${data.job_id || 'N/A'}`);
        // Reset form
        setPostUrls('');
        setResultFolderName('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit comment scraping job');
      }
    } catch (error) {
      setError('Error submitting comment scraping job');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platformValue: string) => {
    const platform = commentPlatforms.find(p => p.value === platformValue);
    return platform?.icon || <CommentIcon />;
  };

  const handleCloseSnackbar = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />
            Home
          </Link>
          <Typography sx={{ display: 'flex', alignItems: 'center' }} color="text.primary">
            <CommentIcon sx={{ mr: 0.5 }} fontSize="small" />
            Comments Scraper
          </Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" gutterBottom component="h1">
          Cross-Platform Comments Scraper
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          Scrape comments from social media posts across different platforms using BrightData's API.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Platform Status Cards */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Platform Status
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {commentPlatforms.map((platformOption) => {
              const config = configs.find(c => c.platform === platformOption.value);
              const isConfigured = config && config.is_active;
              
              return (
                <Card key={platformOption.value} sx={{ 
                  flex: 1,
                  border: isConfigured ? 2 : 1, 
                  borderColor: isConfigured ? 'success.main' : 'grey.300',
                  backgroundColor: isConfigured ? 'success.50' : 'grey.50'
                }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      {platformOption.icon}
                      <Box>
                        <Typography variant="h6">{platformOption.label}</Typography>
                        <Chip 
                          label={isConfigured ? 'Ready' : 'Not Configured'} 
                          color={isConfigured ? 'success' : 'warning'} 
                          size="small"
                        />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Box>

        {/* Mode Selection */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Configuration
          </Typography>
          
          <Stack spacing={3}>
            <Box>
              <FormControl fullWidth>
                <InputLabel>Platform</InputLabel>
                <Select
                  value={platform}
                  onChange={handlePlatformChange}
                  label="Platform"
                  startAdornment={getPlatformIcon(platform)}
                >
                  {commentPlatforms.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {option.icon}
                        {option.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={useFolderMode}
                    onChange={handleModeChange}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">
                      Use Folder Selection Mode
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {useFolderMode 
                        ? 'Select from existing folders containing posts' 
                        : 'Manually enter post URLs'
                      }
                    </Typography>
                  </Box>
                }
              />
            </Box>
          </Stack>
        </Paper>

        {/* Folder Mode - Show Folders and Jobs */}
        {useFolderMode && (
          <>
            {/* Action Buttons */}
            <Box sx={{ mb: 4 }}>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<CommentIcon />}
                  onClick={() => setOpenJobDialog(true)}
                  disabled={loadingFolders || folders.length === 0}
                >
                  New Comment Scraping Job
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    fetchFolders();
                    fetchJobs();
                  }}
                >
                  Refresh
                </Button>
              </Stack>
            </Box>

            {/* Available Folders */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Available {commentPlatforms.find(p => p.value === platform)?.label.split(' ')[0]} Folders
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                These folders contain posts that can be used for comment scraping
              </Typography>

              {loadingFolders ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : folders.length === 0 ? (
                <Alert severity="info">
                  No folders found for {commentPlatforms.find(p => p.value === platform)?.label.split(' ')[0]} in this project. 
                  {projectId ? (
                    <><br/>Project ID: {projectId}. Please ensure you have created folders and uploaded data in this project, or try switching to URL-based scraping below.</>
                  ) : (
                    <><br/>No project context found. Please navigate to this page from within a project.</>
                  )}
                </Alert>
              ) : (
                <List>
                  {folders.map((folder) => (
                    <ListItem key={folder.id} sx={{ pl: 0 }}>
                      <ListItemIcon>
                        <FolderIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={folder.name}
                        secondary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption">
                              {folder.post_count} posts
                            </Typography>
                            {folder.description && (
                              <Typography variant="caption" color="text.secondary">
                                • {folder.description}
                              </Typography>
                            )}
                          </Stack>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>

            {/* Jobs Section - Only for Facebook for now */}
            {platform === 'facebook_comments' && (
              <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Comment Scraping Jobs
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Track the status of your comment scraping jobs
                </Typography>

                {loadingJobs ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : jobs.length === 0 ? (
                  <Alert severity="info">
                    No comment scraping jobs found. Create your first job to get started.
                  </Alert>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Job Name</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Folders</TableCell>
                          <TableCell>Comment Limit</TableCell>
                          <TableCell>Progress</TableCell>
                          <TableCell>Comments</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {jobs.map((job) => (
                          <TableRow key={job.id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {job.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={job.status}
                                color={
                                  job.status === 'completed' ? 'success' :
                                  job.status === 'processing' ? 'warning' :
                                  job.status === 'failed' ? 'error' : 'default'
                                }
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {job.selected_folders.length} folders
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {job.comment_limit}
                                {job.get_all_replies && ' + replies'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {job.processed_posts}/{job.total_posts} posts
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {job.total_comments_scraped}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {new Date(job.created_at).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1}>
                                {job.status === 'completed' && (
                                  <Tooltip title="Download Comments">
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        console.log('Download comments for job:', job.id);
                                      }}
                                    >
                                      <DownloadIcon />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {job.error_log && (
                                  <Tooltip title={job.error_log}>
                                    <Chip label="Error" color="error" size="small" />
                                  </Tooltip>
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            )}
          </>
        )}

        {/* URL Mode - Legacy Manual URL Entry */}
        {!useFolderMode && (
          <Paper sx={{ p: 4, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Manual URL Entry Mode
            </Typography>
            
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Result Folder Name"
                value={resultFolderName}
                onChange={(e) => setResultFolderName(e.target.value)}
                placeholder="e.g., Comments_Campaign_2024"
                helperText="Name for the folder where scraped comments will be stored"
              />

              <TextField
                fullWidth
                multiline
                rows={6}
                label="Post URLs"
                value={postUrls}
                onChange={(e) => setPostUrls(e.target.value)}
                placeholder="Enter post URLs, one per line:
https://www.facebook.com/example/posts/123
https://www.facebook.com/example/posts/456"
                helperText="Enter the URLs of posts you want to scrape comments from (one URL per line)"
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Comment Limit per Post"
                  value={commentLimit}
                  onChange={(e) => setCommentLimit(parseInt(e.target.value) || 0)}
                  inputProps={{ min: 0 }}
                  helperText="0 = no limit"
                />

                <FormControl fullWidth>
                  <InputLabel>Include Replies</InputLabel>
                  <Select
                    value={getAllReplies ? 'yes' : 'no'}
                    onChange={(e) => setGetAllReplies(e.target.value === 'yes')}
                    label="Include Replies"
                  >
                    <MenuItem value="no">Comments Only</MenuItem>
                    <MenuItem value="yes">Comments + All Replies</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Button
                variant="contained"
                size="large"
                startIcon={loading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                onClick={handleSubmitUrls}
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? 'Submitting...' : 'Start Comment Scraping'}
              </Button>
            </Stack>
          </Paper>
        )}

        {/* Job Creation Dialog */}
        <Dialog
          open={openJobDialog}
          onClose={() => setOpenJobDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Create Comment Scraping Job</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                label="Job Name"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                fullWidth
                required
                placeholder="e.g., Comments for Campaign Analysis"
              />

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Select Folders
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Choose the {commentPlatforms.find(p => p.value === platform)?.label.split(' ')[0]} post folders to scrape comments from
                </Typography>
                
                <FormGroup>
                  {folders.map((folder) => (
                    <FormControlLabel
                      key={folder.id}
                      control={
                        <Checkbox
                          checked={selectedFolders.includes(folder.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFolders([...selectedFolders, folder.id]);
                            } else {
                              setSelectedFolders(selectedFolders.filter(id => id !== folder.id));
                            }
                          }}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">
                            {folder.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {folder.post_count} posts
                            {folder.description && ` • ${folder.description}`}
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                </FormGroup>

                {selectedFolders.length > 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Selected {selectedFolders.length} folder(s) with{' '}
                    {folders
                      .filter(f => selectedFolders.includes(f.id))
                      .reduce((sum, f) => sum + f.post_count, 0)}{' '}
                    total posts
                  </Alert>
                )}
              </Box>

              <TextField
                label="Comment Limit per Post"
                type="number"
                value={commentLimit}
                onChange={(e) => setCommentLimit(parseInt(e.target.value) || 0)}
                fullWidth
                inputProps={{ min: 0, max: 100 }}
                helperText="Maximum number of comments to scrape per post (0 = unlimited)"
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={getAllReplies}
                    onChange={(e) => setGetAllReplies(e.target.checked)}
                  />
                }
                label="Get all replies to comments"
              />

              <TextField
                label="Result Folder Name"
                value={resultFolderName}
                onChange={(e) => setResultFolderName(e.target.value)}
                fullWidth
                required
                placeholder="e.g., Campaign Analysis Results"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenJobDialog(false)}>Cancel</Button>
            <Button
              onClick={createScrapingJob}
              variant="contained"
              disabled={loading || !jobName.trim() || !resultFolderName.trim() || selectedFolders.length === 0}
              startIcon={loading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
            >
              {loading ? 'Creating...' : 'Create & Run Job'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar 
          open={!!error || !!success} 
          autoHideDuration={6000} 
          onClose={handleCloseSnackbar}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={error ? "error" : "success"} 
            sx={{ width: '100%' }}
          >
            {error || success}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default CommentsScraper; 