import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormHelperText,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Alert,
    Snackbar,
    Grid,
} from '@mui/material';
import {
    Add as AddIcon,
    VideoLibrary as TikTokIcon,
    PlayArrow as PlayArrowIcon,
    Stop as StopIcon,
    Refresh as RefreshIcon,
    Delete as DeleteIcon,
    Assessment as AssessmentIcon,
    Download as DownloadIcon,
    Visibility as VisibilityIcon,
    ThumbUp as ThumbUpIcon,
    Comment as CommentIcon,
    Share as ShareIcon,
    Person as PersonIcon,
    PersonAdd as PersonAddIcon,
    Favorite as FavoriteIcon,
    Link as LinkIcon,
    Analytics as AnalyticsIcon,
    TrendingUp as TrendingUpIcon,
    Article as ArticleIcon,
    EmojiEvents as TrophyIcon,
    SentimentSatisfiedAlt as PositiveSentimentIcon,
    SentimentNeutral as NeutralSentimentIcon,
    SentimentDissatisfied as NegativeSentimentIcon,
    Description as ReportIcon,
} from '@mui/icons-material';

interface ScrapyJob {
    id: number;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    platform: string;
    target_urls: string[];
    source_names: string[];
    num_of_posts: number;
    total_urls: number;
    processed_urls: number;
    successful_scrapes: number;
    failed_scrapes: number;
    progress_percentage: number;
    created_at: string;
    started_at?: string;
    completed_at?: string;
    error_log?: string;
}

interface ScrapyResult {
    id: number;
    source_url: string;
    source_name: string;
    scraped_data: any;
    success: boolean;
    error_message?: string;
    scrape_timestamp: string;
}

