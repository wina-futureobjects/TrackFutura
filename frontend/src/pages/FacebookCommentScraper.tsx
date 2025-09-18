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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider,
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
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import FolderIcon from '@mui/icons-material/Folder';
import CommentIcon from '@mui/icons-material/Comment';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import { apiFetch } from '../utils/api';

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

const FacebookCommentScraper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get('project');

  // State for folders
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<number[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);

  // State for scraping job
  const [jobs, setJobs] = useState<CommentScrapingJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobName, setJobName] = useState('');
  const [resultFolderName, setResultFolderName] = useState('');
  const [commentLimit, setCommentLimit] = useState(10);
  const [getAllReplies, setGetAllReplies] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openJobDialog, setOpenJobDialog] = useState(false);

  // API Functions
  const fetchFolders = async () => {
    try {
      setLoadingFolders(true);
      const url = projectId 
        ? `/api/facebook-data/folders/?project=${projectId}` 
        : '/api/facebook-data/folders/';
      
      const response = await apiFetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }
      
      const data = await response.json();
      const foldersData = data.results || data;
      setFolders(Array.isArray(foldersData) ? foldersData : []);
    } catch (error) {
      console.error('Error fetching folders:', error);
      setError('Failed to load folders. Please try again.');
      setFolders([]);
    } finally {
      setLoadingFolders(false);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoadingJobs(true);
      const url = projectId 
        ? `/api/facebook-data/comment-scraping-jobs/?project=${projectId}` 
        : '/api/facebook-data/comment-scraping-jobs/';
      
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
      setCreatingJob(true);
      setError(null);

      const response = await apiFetch('/api/facebook-data/comment-scraping-jobs/create_job/', {
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
      setCreatingJob(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchFolders();
    fetchJobs();
  }, [projectId]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Facebook Comment Scraper
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Select Facebook post folders and scrape comments using BrightData
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

        {/* Folders Section */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Available Facebook Folders
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These folders contain Facebook posts that can be used for comment scraping
          </Typography>

          {loadingFolders ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : folders.length === 0 ? (
            <Alert severity="info">
              No Facebook folders found. Please create folders and upload Facebook post data first.
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

        {/* Jobs Section */}
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
                    <TableCell>Posts</TableCell>
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
                          {job.processed_posts}/{job.total_posts}
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
                                  // Will implement download functionality
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
                  Choose the Facebook post folders to scrape comments from
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
              disabled={creatingJob || !jobName.trim() || !resultFolderName.trim() || selectedFolders.length === 0}
              startIcon={creatingJob ? <CircularProgress size={20} /> : <PlayArrowIcon />}
            >
              {creatingJob ? 'Creating...' : 'Create & Run Job'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default FacebookCommentScraper; 