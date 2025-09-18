import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../utils/api';
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
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Grid,
    Divider,
} from '@mui/material';
import {
    Add as AddIcon,
    Facebook as FacebookIcon,
    PlayArrow as PlayArrowIcon,
    Stop as StopIcon,
    Refresh as RefreshIcon,
    Delete as DeleteIcon,
    ExpandMore as ExpandMoreIcon,
    Download as DownloadIcon,
    FilterList as FilterListIcon,
    DateRange as DateRangeIcon,
    Analytics as AnalyticsIcon,
    TrendingUp as TrendingUpIcon,
    ThumbUp as ThumbUpIcon,
    Comment as CommentIcon,
    Article as ArticleIcon,
    Visibility as VisibilityIcon,
    SentimentSatisfiedAlt as PositiveSentimentIcon,
    SentimentNeutral as NeutralSentimentIcon,
    SentimentDissatisfied as NegativeSentimentIcon,
    Assessment as AssessmentIcon,
    EmojiEvents as TrophyIcon,
    Link as LinkIcon,
    Share as ShareIcon,
    Description as ReportIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

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

const ScrapyFacebookScraper: React.FC = () => {
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

    // Quick scrape options
    const [quickScrapeOptions, setQuickScrapeOptions] = useState({
        num_of_posts: 10,
        start_date: null as any,
        end_date: null as any,
    });

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        target_urls: [''],
        source_names: [''],
        content_type: 'posts',
        num_of_posts: 10,
        start_date: null as any,
        end_date: null as any,
    });

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchJobs = async () => {
        try {
            const response = await apiFetch('scrapy/api/jobs/?platform=facebook');
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
            // Get current project ID (you might need to adjust this based on your app's state management)
            const projectId = localStorage.getItem('currentProjectId') || '1';
            
            const response = await apiFetch('scrapy/api/jobs/create_job/', {
                method: 'POST',
                body: JSON.stringify({
                    name: formData.name,
                    project_id: parseInt(projectId),
                    platform: 'facebook',
                    content_type: formData.content_type,
                    target_urls: formData.target_urls.filter(url => url.trim()),
                    source_names: formData.source_names.filter(name => name.trim()),
                    num_of_posts: formData.num_of_posts,
                    start_date: formData.start_date ? formData.start_date.toISOString().split('T')[0] : null,
                    end_date: formData.end_date ? formData.end_date.toISOString().split('T')[0] : null,
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
                    start_date: null,
                    end_date: null,
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
            const response = await apiFetch(`scrapy/api/jobs/${jobId}/start_job/`, {
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
            const response = await apiFetch(`scrapy/api/jobs/${jobId}/cancel_job/`, {
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
            const response = await apiFetch(`scrapy/api/jobs/${job.id}/results/`);
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
            const response = await apiFetch(`scrapy/api/jobs/${jobId}/`, {
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

    const quickScrape = async () => {
        if (!quickScrapeUrl.trim()) {
            setSnackbar({ open: true, message: 'Please enter a valid Facebook URL', severity: 'error' });
            return;
        }

        setQuickScrapeLoading(true);
        setQuickScrapeResults([]);
        setQuickScrapeJob(null);

        try {
            // Use fixed project ID 9 (from API test) or try to get from current context
            const projectId = '9';
            
            console.log('Creating job with data:', {
                name: `Quick Facebook Scrape - ${new Date().toLocaleString()}`,
                project_id: parseInt(projectId),
                platform: 'facebook',
                content_type: 'posts',
                target_urls: [quickScrapeUrl],
                source_names: ['Quick Scrape'],
                num_of_posts: quickScrapeOptions.num_of_posts,
                start_date: quickScrapeOptions.start_date ? quickScrapeOptions.start_date.toISOString().split('T')[0] : null,
                end_date: quickScrapeOptions.end_date ? quickScrapeOptions.end_date.toISOString().split('T')[0] : null,
            });
            
            // Create job
            const createResponse = await apiFetch('scrapy/api/jobs/create_job/', {
                method: 'POST',
                body: JSON.stringify({
                    name: `Quick Facebook Scrape - ${new Date().toLocaleString()}`,
                    project_id: parseInt(projectId),
                    platform: 'facebook',
                    content_type: 'posts',
                    target_urls: [quickScrapeUrl],
                    source_names: ['Quick Scrape'],
                    num_of_posts: quickScrapeOptions.num_of_posts,
                    start_date: quickScrapeOptions.start_date ? quickScrapeOptions.start_date.toISOString().split('T')[0] : null,
                    end_date: quickScrapeOptions.end_date ? quickScrapeOptions.end_date.toISOString().split('T')[0] : null,
                }),
            });

            console.log('Create response status:', createResponse.status);

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                console.error('Create job error:', errorText);
                throw new Error(`Failed to create job: ${errorText}`);
            }

            const newJob = await createResponse.json();
            console.log('Created job:', newJob);
            setQuickScrapeJob(newJob);
            setSnackbar({ open: true, message: 'Job created! Starting scrape...', severity: 'info' });

            // Start job
            const startResponse = await apiFetch(`scrapy/api/jobs/${newJob.id}/start_job/`, {
                method: 'POST',
            });

            console.log('Start response status:', startResponse.status);

            if (!startResponse.ok) {
                const errorText = await startResponse.text();
                console.error('Start job error:', errorText);
                throw new Error(`Failed to start job: ${errorText}`);
            }

            setSnackbar({ open: true, message: 'Scraping started! Results will appear automatically...', severity: 'success' });

            // Poll for results
            const pollResults = async () => {
                try {
                    const jobResponse = await apiFetch(`scrapy/api/jobs/${newJob.id}/`);
                    const jobData = await jobResponse.json();
                    console.log('Job status:', jobData.status, 'Progress:', jobData.progress_percentage);
                    setQuickScrapeJob(jobData);

                    if (jobData.status === 'completed' || jobData.status === 'failed') {
                        const resultsResponse = await apiFetch(`scrapy/api/jobs/${newJob.id}/results/`);
                        if (resultsResponse.ok) {
                            const results = await resultsResponse.json();
                            console.log('Results:', results);
                            setQuickScrapeResults(results);
                        }
                        setQuickScrapeLoading(false);
                        
                        if (jobData.status === 'completed') {
                            setSnackbar({ open: true, message: 'Scraping completed successfully!', severity: 'success' });
                        } else {
                            setSnackbar({ open: true, message: `Scraping failed: ${jobData.error_log || 'Check the logs for details.'}`, severity: 'error' });
                        }
                    } else if (jobData.status === 'running') {
                        setTimeout(pollResults, 3000); // Poll every 3 seconds
                    } else {
                        setTimeout(pollResults, 2000); // Check again for other statuses
                    }
                } catch (error) {
                    console.error('Error polling results:', error);
                    setQuickScrapeLoading(false);
                    setSnackbar({ open: true, message: 'Error checking job status', severity: 'error' });
                }
            };

            // Start polling after a short delay
            setTimeout(pollResults, 2000);

        } catch (error) {
            console.error('Quick scrape error:', error);
            setQuickScrapeLoading(false);
            setSnackbar({ open: true, message: `Error starting quick scrape: ${error}`, severity: 'error' });
        }
    };

    const downloadResults = (results: ScrapyResult[], filename: string = 'facebook-scraping-results') => {
        try {
            const dataToExport = results.map(result => ({
                source_name: result.source_name,
                source_url: result.source_url,
                success: result.success,
                error_message: result.error_message || '',
                scraped_data: result.scraped_data,
                scrape_timestamp: result.scrape_timestamp,
            }));

            // Create and download JSON file
            const jsonData = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setSnackbar({ open: true, message: 'Results downloaded successfully!', severity: 'success' });
        } catch (error) {
            setSnackbar({ open: true, message: 'Error downloading results', severity: 'error' });
        }
    };

    const downloadResultsAsCSV = (results: ScrapyResult[], filename: string = 'facebook-scraping-results') => {
        try {
            // Flatten the data for CSV export
            const csvRows = [];
            const headers = ['Source Name', 'Source URL', 'Success', 'Text', 'Likes', 'Comments', 'Shares', 'Timestamp', 'Post URL', 'Media Type'];
            csvRows.push(headers.join(','));

            results.forEach(result => {
                if (result.success && result.scraped_data && Array.isArray(result.scraped_data)) {
                    result.scraped_data.forEach((post: any) => {
                        const row = [
                            result.source_name,
                            result.source_url,
                            'true',
                            `"${(post.text || '').replace(/"/g, '""')}"`,
                            post.likes || 0,
                            post.comments || post.comments_count || post.comment_count || post.num_comments || 0,
                            post.shares || 0,
                            post.timestamp || '',
                            post.post_url || '',
                            post.media_type || 'text'
                        ];
                        csvRows.push(row.join(','));
                    });
                } else {
                    const row = [
                        result.source_name,
                        result.source_url,
                        'false',
                        `"${result.error_message || ''}"`,
                        '', '', '', '', '', ''
                    ];
                    csvRows.push(row.join(','));
                }
            });

            const csvData = csvRows.join('\n');
            const blob = new Blob([csvData], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setSnackbar({ open: true, message: 'CSV file downloaded successfully!', severity: 'success' });
        } catch (error) {
            setSnackbar({ open: true, message: 'Error downloading CSV', severity: 'error' });
        }
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
                    <FacebookIcon fontSize="large" />
                    Facebook Scraper
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


            {/* Quick Scrape Section */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PlayArrowIcon />
                        Quick Scrape
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Enter a Facebook page URL to quickly scrape posts and see results automatically.
                    </Typography>
                    
                    {/* URL Input */}
                    <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
                        <TextField
                            label="Facebook Page URL"
                            placeholder="https://www.facebook.com/pagename/"
                            value={quickScrapeUrl}
                            onChange={(e) => setQuickScrapeUrl(e.target.value)}
                            fullWidth
                            variant="outlined"
                            helperText="Examples: https://www.facebook.com/facebook/ or https://www.facebook.com/pagename/"
                        />
                        <Button
                            variant="contained"
                            onClick={quickScrape}
                            disabled={quickScrapeLoading || !quickScrapeUrl.trim()}
                            startIcon={quickScrapeLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                            sx={{ minWidth: 120, height: 56 }}
                        >
                            {quickScrapeLoading ? 'Scraping...' : 'Scrape'}
                        </Button>
                    </Stack>

                    {/* Advanced Options */}
                    <Accordion sx={{ mb: 2 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <FilterListIcon />
                                Advanced Options
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} sm={4}>
                                        <TextField
                                            label="Number of Posts"
                                            type="number"
                                            value={quickScrapeOptions.num_of_posts}
                                            onChange={(e) => setQuickScrapeOptions(prev => ({ 
                                                ...prev, 
                                                num_of_posts: parseInt(e.target.value) || 10 
                                            }))}
                                            inputProps={{ min: 1, max: 50 }}
                                            fullWidth
                                            helperText="1-50 posts"
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <DatePicker
                                            label="Start Date (Optional)"
                                            value={quickScrapeOptions.start_date}
                                            onChange={(newValue) => setQuickScrapeOptions(prev => ({ 
                                                ...prev, 
                                                start_date: newValue 
                                            }))}
                                            slotProps={{
                                                textField: {
                                                    fullWidth: true,
                                                    helperText: 'Filter posts from this date'
                                                }
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <DatePicker
                                            label="End Date (Optional)"
                                            value={quickScrapeOptions.end_date}
                                            onChange={(newValue) => setQuickScrapeOptions(prev => ({ 
                                                ...prev, 
                                                end_date: newValue 
                                            }))}
                                            slotProps={{
                                                textField: {
                                                    fullWidth: true,
                                                    helperText: 'Filter posts until this date'
                                                }
                                            }}
                                        />
                                    </Grid>
                                </Grid>
                            </LocalizationProvider>
                            <Alert severity="info" sx={{ mt: 2 }}>
                                <strong>Date Filtering:</strong> This filters posts by their creation date. 
                                Leave empty to scrape the most recent posts without date restrictions.
                            </Alert>
                        </AccordionDetails>
                    </Accordion>

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
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6">
                                    Scraped Results ({quickScrapeResults.length} items)
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<DownloadIcon />}
                                        onClick={() => downloadResults(quickScrapeResults, 'quick-facebook-scrape')}
                                    >
                                        Download JSON
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<DownloadIcon />}
                                        onClick={() => downloadResultsAsCSV(quickScrapeResults, 'quick-facebook-scrape')}
                                    >
                                        Download CSV
                                    </Button>
                                </Stack>
                            </Box>
                            {quickScrapeResults.map((result, index) => (
                                <Card key={index} variant="outlined" sx={{ mt: 2 }}>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                                            <Typography variant="subtitle2">
                                                {result.source_name} - {result.success ? 'SUCCESS' : 'FAILED'}
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
                                                    Posts Found: {result.scraped_data.length}
                                                </Typography>
                                                {result.scraped_data.slice(0, 3).map((post: any, postIndex: number) => (
                                                    <Paper key={postIndex} variant="outlined" sx={{ p: 2, mb: 1 }}>
                                                        {post.text && (
                                                            <Typography variant="body2" sx={{ mb: 1 }}>
                                                                <strong>Post:</strong> {post.text.substring(0, 150)}
                                                                {post.text.length > 150 && '...'}
                                                            </Typography>
                                                        )}
                                                        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                                                            {post.likes && (
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                    <ThumbUpIcon sx={{ fontSize: 14, color: 'info.main' }} />
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {post.likes}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                            {(post.comments || post.comments_count || post.comment_count || post.num_comments) && (
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                    <CommentIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {post.comments || post.comments_count || post.comment_count || post.num_comments}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                            {post.shares && (
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        🔄 {post.shares}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                            {post.timestamp && (
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                    <DateRangeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {new Date(post.timestamp).toLocaleDateString()}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                        </Stack>
                                                    </Paper>
                                                ))}
                                                {result.scraped_data.length > 3 && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        ... and {result.scraped_data.length - 3} more posts
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
                                        <TableCell>{((job.config?.content_type || 'posts').charAt(0).toUpperCase() + (job.config?.content_type || 'posts').slice(1))}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={job.progress_percentage || 0}
                                                    sx={{ width: 100 }}
                                                />
                                                <Typography variant="body2">
                                                    {job.progress_percentage?.toFixed(1) || 0}%
                                                </Typography>
                                            </Box>
                                            <Typography variant="caption" display="block">
                                                {job.processed_urls}/{job.total_urls} URLs
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{job.total_urls}</TableCell>
                                        <TableCell>
                                            {new Date(job.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1}>
                                                {job.status === 'pending' && (
                                                    <Button
                                                        size="small"
                                                        startIcon={<PlayArrowIcon />}
                                                        onClick={() => startJob(job.id)}
                                                    >
                                                        Start
                                                    </Button>
                                                )}
                                                {job.status === 'running' && (
                                                    <Button
                                                        size="small"
                                                        startIcon={<StopIcon />}
                                                        onClick={() => cancelJob(job.id)}
                                                        color="error"
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
                                            No jobs found. Create your first Facebook scraping job!
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
                <DialogTitle>Create Facebook Scraping Job</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label="Job Name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            fullWidth
                            required
                        />

                        <FormControl fullWidth>
                            <InputLabel>Content Type</InputLabel>
                            <Select
                                value={formData.content_type}
                                onChange={(e) => setFormData(prev => ({ ...prev, content_type: e.target.value }))}
                                label="Content Type"
                            >
                                <MenuItem value="posts">Posts</MenuItem>
                                <MenuItem value="profile">Page Info</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            label="Number of Posts to Scrape"
                            type="number"
                            value={formData.num_of_posts}
                            onChange={(e) => setFormData(prev => ({ ...prev, num_of_posts: parseInt(e.target.value) || 10 }))}
                            inputProps={{ min: 1, max: 50 }}
                            fullWidth
                        />

                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Facebook URLs to Scrape
                            </Typography>
                            {formData.target_urls.map((url, index) => (
                                <Stack key={index} direction="row" spacing={2} sx={{ mb: 2 }}>
                                    <TextField
                                        label={`Facebook URL ${index + 1}`}
                                        placeholder="https://www.facebook.com/pagename/"
                                        value={url}
                                        onChange={(e) => updateUrl(index, e.target.value)}
                                        fullWidth
                                        required
                                    />
                                    <TextField
                                        label="Source Name"
                                        placeholder="Optional display name"
                                        value={formData.source_names[index] || ''}
                                        onChange={(e) => updateSourceName(index, e.target.value)}
                                        sx={{ minWidth: 200 }}
                                    />
                                    {formData.target_urls.length > 1 && (
                                        <Button
                                            onClick={() => removeUrlField(index)}
                                            startIcon={<DeleteIcon />}
                                            color="error"
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </Stack>
                            ))}
                            <Button onClick={addUrlField} startIcon={<AddIcon />}>
                                Add Another URL
                            </Button>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={createJob} 
                        variant="contained" 
                        disabled={loading || !formData.name || !formData.target_urls[0]}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Create Job'}
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
                                        // Extract Facebook posts from results to match CSV format
                                        const posts = jobResults.map(result => result.scraped_data).filter(Boolean);
                                        const dataStr = JSON.stringify(posts, null, 2);
                                        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                                        const exportFileDefaultName = `${selectedJob?.name?.replace(/\s+/g, '_')}_facebook_posts.json`;
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
                                        window.open(`${window.API_BASE_URL}/api/scrapy/api/jobs/${selectedJob.id}/export_csv/`, '_blank');
                                    }
                                }}
                                color="success"
                            >
                                Download CSV
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
                                    // Extract Facebook posts from results
                                    const posts = jobResults.map(result => result.scraped_data).filter(Boolean);
                                    
                                    if (posts.length === 0) {
                                        return (
                                            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                                                No posts found for analysis
                                            </Typography>
                                        );
                                    }

                                    // Simple sentiment analysis
                                    const analyzeSentiment = (text: string): 'positive' | 'negative' | 'neutral' => {
                                        const positiveWords = ['good', 'great', 'amazing', 'awesome', 'excellent', 'wonderful', 'fantastic', 'love', 'best', 'perfect', 'beautiful', 'nice', 'happy', 'excited', '❤️', '😍', '🥰', '😊', '👏', '🔥', '✨'];
                                        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disgusting', 'angry', 'disappointed', 'sad', '😢', '😡', '👎', '😞', '💔'];
                                        
                                        if (!text) return 'neutral';
                                        
                                        const lowerText = text.toLowerCase();
                                        const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
                                        const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
                                        
                                        if (positiveCount > negativeCount) return 'positive';
                                        if (negativeCount > positiveCount) return 'negative';
                                        return 'neutral';
                                    };

                                    // Sentiment analysis on post text
                                    const sentimentData = posts.map(post => {
                                        const textSentiment = analyzeSentiment(post.text || '');
                                        return {
                                            ...post,
                                            textSentiment,
                                            overallSentiment: textSentiment // Simplified for now
                                        };
                                    });

                                    // Calculate sentiment statistics
                                    const sentimentStats = {
                                        positive: sentimentData.filter(p => p.overallSentiment === 'positive').length,
                                        negative: sentimentData.filter(p => p.overallSentiment === 'negative').length,
                                        neutral: sentimentData.filter(p => p.overallSentiment === 'neutral').length
                                    };

                                    const totalEngagement = posts.reduce((sum, post) => sum + (post.likes || 0) + (post.comments_count || post.comments || 0) + (post.shares || 0), 0);
                                    const avgLikes = Math.round(posts.reduce((sum, post) => sum + (post.likes || 0), 0) / posts.length);
                                    const totalComments = posts.reduce((sum, post) => sum + (post.comments || 0), 0);

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
                                                            {posts.length}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                                            Total Posts
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
                                                            {totalEngagement.toLocaleString()}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                                            Total Engagement
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
                                                            Avg Likes/Post
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
                                                                    value={posts.length > 0 ? (sentimentStats.positive / posts.length) * 100 : 0} 
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
                                                                {posts.length > 0 ? Math.round((sentimentStats.positive / posts.length) * 100) : 0}%
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
                                                                    value={posts.length > 0 ? (sentimentStats.neutral / posts.length) * 100 : 0} 
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
                                                                {posts.length > 0 ? Math.round((sentimentStats.neutral / posts.length) * 100) : 0}%
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
                                                                    value={posts.length > 0 ? (sentimentStats.negative / posts.length) * 100 : 0} 
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
                                                                {posts.length > 0 ? Math.round((sentimentStats.negative / posts.length) * 100) : 0}%
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </CardContent>
                                            </Card>

                                            {/* Top Performing Posts Section */}
                                            <Card sx={{ 
                                                borderRadius: 3,
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                            }}>
                                                <CardContent sx={{ p: 2 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                                        <TrophyIcon sx={{ fontSize: 24, color: 'black' }} />
                                                        <Typography variant="h6" sx={{ fontSize: '20px', fontWeight: 'bold' }}>
                                                            Top Performing Posts
                                                        </Typography>
                                                    </Box>
                                                    <TableContainer sx={{ maxHeight: 400, overflowY: 'auto' }}>
                                                        <Table size="small" stickyHeader>
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell>Post</TableCell>
                                                                    <TableCell>Text</TableCell>
                                                                    <TableCell>Sentiment</TableCell>
                                                                    <TableCell>Likes</TableCell>
                                                                    <TableCell>Comments</TableCell>
                                                                    <TableCell>Shares</TableCell>
                                                                    <TableCell>Engagement</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {sentimentData
                                                                    .sort((a, b) => (b.likes || 0) - (a.likes || 0))
                                                                    .slice(0, 10)
                                                                    .map((post, index) => (
                                                                    <TableRow key={index} hover>
                                                                        <TableCell>
                                                                            <Box 
                                                                                component="a" 
                                                                                href={post.post_url} 
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
                                                                                        <Typography variant="body2" fontWeight="bold">Facebook Post</Typography>
                                                                                        <LinkIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                                                                    </Box>
                                                                                    <Typography variant="caption" color="text.secondary">
                                                                                        {post.timestamp ? new Date(post.timestamp).toLocaleDateString() : ''}
                                                                                    </Typography>
                                                                                </Box>
                                                                            </Box>
                                                                        </TableCell>
                                                                        <TableCell sx={{ maxWidth: 250 }}>
                                                                            <Typography variant="body2" noWrap title={post.text}>
                                                                                {post.text ? post.text.substring(0, 80) + (post.text.length > 80 ? '...' : '') : 'No text'}
                                                                            </Typography>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Chip 
                                                                                icon={
                                                                                    post.overallSentiment === 'positive' ? <PositiveSentimentIcon /> : 
                                                                                    post.overallSentiment === 'negative' ? <NegativeSentimentIcon /> : 
                                                                                    <NeutralSentimentIcon />
                                                                                }
                                                                                label={post.overallSentiment === 'positive' ? 'Positive' : post.overallSentiment === 'negative' ? 'Negative' : 'Neutral'} 
                                                                                size="small"
                                                                                color={
                                                                                    post.overallSentiment === 'positive' ? 'success' :
                                                                                    post.overallSentiment === 'negative' ? 'error' : 'default'
                                                                                }
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                <ThumbUpIcon sx={{ fontSize: 16, color: 'black' }} />
                                                                                <Typography variant="body2" color="black">{(post.likes || 0).toLocaleString()}</Typography>
                                                                            </Box>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                <CommentIcon sx={{ fontSize: 16, color: 'black' }} />
                                                                                <Typography variant="body2" color="black">{post.comments_count || post.comments || 0}</Typography>
                                                                            </Box>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                <ShareIcon sx={{ fontSize: 16, color: 'black' }} />
                                                                                <Typography variant="body2" color="black">{post.shares || 0}</Typography>
                                                                            </Box>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Typography variant="body2" color="black" fontWeight="bold">
                                                                                {((post.likes || 0) + (post.comments_count || post.comments || 0) + (post.shares || 0)).toLocaleString()}
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
                    <Button onClick={() => setResultsDialogOpen(false)} color="primary">Close</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default ScrapyFacebookScraper;