const ScrapyTikTokScraper: React.FC = () => {
    const navigate = useNavigate();
    const { organizationId, projectId } = useParams();
    const [jobs, setJobs] = useState<ScrapyJob[]>([]);
    const [loading, setLoading] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<ScrapyJob | null>(null);
    const [jobResults, setJobResults] = useState<ScrapyResult[]>([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'success' | 'error' | 'info' });

    // Quick scrape state
    const [quickScrapeUrl, setQuickScrapeUrl] = useState('');
    const [quickScrapeLoading, setQuickScrapeLoading] = useState(false);
    const [quickScrapeResults, setQuickScrapeResults] = useState<ScrapyResult[]>([]);
    const [quickScrapeJob, setQuickScrapeJob] = useState<ScrapyJob | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        target_urls: [''],
        source_names: [''],
        content_type: 'posts',
        num_of_posts: 10,
    });

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchJobs = async () => {
        try {
            const response = await fetch('/api/scrapy/api/jobs/?platform=tiktok');
            if (response.ok) {
                const data = await response.json();
                setJobs(data.results || data);
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
        }
    };

    const createJob = async () => {
        setLoading(true);
        try {
            const projectId = localStorage.getItem('currentProjectId') || '1';
            
            const response = await fetch('/api/scrapy/api/jobs/create_job/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    project_id: parseInt(projectId),
                    platform: 'tiktok',
                    content_type: formData.content_type,
                    target_urls: formData.target_urls.filter(url => url.trim()),
                    source_names: formData.source_names.filter(name => name.trim()),
                    num_of_posts: formData.num_of_posts,
                }),
            });

            if (response.ok) {
                const newJob = await response.json();
                setJobs(prev => [newJob, ...prev]);
                setCreateDialogOpen(false);
                setFormData({
                    name: '',
                    target_urls: [''],
                    source_names: [''],
                    content_type: 'posts',
                    num_of_posts: 10,
                });
                setSnackbar({ open: true, message: 'Job created successfully!', severity: 'success' });
            } else {
                const errorData = await response.json();
                setSnackbar({ open: true, message: `Error: ${errorData.error || 'Failed to create job'}`, severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Error creating job', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const startJob = async (jobId: number) => {
        try {
            const response = await fetch(`/api/scrapy/api/jobs/${jobId}/start_job/`, {
                method: 'POST',
            });

            if (response.ok) {
                setSnackbar({ open: true, message: 'Job started successfully!', severity: 'success' });
                fetchJobs();
            } else {
                const errorData = await response.json();
                setSnackbar({ open: true, message: `Error: ${errorData.error || 'Failed to start job'}`, severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Error starting job', severity: 'error' });
        }
    };

    const cancelJob = async (jobId: number) => {
        try {
            const response = await fetch(`/api/scrapy/api/jobs/${jobId}/cancel_job/`, {
                method: 'POST',
            });

            if (response.ok) {
                setSnackbar({ open: true, message: 'Job cancelled successfully!', severity: 'success' });
                fetchJobs();
            } else {
                const errorData = await response.json();
                setSnackbar({ open: true, message: `Error: ${errorData.error || 'Failed to cancel job'}`, severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Error cancelling job', severity: 'error' });
        }
    };

    const viewResults = async (job: ScrapyJob) => {
        setSelectedJob(job);
        setResultsDialogOpen(true);
        
        try {
            const response = await fetch(`/api/scrapy/api/jobs/${job.id}/results/`);
            if (response.ok) {
                const results = await response.json();
                setJobResults(results);
            }
        } catch (error) {
            console.error('Error fetching results:', error);
        }
    };

    const deleteJob = async (jobId: number, jobName: string) => {
        const confirmDelete = window.confirm(`Are you sure you want to delete the job "${jobName}"? This action cannot be undone.`);
        
        if (!confirmDelete) {
            return;
        }

        try {
            const response = await fetch(`/api/scrapy/api/jobs/${jobId}/`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setSnackbar({ open: true, message: 'Job deleted successfully!', severity: 'success' });
                fetchJobs();
            } else {
                const errorData = await response.json();
                setSnackbar({ open: true, message: `Error: ${errorData.error || 'Failed to delete job'}`, severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Error deleting job', severity: 'error' });
        }
    };

    const quickScrape = async () => {
        if (!quickScrapeUrl.trim()) {
            setSnackbar({ open: true, message: 'Please enter a valid TikTok URL', severity: 'error' });
            return;
        }

        setQuickScrapeLoading(true);
        setQuickScrapeResults([]);
        setQuickScrapeJob(null);

        try {
            const projectId = localStorage.getItem('currentProjectId') || '1';
            
            // Create job
            const createResponse = await fetch('/api/scrapy/api/jobs/create_job/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: `Quick TikTok Scrape - ${new Date().toLocaleString()}`,
                    project_id: parseInt(projectId),
                    platform: 'tiktok',
                    content_type: quickScrapeUrl.includes('/video/') ? 'posts' : 'posts',
                    target_urls: [quickScrapeUrl],
                    source_names: ['Quick Scrape'],
                    num_of_posts: 5,
                }),
            });

            if (!createResponse.ok) {
                throw new Error('Failed to create job');
            }

            const newJob = await createResponse.json();
            setQuickScrapeJob(newJob);
            setSnackbar({ open: true, message: 'Job created! Starting scrape...', severity: 'info' });

            // Start job
            const startResponse = await fetch(`/api/scrapy/api/jobs/${newJob.id}/start_job/`, {
                method: 'POST',
            });

            if (!startResponse.ok) {
                throw new Error('Failed to start job');
            }

            setSnackbar({ open: true, message: 'Scraping started! Results will appear automatically...', severity: 'success' });

            // Poll for results
            const pollResults = async () => {
                try {
                    const jobResponse = await fetch(`/api/scrapy/api/jobs/${newJob.id}/`);
                    const jobData = await jobResponse.json();
                    setQuickScrapeJob(jobData);

                    if (jobData.status === 'completed' || jobData.status === 'failed') {
                        const resultsResponse = await fetch(`/api/scrapy/api/jobs/${newJob.id}/results/`);
                        if (resultsResponse.ok) {
                            const results = await resultsResponse.json();
                            setQuickScrapeResults(results);
                        }
                        setQuickScrapeLoading(false);
                        
                        if (jobData.status === 'completed') {
                            setSnackbar({ open: true, message: 'Scraping completed successfully!', severity: 'success' });
                        } else {
                            setSnackbar({ open: true, message: 'Scraping failed. Check the logs for details.', severity: 'error' });
                        }
                    } else if (jobData.status === 'running') {
                        setTimeout(pollResults, 3000);
                    }
                } catch (error) {
                    console.error('Error polling results:', error);
                    setQuickScrapeLoading(false);
                    setSnackbar({ open: true, message: 'Error checking job status', severity: 'error' });
                }
            };

            setTimeout(pollResults, 2000);

        } catch (error) {
            setQuickScrapeLoading(false);
            setSnackbar({ open: true, message: 'Error starting quick scrape', severity: 'error' });
        }
    };

    const addUrlField = () => {
        setFormData(prev => ({
            ...prev,
            target_urls: [...prev.target_urls, ''],
            source_names: [...prev.source_names, ''],
        }));
    };

    const removeUrlField = (index: number) => {
        setFormData(prev => ({
            ...prev,
            target_urls: prev.target_urls.filter((_, i) => i !== index),
            source_names: prev.source_names.filter((_, i) => i !== index),
        }));
    };

    const updateUrl = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            target_urls: prev.target_urls.map((url, i) => i === index ? value : url),
        }));
    };

    const updateSourceName = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            source_names: prev.source_names.map((name, i) => i === index ? value : name),
        }));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'success';
            case 'running': return 'warning';
            case 'failed': return 'error';
            case 'cancelled': return 'default';
            default: return 'info';
        }
    };

    const openAIAnalytics = (jobId: number) => {
        if (organizationId && projectId) {
            navigate(`/organizations/${organizationId}/projects/${projectId}/ai-analytics/${jobId}`);
        } else {
            // Fallback to legacy route
            navigate(`/ai-analytics/${jobId}`);
        }
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TikTokIcon fontSize="large" />
                    TikTok Scraper
                </Typography>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchJobs}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateDialogOpen(true)}
                    >
                        Create Job
                    </Button>
                </Stack>
            </Box>

            <Alert severity="warning" sx={{ mb: 3 }}>
                <strong>TikTok Anti-Bot Notice:</strong> TikTok has very strict anti-scraping measures. 
                This scraper works with public profiles but may have limitations due to TikTok's security measures. 
                Use responsibly and expect slower response times due to enhanced protection measures.
            </Alert>

            {/* Quick Scrape Section */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PlayArrowIcon />
                        Quick Scrape
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Enter a TikTok profile URL or individual video URL to quickly scrape and see results automatically.
                    </Typography>
                    
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                        <TextField
                            label="TikTok URL"
                            placeholder="https://www.tiktok.com/@username or https://www.tiktok.com/@username/video/123"
                            value={quickScrapeUrl}
                            onChange={(e) => setQuickScrapeUrl(e.target.value)}
                            fullWidth
                            variant="outlined"
                            helperText="Examples: https://www.tiktok.com/@tiktok or https://www.tiktok.com/@user/video/1234567890"
                        />
                        <Button
                            variant="contained"
                            onClick={quickScrape}
                            disabled={quickScrapeLoading}
                            startIcon={quickScrapeLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                            sx={{ minWidth: 120, height: 56 }}
                        >
                            {quickScrapeLoading ? 'Scraping...' : 'Scrape'}
                        </Button>
                    </Stack>

                    {/* Quick Scrape Status */}
                    {quickScrapeJob && (
                        <Box sx={{ mt: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                <Chip 
                                    label={quickScrapeJob.status.toUpperCase()} 
                                    color={getStatusColor(quickScrapeJob.status) as any}
                                    size="small"
                                />
                                <Typography variant="body2">
                                    Job ID: {quickScrapeJob.id} | Progress: {quickScrapeJob.processed_urls || 0}/{quickScrapeJob.total_urls || 1}
                                </Typography>
                            </Box>
                            {quickScrapeJob.status === 'running' && (
                                <LinearProgress 
                                    variant="determinate" 
                                    value={((quickScrapeJob.processed_urls || 0) / (quickScrapeJob.total_urls || 1)) * 100} 
                                    sx={{ mb: 2 }}
                                />
                            )}
                        </Box>
                    )}

                    {/* Quick Scrape Results */}
                    {quickScrapeResults.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Scraped Results ({quickScrapeResults.length} items)
                            </Typography>
                            {quickScrapeResults.map((result, index) => (
                                <Card key={index} variant="outlined" sx={{ mt: 2 }}>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                                            <Typography variant="subtitle2">
                                                {result.source_name} - {result.success ? 'Success' : 'Failed'}
                                            </Typography>
                                            <Chip 
                                                label={result.success ? 'SUCCESS' : 'FAILED'} 
                                                color={result.success ? 'success' : 'error'} 
                                                size="small"
                                            />
                                        </Stack>
                                        
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            <strong>URL:</strong> {result.source_url}
                                        </Typography>

                                        {result.success && result.scraped_data && Array.isArray(result.scraped_data) && (
                                            <Box>
                                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                                    Videos Found: {result.scraped_data.length}
                                                </Typography>
                                                {result.scraped_data.slice(0, 3).map((video: any, videoIndex: number) => (
                                                    <Paper key={videoIndex} variant="outlined" sx={{ p: 2, mb: 1 }}>
                                                        {video.content_type === 'profile' ? (
                                                            // Profile data display
                                                            <Box>
                                                                {video.username && (
                                                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                                                        <strong>Username:</strong> @{video.username}
                                                                    </Typography>
                                                                )}
                                                                {video.display_name && (
                                                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                                                        <strong>Display Name:</strong> {video.display_name}
                                                                    </Typography>
                                                                )}
                                                                {video.bio && (
                                                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                                                        <strong>Bio:</strong> {video.bio.substring(0, 100)}
                                                                        {video.bio.length > 100 && '...'}
                                                                    </Typography>
                                                                )}
                                                                <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                                                                    {video.followers && (
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                            <PersonIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                {video.followers} followers
                                                                            </Typography>
                                                                        </Box>
                                                                    )}
                                                                    {video.following && (
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                            <PersonAddIcon sx={{ fontSize: 14, color: 'info.main' }} />
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                {video.following} following
                                                                            </Typography>
                                                                        </Box>
                                                                    )}
                                                                    {video.total_likes && (
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                            <FavoriteIcon sx={{ fontSize: 14, color: 'error.main' }} />
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                {video.total_likes} total likes
                                                                            </Typography>
                                                                        </Box>
                                                                    )}
                                                                </Stack>
                                                            </Box>
                                                        ) : (
                                                            // Video data display
                                                            <Box>
                                                                {video.description && (
                                                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                                                        <strong>Description:</strong> {video.description.substring(0, 100)}
                                                                        {video.description.length > 100 && '...'}
                                                                    </Typography>
                                                                )}
                                                                {video.author && (
                                                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                                                        <strong>Author:</strong> @{video.author}
                                                                    </Typography>
                                                                )}
                                                                <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                                                                    {video.likes && (
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                            <ThumbUpIcon sx={{ fontSize: 14, color: 'info.main' }} />
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                {video.likes}
                                                                            </Typography>
                                                                        </Box>
                                                                    )}
                                                                    {video.comments && (
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                            <CommentIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                {video.comments}
                                                                            </Typography>
                                                                        </Box>
                                                                    )}
                                                                    {video.shares && (
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                            <ShareIcon sx={{ fontSize: 14, color: 'success.main' }} />
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                {video.shares}
                                                                            </Typography>
                                                                        </Box>
                                                                    )}
                                                                    {video.views && (
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                            <VisibilityIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                {video.views}
                                                                            </Typography>
                                                                        </Box>
                                                                    )}
                                                                </Stack>
                                                                {video.post_url && (
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                                                                        <LinkIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                                                        <Typography variant="caption" color="primary" component="a" href={video.post_url} target="_blank" rel="noopener noreferrer">
                                                                            View Video
                                                                        </Typography>
                                                                    </Box>
                                                                )}
                                                            </Box>
                                                        )}
                                                    </Paper>
                                                ))}
                                                {result.scraped_data.length > 3 && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        ... and {result.scraped_data.length - 3} more videos
                                                    </Typography>
                                                )}
                                            </Box>
                                        )}

                                        {!result.success && result.error_message && (
                                            <Alert severity="error" sx={{ mt: 1 }}>
                                                {result.error_message}
                                            </Alert>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Job Management Table */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Scraping Jobs
                    </Typography>
                    
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Content Type</TableCell>
                                    <TableCell>Progress</TableCell>
                                    <TableCell>URLs</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell>Actions</TableCell>
                                    <TableCell>Report</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {jobs.map((job) => (
                                    <TableRow key={job.id}>
                                        <TableCell>{job.name}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={job.status.toUpperCase()} 
                                                color={getStatusColor(job.status) as any}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {job.target_urls?.[0]?.includes('/video/') ? 'Single Video' : 'Profile Videos'}
                                        </TableCell>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="body2">
                                                    {job.processed_urls || 0}/{job.total_urls || 0} URLs
                                                </Typography>
                                                <LinearProgress 
                                                    variant="determinate" 
                                                    value={job.progress_percentage || 0} 
                                                    sx={{ mt: 1 }}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {job.target_urls?.length || 0} URL(s)
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {new Date(job.created_at).toLocaleDateString()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1}>
                                                {job.status === 'pending' && (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="success"
                                                        startIcon={<PlayArrowIcon />}
                                                        onClick={() => startJob(job.id)}
                                                    >
                                                        Start
                                                    </Button>
                                                )}
                                                {job.status === 'running' && (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="warning"
                                                        startIcon={<StopIcon />}
                                                        onClick={() => cancelJob(job.id)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                )}
                                                {(job.status === 'completed' || job.status === 'failed') && (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => viewResults(job)}
                                                    >
                                                        View Results
                                                    </Button>
                                                )}
                                                <Button
                                                    size="small"
                                                    startIcon={<DeleteIcon />}
                                                    onClick={() => deleteJob(job.id, job.name)}
                                                    color="error"
                                                    variant="outlined"
                                                >
                                                    Delete
                                                </Button>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            {job.status === 'completed' && (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="info"
                                                    startIcon={<ReportIcon />}
                                                    onClick={() => openAIAnalytics(job.id)}
                                                    sx={{ minWidth: 120 }}
                                                >
                                                    AI Report
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {jobs.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center">
                                            <Typography variant="body2" color="text.secondary">
                                                No TikTok scraping jobs yet. Create your first job to get started!
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Create Job Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Create TikTok Scraping Job</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 2 }}>
                        <TextField
                            label="Job Name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            fullWidth
                            placeholder="e.g., TikTok Creator Analysis"
                        />
                        
                        <FormControl fullWidth>
                            <InputLabel>Content Type</InputLabel>
                            <Select
                                value={formData.content_type}
                                onChange={(e) => setFormData(prev => ({ ...prev, content_type: e.target.value }))}
                                label="Content Type"
                            >
                                <MenuItem value="posts">Videos</MenuItem>
                                <MenuItem value="profile">Profile Info</MenuItem>
                            </Select>
                            <FormHelperText>
                                Videos: Scrape videos from user profiles | Profile: Get profile information
                            </FormHelperText>
                        </FormControl>

                        <TextField
                            label="Number of Videos"
                            type="number"
                            value={formData.num_of_posts}
                            onChange={(e) => setFormData(prev => ({ ...prev, num_of_posts: parseInt(e.target.value) || 10 }))}
                            inputProps={{ min: 1, max: 20 }}
                            helperText="Maximum number of videos to scrape per URL (1-20, recommended: 5-10 due to TikTok's strict limits)"
                        />

                        <Typography variant="h6" gutterBottom>
                            Target URLs
                        </Typography>
                        
                        {formData.target_urls.map((url, index) => (
                            <Stack key={index} direction="row" spacing={2} alignItems="flex-start">
                                <TextField
                                    label={`TikTok URL ${index + 1}`}
                                    value={url}
                                    onChange={(e) => updateUrl(index, e.target.value)}
                                    placeholder="https://www.tiktok.com/@username"
                                    fullWidth
                                    helperText={index === 0 ? "Profile URLs (@username) or individual video URLs work" : ""}
                                />
                                <TextField
                                    label="Source Name"
                                    value={formData.source_names[index] || ''}
                                    onChange={(e) => updateSourceName(index, e.target.value)}
                                    placeholder="Source name"
                                    sx={{ minWidth: 200 }}
                                />
                                {formData.target_urls.length > 1 && (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        startIcon={<DeleteIcon />}
                                        onClick={() => removeUrlField(index)}
                                        sx={{ height: 56 }}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </Stack>
                        ))}
                        
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={addUrlField}
                        >
                            Add Another URL
                        </Button>

                        <Alert severity="info">
                            <strong>TikTok Tips:</strong> TikTok scraping may be slower due to anti-bot measures. 
                            Start with fewer videos (5-10) and public profiles for best results.
                        </Alert>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={createJob} 
                        variant="contained" 
                        disabled={loading || !formData.name.trim()}
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                        Create Job
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Results Dialog */}
            <Dialog open={resultsDialogOpen} onClose={() => setResultsDialogOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AssessmentIcon />
                            <Typography variant="h6">
                                Sentiment Analysis Dashboard: {selectedJob?.name}
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<DownloadIcon />}
                                onClick={() => {
                                    if (jobResults.length > 0) {
                                        const videos = jobResults.map(result => result.scraped_data).filter(Boolean);
                                        const dataStr = JSON.stringify(videos, null, 2);
                                        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                                        const exportFileDefaultName = `${selectedJob?.name?.replace(/\s+/g, '_')}_tiktok_videos.json`;
                                        const linkElement = document.createElement('a');
                                        linkElement.setAttribute('href', dataUri);
                                        linkElement.setAttribute('download', exportFileDefaultName);
                                        linkElement.click();
                                    }
                                }}
                            >
                                Download JSON
                            </Button>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<DownloadIcon />}
                                onClick={() => {
                                    if (selectedJob) {
                                        window.open(`http://localhost:8000/api/scrapy/api/jobs/${selectedJob.id}/export_csv/`, '_blank');
                                    }
                                }}
                            >
                                Export CSV
                            </Button>
                        </Stack>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1 }}>
                        {jobResults.length === 0 ? (
                            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                                No results found for this job
                            </Typography>
                        ) : (
                            <>
                                {/* Sentiment Analysis Dashboard */}
                                {(() => {
                                    // Extract TikTok videos from results
                                    const videos = jobResults.map(result => result.scraped_data).filter(Boolean).flat();
                                    
                                    if (videos.length === 0) {
                                        return (
                                            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                                                No videos found for analysis
                                            </Typography>
                                        );
                                    }

                                    // Simple sentiment analysis
                                    const analyzeSentiment = (text: string): 'positive' | 'negative' | 'neutral' => {
                                        const positiveWords = ['good', 'great', 'amazing', 'awesome', 'excellent', 'wonderful', 'fantastic', 'love', 'best', 'perfect', 'beautiful', 'nice', 'happy', 'excited', 'fun', 'cool', 'wow', 'incredible', 'outstanding', 'brilliant', 'superb', 'marvelous', 'spectacular'];
                                        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disgusting', 'angry', 'disappointed', 'sad', 'boring', 'stupid', 'ugly', 'pathetic', 'dreadful', 'annoying', 'frustrating', 'useless', 'waste'];
                                        
                                        if (!text) return 'neutral';
                                        
                                        const lowerText = text.toLowerCase();
                                        const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
                                        const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
                                        
                                        if (positiveCount > negativeCount) return 'positive';
                                        if (negativeCount > positiveCount) return 'negative';
                                        return 'neutral';
                                    };

                                    // Sentiment analysis on descriptions
                                    const sentimentData = videos.map(video => {
                                        const descriptionSentiment = analyzeSentiment(video.description || video.text || '');
                                        return {
                                            ...video,
                                            descriptionSentiment,
                                            overallSentiment: descriptionSentiment
                                        };
                                    });

                                    // Calculate sentiment statistics
                                    const sentimentStats = {
                                        positive: sentimentData.filter(v => v.overallSentiment === 'positive').length,
                                        negative: sentimentData.filter(v => v.overallSentiment === 'negative').length,
                                        neutral: sentimentData.filter(v => v.overallSentiment === 'neutral').length,
                                        total: sentimentData.length
                                    };

                                    // Calculate view metrics
                                    const totalViews = videos.reduce((sum, video) => sum + (parseInt(video.views) || 0), 0);
                                    const avgLikes = Math.round(videos.reduce((sum, video) => sum + (parseInt(video.likes) || 0), 0) / videos.length);
                                    const totalComments = videos.reduce((sum, video) => sum + (parseInt(video.comments_count) || parseInt(video.comments) || 0), 0);

                                    return (
                                        <Box>
                                            {/* Summary Cards */}
                                            <Box sx={{ display: 'flex', justifyContent: 'space-evenly', gap: 3, mb: 4 }}>
                                                <Card sx={{ 
                                                    width: '23%',
                                                    height: 160,
                                                    display: 'flex',
                                                    flexDirection: 'column'
                                                }}>
                                                    <CardContent sx={{ 
                                                        textAlign: 'center', 
                                                        display: 'flex', 
                                                        flexDirection: 'column', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        height: '100%',
                                                        p: 3
                                                    }}>
                                                        <ArticleIcon sx={{ fontSize: 36, mb: 2, color: 'primary.main' }} />
                                                        <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                                                            {videos.length}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                                            Total Videos
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                                <Card sx={{ 
                                                    width: '23%',
                                                    height: 160,
                                                    display: 'flex',
                                                    flexDirection: 'column'
                                                }}>
                                                    <CardContent sx={{ 
                                                        textAlign: 'center', 
                                                        display: 'flex', 
                                                        flexDirection: 'column', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        height: '100%',
                                                        p: 3
                                                    }}>
                                                        <TrendingUpIcon sx={{ fontSize: 36, mb: 2, color: 'success.main' }} />
                                                        <Typography variant="h3" color="success.main" sx={{ fontWeight: 'bold', mb: 1 }}>
                                                            {totalViews.toLocaleString()}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                                            Total Views
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                                <Card sx={{ 
                                                    width: '23%',
                                                    height: 160,
                                                    display: 'flex',
                                                    flexDirection: 'column'
                                                }}>
                                                    <CardContent sx={{ 
                                                        textAlign: 'center', 
                                                        display: 'flex', 
                                                        flexDirection: 'column', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        height: '100%',
                                                        p: 3
                                                    }}>
                                                        <ThumbUpIcon sx={{ fontSize: 36, mb: 2, color: 'info.main' }} />
                                                        <Typography variant="h3" color="info.main" sx={{ fontWeight: 'bold', mb: 1 }}>
                                                            {avgLikes.toLocaleString()}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                                            Avg Likes/Video
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                                <Card sx={{ 
                                                    width: '23%',
                                                    height: 160,
                                                    display: 'flex',
                                                    flexDirection: 'column'
                                                }}>
                                                    <CardContent sx={{ 
                                                        textAlign: 'center', 
                                                        display: 'flex', 
                                                        flexDirection: 'column', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        height: '100%',
                                                        p: 3
                                                    }}>
                                                        <CommentIcon sx={{ fontSize: 36, mb: 2, color: 'warning.main' }} />
                                                        <Typography variant="h3" color="warning.main" sx={{ fontWeight: 'bold', mb: 1 }}>
                                                            {totalComments.toLocaleString()}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                                            Total Comments
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Box>

                                            {/* Sentiment Analysis */}
                                            <Card sx={{ mb: 4 }}>
                                                <CardContent>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, justifyContent: 'center' }}>
                                                        <AnalyticsIcon />
                                                        <Typography variant="h6">Sentiment Analysis</Typography>
                                                    </Box>
                                                    
                                                    {/* Justified sentiment indicators */}
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-evenly', gap: 4 }}>
                                                        {/* Positive */}
                                                        <Box sx={{ flex: 1, textAlign: 'center' }}>
                                                            <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                                                                Positive ({sentimentStats.positive})
                                                            </Typography>
                                                            <Box sx={{ mb: 1 }}>
                                                                <LinearProgress 
                                                                    variant="determinate" 
                                                                    value={videos.length > 0 ? (sentimentStats.positive / videos.length) * 100 : 0} 
                                                                    sx={{ 
                                                                        height: 8, 
                                                                        borderRadius: 4, 
                                                                        backgroundColor: 'grey.200',
                                                                        '& .MuiLinearProgress-bar': {
                                                                            backgroundColor: '#4caf50'
                                                                        }
                                                                    }}
                                                                />
                                                            </Box>
                                                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                                                                {videos.length > 0 ? Math.round((sentimentStats.positive / videos.length) * 100) : 0}%
                                                            </Typography>
                                                        </Box>

                                                        {/* Neutral */}
                                                        <Box sx={{ flex: 1, textAlign: 'center' }}>
                                                            <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                                                                Neutral ({sentimentStats.neutral})
                                                            </Typography>
                                                            <Box sx={{ mb: 1 }}>
                                                                <LinearProgress 
                                                                    variant="determinate" 
                                                                    value={videos.length > 0 ? (sentimentStats.neutral / videos.length) * 100 : 0} 
                                                                    sx={{ 
                                                                        height: 8, 
                                                                        borderRadius: 4, 
                                                                        backgroundColor: 'grey.200',
                                                                        '& .MuiLinearProgress-bar': {
                                                                            backgroundColor: 'info.main'
                                                                        }
                                                                    }}
                                                                />
                                                            </Box>
                                                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                                                                {videos.length > 0 ? Math.round((sentimentStats.neutral / videos.length) * 100) : 0}%
                                                            </Typography>
                                                        </Box>

                                                        {/* Negative */}
                                                        <Box sx={{ flex: 1, textAlign: 'center' }}>
                                                            <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                                                                Negative ({sentimentStats.negative})
                                                            </Typography>
                                                            <Box sx={{ mb: 1 }}>
                                                                <LinearProgress 
                                                                    variant="determinate" 
                                                                    value={videos.length > 0 ? (sentimentStats.negative / videos.length) * 100 : 0} 
                                                                    sx={{ 
                                                                        height: 8, 
                                                                        borderRadius: 4, 
                                                                        backgroundColor: 'grey.200',
                                                                        '& .MuiLinearProgress-bar': {
                                                                            backgroundColor: '#f44336'
                                                                        }
                                                                    }}
                                                                />
                                                            </Box>
                                                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                                                                {videos.length > 0 ? Math.round((sentimentStats.negative / videos.length) * 100) : 0}%
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </CardContent>
                                            </Card>

                                            {/* Top Performing Videos Section */}
                                            <Card sx={{ 
                                                borderRadius: 3,
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                            }}>
                                                <CardContent sx={{ p: 2 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                                        <TrophyIcon sx={{ fontSize: 24, color: 'black' }} />
                                                        <Typography variant="h6" sx={{ fontSize: '20px', fontWeight: 'bold' }}>
                                                            Top Performing Videos
                                                        </Typography>
                                                    </Box>
                                                    <TableContainer sx={{ maxHeight: 400, overflowY: 'auto' }}>
                                                        <Table size="small" stickyHeader>
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell>Video</TableCell>
                                                                    <TableCell>Description</TableCell>
                                                                    <TableCell>Sentiment</TableCell>
                                                                    <TableCell>Likes</TableCell>
                                                                    <TableCell>Comments</TableCell>
                                                                    <TableCell>Shares</TableCell>
                                                                    <TableCell>Views</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {sentimentData
                                                                    .sort((a, b) => (parseInt(b.likes) || 0) - (parseInt(a.likes) || 0))
                                                                    .slice(0, 10)
                                                                    .map((video, index) => (
                                                                    <TableRow key={index} hover>
                                                                        <TableCell>
                                                                            <Box 
                                                                                component="a" 
                                                                                href={video.post_url} 
                                                                                target="_blank" 
                                                                                rel="noopener noreferrer"
                                                                                sx={{ 
                                                                                    display: 'flex', 
                                                                                    alignItems: 'center',
                                                                                    textDecoration: 'none',
                                                                                    color: 'inherit',
                                                                                    '&:hover': {
                                                                                        backgroundColor: 'action.hover',
                                                                                        borderRadius: 1
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <Box>
                                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                                        <Typography variant="body2" fontWeight="bold">@{video.author}</Typography>
                                                                                        <LinkIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                                                                    </Box>
                                                                                    <Typography variant="caption" color="text.secondary">
                                                                                        {video.created_at ? new Date(video.created_at).toLocaleDateString() : ''}
                                                                                    </Typography>
                                                                                </Box>
                                                                            </Box>
                                                                        </TableCell>
                                                                        <TableCell sx={{ maxWidth: 250 }}>
                                                                            <Typography variant="body2" noWrap title={video.description || video.text}>
                                                                                {(video.description || video.text) ? (video.description || video.text).substring(0, 80) + ((video.description || video.text).length > 80 ? '...' : '') : 'No description'}
                                                                            </Typography>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Chip 
                                                                                icon={
                                                                                    video.overallSentiment === 'positive' ? <PositiveSentimentIcon /> : 
                                                                                    video.overallSentiment === 'negative' ? <NegativeSentimentIcon /> : 
                                                                                    <NeutralSentimentIcon />
                                                                                }
                                                                                label={video.overallSentiment === 'positive' ? 'Positive' : video.overallSentiment === 'negative' ? 'Negative' : 'Neutral'} 
                                                                                size="small"
                                                                                color={
                                                                                    video.overallSentiment === 'positive' ? 'success' :
                                                                                    video.overallSentiment === 'negative' ? 'error' : 'default'
                                                                                }
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                <ThumbUpIcon sx={{ fontSize: 16, color: 'black' }} />
                                                                                <Typography variant="body2" color="black">{(parseInt(video.likes) || 0).toLocaleString()}</Typography>
                                                                            </Box>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                <CommentIcon sx={{ fontSize: 16, color: 'black' }} />
                                                                                <Typography variant="body2" color="black">{(parseInt(video.comments_count) || parseInt(video.comments) || 0).toLocaleString()}</Typography>
                                                                            </Box>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                <ShareIcon sx={{ fontSize: 16, color: 'black' }} />
                                                                                <Typography variant="body2" color="black">{(parseInt(video.shares) || 0).toLocaleString()}</Typography>
                                                                            </Box>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Typography variant="body2" color="black" fontWeight="bold">
                                                                                {(parseInt(video.views) || 0).toLocaleString()}
                                                                            </Typography>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </TableContainer>
                                                </CardContent>
                                            </Card>
                                        </Box>
                                    );
                                })()}
                            </>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setResultsDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={6000} 
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default ScrapyTikTokScraper;