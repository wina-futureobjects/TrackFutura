import React, { useState, useEffect, useCallback } from 'react';
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
    Tabs,
    Tab,
    Grid,
    Divider,
} from '@mui/material';
import {
    PlayArrow as PlayArrowIcon,
    Stop as StopIcon,
    Refresh as RefreshIcon,
    Delete as DeleteIcon,
    Download as DownloadIcon,
    Instagram as InstagramIcon,
    LinkedIn as LinkedInIcon,
    Facebook as FacebookIcon,
    MoreHoriz as TikTokIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

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

interface PlatformConfig {
    name: string;
    icon: React.ReactElement;
    color: string;
    placeholder: string;
    exampleUrls: string[];
}

const PLATFORMS: Record<string, PlatformConfig> = {
    instagram: {
        name: 'Instagram',
        icon: <InstagramIcon />,
        color: '#E4405F',
        placeholder: 'https://www.instagram.com/username/',
        exampleUrls: [
            'https://www.instagram.com/instagram/',
            'https://www.instagram.com/nasa/',
            'https://www.instagram.com/natgeo/',
        ]
    },
    linkedin: {
        name: 'LinkedIn',
        icon: <LinkedInIcon />,
        color: '#0077B5',
        placeholder: 'https://www.linkedin.com/company/company-name/',
        exampleUrls: [
            'https://www.linkedin.com/company/linkedin/',
            'https://www.linkedin.com/company/microsoft/',
            'https://www.linkedin.com/company/google/',
        ]
    },
    tiktok: {
        name: 'TikTok',
        icon: <TikTokIcon />,
        color: '#000000',
        placeholder: 'https://www.tiktok.com/@username',
        exampleUrls: [
            'https://www.tiktok.com/@tiktok',
            'https://www.tiktok.com/@nasa',
            'https://www.tiktok.com/@natgeo',
        ]
    },
    facebook: {
        name: 'Facebook',
        icon: <FacebookIcon />,
        color: '#1877F2',
        placeholder: 'https://www.facebook.com/pagename',
        exampleUrls: [
            'https://www.facebook.com/facebook',
            'https://www.facebook.com/Microsoft',
            'https://www.facebook.com/NASA',
        ]
    }
};

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`platform-tabpanel-${index}`}
            aria-labelledby={`platform-tab-${index}`}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

const UnifiedSocialScraper: React.FC = () => {
    const [currentTab, setCurrentTab] = useState(0);
    const [jobs, setJobs] = useState<Record<string, ScrapyJob[]>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [quickScrapeLoading, setQuickScrapeLoading] = useState<Record<string, boolean>>({});
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'success' | 'error' | 'info' });
    const [jobResultsDialog, setJobResultsDialog] = useState<{ open: boolean, job: ScrapyJob | null, results: ScrapyResult[] }>({
        open: false,
        job: null,
        results: []
    });
    
    // Quick scrape state per platform
    const [quickScrapeData, setQuickScrapeData] = useState<Record<string, {
        url: string;
        num_of_posts: number;
        start_date: any;
        end_date: any;
        results: ScrapyResult[];
        job: ScrapyJob | null;
    }>>({});

    const platforms = Object.keys(PLATFORMS);
    const currentPlatform = platforms[currentTab];

    // Initialize states for all platforms
    useEffect(() => {
        const initialJobs: Record<string, ScrapyJob[]> = {};
        const initialLoading: Record<string, boolean> = {};
        const initialQuickLoading: Record<string, boolean> = {};
        const initialQuickData: Record<string, any> = {};

        platforms.forEach(platform => {
            initialJobs[platform] = [];
            initialLoading[platform] = false;
            initialQuickLoading[platform] = false;
            initialQuickData[platform] = {
                url: '',
                num_of_posts: 10,
                start_date: null,
                end_date: null,
                results: [],
                job: null
            };
        });

        setJobs(initialJobs);
        setLoading(initialLoading);
        setQuickScrapeLoading(initialQuickLoading);
        setQuickScrapeData(initialQuickData);
    }, []);

    const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' = 'info') => {
        setSnackbar({ open: true, message, severity });
    };

    const fetchJobs = useCallback(async (platform: string) => {
        setLoading(prev => ({ ...prev, [platform]: true }));
        try {
            const response = await apiFetch(`scrapy/api/jobs/?platform=${platform}`);
            if (response.ok) {
                const data = await response.json();
                setJobs(prev => ({ ...prev, [platform]: data.results || [] }));
            } else {
                throw new Error(`Failed to fetch ${platform} jobs`);
            }
        } catch (error) {
            console.error(`Error fetching ${platform} jobs:`, error);
            showSnackbar(`Failed to fetch ${platform} jobs`, 'error');
        } finally {
            setLoading(prev => ({ ...prev, [platform]: false }));
        }
    }, []);

    const startQuickScrape = async (platform: string) => {
        const data = quickScrapeData[platform];
        if (!data?.url.trim()) {
            showSnackbar(`Please enter a ${PLATFORMS[platform].name} URL`, 'error');
            return;
        }

        setQuickScrapeLoading(prev => ({ ...prev, [platform]: true }));

        try {
            // Create job
            const createResponse = await apiFetch('scrapy/api/jobs/create_job/', {
                method: 'POST',
                body: JSON.stringify({
                    name: `Quick ${PLATFORMS[platform].name} Scrape - ${new Date().toLocaleString()}`,
                    project_id: parseInt(localStorage.getItem('currentProjectId') || '9'),
                    platform: platform,
                    content_type: 'posts',
                    target_urls: [data.url],
                    source_names: ['Quick Scrape'],
                    num_of_posts: data.num_of_posts || 10,
                    start_date: data.start_date ? data.start_date.toISOString().split('T')[0] : null,
                    end_date: data.end_date ? data.end_date.toISOString().split('T')[0] : null,
                    output_folder_id: null,
                    auto_create_folders: true
                })
            });

            if (!createResponse.ok) {
                const errorData = await createResponse.json();
                throw new Error(errorData.error || `Failed to create ${platform} scraping job`);
            }

            const newJob = await createResponse.json();
            
            setQuickScrapeData(prev => ({
                ...prev,
                [platform]: { ...prev[platform], job: newJob, results: [] }
            }));

            // Start the job
            const startResponse = await apiFetch(`scrapy/api/jobs/${newJob.id}/start_job/`, {
                method: 'POST'
            });

            if (!startResponse.ok) {
                const errorData = await startResponse.json();
                throw new Error(errorData.error || `Failed to start ${platform} scraping job`);
            }

            showSnackbar(`${PLATFORMS[platform].name} scraping started!`, 'success');

            // Poll for progress
            const pollInterval = setInterval(async () => {
                try {
                    const jobResponse = await apiFetch(`scrapy/api/jobs/${newJob.id}/`);
                    if (jobResponse.ok) {
                        const jobData = await jobResponse.json();
                        
                        setQuickScrapeData(prev => ({
                            ...prev,
                            [platform]: { ...prev[platform], job: jobData }
                        }));

                        if (jobData.status === 'completed' || jobData.status === 'failed') {
                            clearInterval(pollInterval);
                            
                            if (jobData.status === 'completed') {
                                const resultsResponse = await apiFetch(`scrapy/api/jobs/${newJob.id}/results/`);
                                if (resultsResponse.ok) {
                                    const resultsData = await resultsResponse.json();
                                    setQuickScrapeData(prev => ({
                                        ...prev,
                                        [platform]: { ...prev[platform], results: resultsData }
                                    }));
                                }
                                showSnackbar(`${PLATFORMS[platform].name} scraping completed!`, 'success');
                            } else {
                                showSnackbar(`${PLATFORMS[platform].name} scraping failed!`, 'error');
                            }
                            
                            setQuickScrapeLoading(prev => ({ ...prev, [platform]: false }));
                            fetchJobs(platform);
                        }
                    }
                } catch (error) {
                    console.error(`Polling error for ${platform}:`, error);
                }
            }, 5000);

            // Stop polling after 10 minutes
            setTimeout(() => {
                clearInterval(pollInterval);
                setQuickScrapeLoading(prev => ({ ...prev, [platform]: false }));
            }, 600000);

        } catch (error: any) {
            console.error(`Quick scrape error for ${platform}:`, error);
            showSnackbar(error.message || `Failed to start ${platform} scraping`, 'error');
            setQuickScrapeLoading(prev => ({ ...prev, [platform]: false }));
        }
    };

    const stopJob = async (jobId: number, platform: string) => {
        try {
            const response = await apiFetch(`scrapy/api/jobs/${jobId}/cancel_job/`, {
                method: 'POST'
            });

            if (response.ok) {
                showSnackbar('Job cancelled successfully', 'success');
                fetchJobs(platform);
            } else {
                throw new Error('Failed to cancel job');
            }
        } catch (error) {
            console.error('Error cancelling job:', error);
            showSnackbar('Failed to cancel job', 'error');
        }
    };

    const updateQuickScrapeData = (platform: string, field: string, value: any) => {
        setQuickScrapeData(prev => ({
            ...prev,
            [platform]: { ...prev[platform], [field]: value }
        }));
    };

    const viewJobResults = async (job: ScrapyJob, platform: string) => {
        try {
            const response = await apiFetch(`scrapy/api/jobs/${job.id}/results/`);
            if (response.ok) {
                const results = await response.json();
                setJobResultsDialog({
                    open: true,
                    job: job,
                    results: results
                });
            } else {
                throw new Error('Failed to fetch job results');
            }
        } catch (error) {
            console.error('Error fetching job results:', error);
            showSnackbar('Failed to fetch job results', 'error');
        }
    };

    // Load jobs for current platform when tab changes
    useEffect(() => {
        if (currentPlatform) {
            fetchJobs(currentPlatform);
        }
    }, [currentPlatform, fetchJobs]);

    const renderResultsTable = (results: ScrapyResult[], platform: string) => {
        if (!results || results.length === 0) return null;

        // Handle different data structures based on platform
        const renderInstagramResults = (results: ScrapyResult[]) => (
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600, overflowY: 'auto' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Post</strong></TableCell>
                            <TableCell><strong>Caption</strong></TableCell>
                            <TableCell><strong>Likes</strong></TableCell>
                            <TableCell><strong>Comments</strong></TableCell>
                            <TableCell><strong>Media Type</strong></TableCell>
                            <TableCell><strong>Timestamp</strong></TableCell>
                            <TableCell><strong>Images</strong></TableCell>
                            <TableCell><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {results.map((result, index) => {
                            // Handle both direct scraped_data and nested structure
                            const posts = Array.isArray(result.scraped_data) 
                                ? result.scraped_data 
                                : [result.scraped_data];
                            
                            return posts.map((post, postIndex) => (
                                <TableRow key={`${index}-${postIndex}`} hover>
                                    <TableCell>
                                        <Box>
                                            <Typography variant="body2" fontWeight="bold">
                                                Post #{postIndex + 1}
                                            </Typography>
                                            {post.post_url && (
                                                <Typography variant="caption" color="primary">
                                                    <a href={post.post_url} target="_blank" rel="noopener noreferrer">
                                                        View on Instagram
                                                    </a>
                                                </Typography>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 300 }}>
                                        <Typography variant="body2" sx={{ 
                                            display: '-webkit-box',
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}>
                                            {post.caption || 'No caption'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={post.likes || 0} 
                                            size="small" 
                                            color="primary" 
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Box>
                                            <Chip 
                                                label={post.comments_count || post.comments || 0} 
                                                size="small" 
                                                color="secondary" 
                                                variant="outlined"
                                            />
                                            {post.comments && Array.isArray(post.comments) && post.comments.length > 0 && (
                                                <Box mt={1}>
                                                    {post.comments.slice(0, 2).map((comment: any, idx: number) => (
                                                        <Typography key={idx} variant="caption" display="block" sx={{ fontSize: '0.7rem' }}>
                                                            <strong>@{comment.username}:</strong> {comment.text.substring(0, 50)}{comment.text.length > 50 ? '...' : ''}
                                                        </Typography>
                                                    ))}
                                                    {post.comments.length > 2 && (
                                                        <Typography variant="caption" color="textSecondary">
                                                            +{post.comments.length - 2} more comments
                                                        </Typography>
                                                    )}
                                                </Box>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={post.media_type || 'photo'} 
                                            size="small" 
                                            color={post.media_type === 'video' ? 'error' : 'success'}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {post.timestamp ? new Date(post.timestamp).toLocaleDateString() : 'N/A'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        {post.images && post.images.length > 0 ? (
                                            <Box display="flex" gap={1}>
                                                {post.images.slice(0, 2).map((img: string, imgIndex: number) => (
                                                    <img 
                                                        key={imgIndex}
                                                        src={img} 
                                                        alt={`Post image ${imgIndex + 1}`}
                                                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                                                    />
                                                ))}
                                                {post.images.length > 2 && (
                                                    <Chip label={`+${post.images.length - 2}`} size="small" />
                                                )}
                                            </Box>
                                        ) : (
                                            <Typography variant="body2" color="textSecondary">No images</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            size="small"
                                            onClick={() => {
                                                const dataStr = JSON.stringify(post, null, 2);
                                                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                                                const exportFileDefaultName = `instagram_post_${postIndex + 1}.json`;
                                                const linkElement = document.createElement('a');
                                                linkElement.setAttribute('href', dataUri);
                                                linkElement.setAttribute('download', exportFileDefaultName);
                                                linkElement.click();
                                            }}
                                        >
                                            Export
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ));
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        );

        const renderGenericResults = (results: ScrapyResult[]) => (
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600, overflowY: 'auto' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Source</strong></TableCell>
                            <TableCell><strong>Data</strong></TableCell>
                            <TableCell><strong>Timestamp</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {results.map((result, index) => (
                            <TableRow key={index} hover>
                                <TableCell>
                                    <Box>
                                        <Typography variant="body2" fontWeight="bold">
                                            {result.source_name || 'Unknown Source'}
                                        </Typography>
                                        <Typography variant="caption" color="primary">
                                            <a href={result.source_url} target="_blank" rel="noopener noreferrer">
                                                {result.source_url}
                                            </a>
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell sx={{ maxWidth: 400 }}>
                                    <pre style={{ 
                                        fontSize: '12px', 
                                        maxHeight: '100px', 
                                        overflow: 'auto',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word'
                                    }}>
                                        {JSON.stringify(result.scraped_data, null, 2)}
                                    </pre>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">
                                        {new Date(result.scrape_timestamp).toLocaleString()}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip 
                                        label={result.success ? 'Success' : 'Failed'} 
                                        color={result.success ? 'success' : 'error'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button
                                        size="small"
                                        onClick={() => {
                                            const dataStr = JSON.stringify(result.scraped_data, null, 2);
                                            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                                            const exportFileDefaultName = `${platform}_result_${index + 1}.json`;
                                            const linkElement = document.createElement('a');
                                            linkElement.setAttribute('href', dataUri);
                                            linkElement.setAttribute('download', exportFileDefaultName);
                                            linkElement.click();
                                        }}
                                    >
                                        Export
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );

        // Render appropriate table based on platform
        switch (platform) {
            case 'instagram':
                return renderInstagramResults(results);
            case 'facebook':
            case 'linkedin':
            case 'tiktok':
            default:
                return renderGenericResults(results);
        }
    };

    const renderPlatformContent = (platform: string) => {
        const platformConfig = PLATFORMS[platform];
        const platformData = quickScrapeData[platform] || {};
        const platformJobs = jobs[platform] || [];
        const isLoading = loading[platform] || false;
        const isQuickLoading = quickScrapeLoading[platform] || false;

        return (
            <Stack spacing={4}>
                {/* Quick Scrape Section */}
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ color: platformConfig.color, display: 'flex', alignItems: 'center', gap: 1 }}>
                            {platformConfig.icon}
                            Quick {platformConfig.name} Scraper
                        </Typography>
                        
                        <Stack spacing={3}>
                            <TextField
                                fullWidth
                                label={`${platformConfig.name} URL`}
                                placeholder={platformConfig.placeholder}
                                value={platformData.url || ''}
                                onChange={(e) => updateQuickScrapeData(platform, 'url', e.target.value)}
                                helperText={`Example: ${platformConfig.exampleUrls[0]}`}
                                disabled={isQuickLoading}
                            />

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Number of Posts"
                                        value={platformData.num_of_posts || 10}
                                        onChange={(e) => updateQuickScrapeData(platform, 'num_of_posts', parseInt(e.target.value) || 10)}
                                        inputProps={{ min: 1, max: 100 }}
                                        disabled={isQuickLoading}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <DatePicker
                                        label="Start Date (Optional)"
                                        value={platformData.start_date}
                                        onChange={(date) => updateQuickScrapeData(platform, 'start_date', date)}
                                        disabled={isQuickLoading}
                                        slotProps={{ textField: { fullWidth: true } }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <DatePicker
                                        label="End Date (Optional)"
                                        value={platformData.end_date}
                                        onChange={(date) => updateQuickScrapeData(platform, 'end_date', date)}
                                        disabled={isQuickLoading}
                                        slotProps={{ textField: { fullWidth: true } }}
                                    />
                                </Grid>
                            </Grid>

                            <Box>
                                <Button
                                    variant="contained"
                                    onClick={() => startQuickScrape(platform)}
                                    disabled={isQuickLoading}
                                    startIcon={isQuickLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                                    sx={{ 
                                        backgroundColor: platformConfig.color,
                                        '&:hover': { backgroundColor: platformConfig.color, opacity: 0.9 }
                                    }}
                                >
                                    {isQuickLoading ? `Scraping ${platformConfig.name}...` : `Start ${platformConfig.name} Scrape`}
                                </Button>
                            </Box>

                            {/* Quick Scrape Progress */}
                            {platformData.job && (
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="subtitle1" gutterBottom>
                                            Current Job: {platformData.job.name}
                                        </Typography>
                                        <Box display="flex" alignItems="center" gap={2} mb={2}>
                                            <Chip 
                                                label={platformData.job.status} 
                                                color={
                                                    platformData.job.status === 'completed' ? 'success' :
                                                    platformData.job.status === 'running' ? 'primary' :
                                                    platformData.job.status === 'failed' ? 'error' : 'default'
                                                }
                                            />
                                            <Typography variant="body2">
                                                Progress: {platformData.job.progress_percentage}%
                                            </Typography>
                                        </Box>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={platformData.job.progress_percentage}
                                            sx={{ mb: 2 }}
                                        />
                                        <Typography variant="body2" color="text.secondary">
                                            Processed: {platformData.job.processed_urls} / {platformData.job.total_urls} URLs
                                        </Typography>
                                        
                                        {platformData.job.status === 'running' && (
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                size="small"
                                                startIcon={<StopIcon />}
                                                onClick={() => platformData.job && stopJob(platformData.job.id, platform)}
                                                sx={{ mt: 1 }}
                                            >
                                                Stop Job
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Detailed Results Table */}
                            {platformData.results && platformData.results.length > 0 && (
                                <Card variant="outlined">
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                            <Typography variant="subtitle1">
                                                Scraped Results ({platformData.results.length} items)
                                            </Typography>
                                            <Stack direction="row" spacing={1}>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<DownloadIcon />}
                                                    onClick={() => {
                                                        const dataStr = JSON.stringify(platformData.results, null, 2);
                                                        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                                                        const exportFileDefaultName = `${platform}_scrape_results.json`;
                                                        const linkElement = document.createElement('a');
                                                        linkElement.setAttribute('href', dataUri);
                                                        linkElement.setAttribute('download', exportFileDefaultName);
                                                        linkElement.click();
                                                    }}
                                                >
                                                    Export JSON
                                                </Button>
                                                {platformData.job && (
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        startIcon={<DownloadIcon />}
                                                        onClick={() => {
                                                            window.open(`http://localhost:8000/api/scrapy/api/jobs/${platformData.job.id}/export_csv/`, '_blank');
                                                        }}
                                                        color="success"
                                                    >
                                                        Export CSV
                                                    </Button>
                                                )}
                                            </Stack>
                                        </Box>
                                        {renderResultsTable(platformData.results, platform)}
                                    </CardContent>
                                </Card>
                            )}
                        </Stack>
                    </CardContent>
                </Card>

                {/* Jobs History Section */}
                <Card>
                    <CardContent>
                        <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                            <Typography variant="h6">
                                {platformConfig.name} Jobs History
                            </Typography>
                            <Button
                                startIcon={<RefreshIcon />}
                                onClick={() => fetchJobs(platform)}
                                disabled={isLoading}
                            >
                                Refresh
                            </Button>
                        </Box>

                        {isLoading ? (
                            <Box display="flex" justifyContent="center" p={2}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <TableContainer component={Paper} variant="outlined">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Job Name</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Posts Found</TableCell>
                                            <TableCell>Progress</TableCell>
                                            <TableCell>Created</TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {platformJobs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center">
                                                    No {platform} jobs found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            platformJobs.map((job) => (
                                                <TableRow key={job.id}>
                                                    <TableCell>{job.name}</TableCell>
                                                    <TableCell>
                                                        <Chip 
                                                            label={job.status} 
                                                            color={
                                                                job.status === 'completed' ? 'success' :
                                                                job.status === 'running' ? 'primary' :
                                                                job.status === 'failed' ? 'error' : 'default'
                                                            }
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" color="primary" fontWeight="bold">
                                                            {job.successful_scrapes || 0}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box>
                                                            <Typography variant="body2">
                                                                {job.progress_percentage}%
                                                            </Typography>
                                                            <LinearProgress 
                                                                variant="determinate" 
                                                                value={job.progress_percentage}
                                                                sx={{ width: 100 }}
                                                            />
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(job.created_at).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={1}>
                                                            {job.status === 'running' && (
                                                                <Button
                                                                    size="small"
                                                                    color="error"
                                                                    startIcon={<StopIcon />}
                                                                    onClick={() => stopJob(job.id, platform)}
                                                                >
                                                                    Stop
                                                                </Button>
                                                            )}
                                                            {job.status === 'completed' && (
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    color="primary"
                                                                    startIcon={<DownloadIcon />}
                                                                    onClick={() => viewJobResults(job, platform)}
                                                                >
                                                                    View Results
                                                                </Button>
                                                            )}
                                                        </Stack>
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
            </Stack>
        );
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom>
                Social Media Scraper
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
                Unified scraper for Instagram, LinkedIn, TikTok, and Facebook. Extract posts, comments, and engagement data.
            </Typography>

            <Card>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs 
                        value={currentTab} 
                        onChange={(_, newValue) => setCurrentTab(newValue)}
                        aria-label="platform tabs"
                        variant="fullWidth"
                    >
                        {platforms.map((platform, index) => {
                            const config = PLATFORMS[platform];
                            return (
                                <Tab 
                                    key={platform}
                                    icon={config.icon}
                                    label={config.name}
                                    iconPosition="start"
                                    sx={{ 
                                        color: config.color,
                                        '&.Mui-selected': { 
                                            color: config.color,
                                            fontWeight: 'bold'
                                        }
                                    }}
                                />
                            );
                        })}
                    </Tabs>
                </Box>

                {platforms.map((platform, index) => (
                    <TabPanel key={platform} value={currentTab} index={index}>
                        {renderPlatformContent(platform)}
                    </TabPanel>
                ))}
            </Card>

            {/* Job Results Dialog */}
            <Dialog
                open={jobResultsDialog.open}
                onClose={() => setJobResultsDialog({ open: false, job: null, results: [] })}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">
                            Results for: {jobResultsDialog.job?.name}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<DownloadIcon />}
                                onClick={() => {
                                    if (jobResultsDialog.results.length > 0) {
                                        // Extract Instagram posts from results to match CSV format
                                        const posts = jobResultsDialog.results.map(result => result.scraped_data).filter(Boolean);
                                        const dataStr = JSON.stringify(posts, null, 2);
                                        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                                        const exportFileDefaultName = `${jobResultsDialog.job?.name?.replace(/\s+/g, '_')}_instagram_posts.json`;
                                        const linkElement = document.createElement('a');
                                        linkElement.setAttribute('href', dataUri);
                                        linkElement.setAttribute('download', exportFileDefaultName);
                                        linkElement.click();
                                    }
                                }}
                            >
                                📄 Download JSON
                            </Button>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<DownloadIcon />}
                                onClick={() => {
                                    if (jobResultsDialog.job) {
                                        window.open(`http://localhost:8000/api/scrapy/api/jobs/${jobResultsDialog.job.id}/export_csv/`, '_blank');
                                    }
                                }}
                                color="success"
                            >
                                📊 Download CSV
                            </Button>
                        </Stack>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1 }}>
                        {jobResultsDialog.results.length === 0 ? (
                            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                                No results found for this job
                            </Typography>
                        ) : (
                            <>
                                {/* Sentiment Analysis Dashboard */}
                                {(() => {
                                    // Extract Instagram posts from results
                                    const posts = jobResultsDialog.results.map(result => result.scraped_data).filter(Boolean);
                                    
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

                                    // Sentiment analysis on captions and comments
                                    const sentimentData = posts.map(post => {
                                        const captionSentiment = analyzeSentiment(post.caption || '');
                                        return {
                                            ...post,
                                            captionSentiment,
                                            overallSentiment: captionSentiment // Simplified for now
                                        };
                                    });

                                    // Calculate sentiment statistics
                                    const sentimentStats = {
                                        positive: sentimentData.filter(p => p.overallSentiment === 'positive').length,
                                        negative: sentimentData.filter(p => p.overallSentiment === 'negative').length,
                                        neutral: sentimentData.filter(p => p.overallSentiment === 'neutral').length
                                    };

                                    const totalEngagement = posts.reduce((sum, post) => sum + (post.likes || 0) + (post.comments_count || 0), 0);
                                    const avgLikes = Math.round(posts.reduce((sum, post) => sum + (post.likes || 0), 0) / posts.length);
                                    const totalComments = posts.reduce((sum, post) => sum + (post.comments_count || 0), 0);

                                    return (
                                        <Box>
                                            {/* Summary Cards */}
                                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                                <Grid item xs={12} sm={6} md={3}>
                                                    <Card>
                                                        <CardContent sx={{ textAlign: 'center' }}>
                                                            <Typography variant="h4" color="primary">{posts.length}</Typography>
                                                            <Typography variant="body2" color="text.secondary">Total Posts</Typography>
                                                        </CardContent>
                                                    </Card>
                                                </Grid>
                                                <Grid item xs={12} sm={6} md={3}>
                                                    <Card>
                                                        <CardContent sx={{ textAlign: 'center' }}>
                                                            <Typography variant="h4" color="success.main">{totalEngagement.toLocaleString()}</Typography>
                                                            <Typography variant="body2" color="text.secondary">Total Engagement</Typography>
                                                        </CardContent>
                                                    </Card>
                                                </Grid>
                                                <Grid item xs={12} sm={6} md={3}>
                                                    <Card>
                                                        <CardContent sx={{ textAlign: 'center' }}>
                                                            <Typography variant="h4" color="info.main">{avgLikes}</Typography>
                                                            <Typography variant="body2" color="text.secondary">Avg Likes/Post</Typography>
                                                        </CardContent>
                                                    </Card>
                                                </Grid>
                                                <Grid item xs={12} sm={6} md={3}>
                                                    <Card>
                                                        <CardContent sx={{ textAlign: 'center' }}>
                                                            <Typography variant="h4" color="warning.main">{totalComments}</Typography>
                                                            <Typography variant="body2" color="text.secondary">Total Comments</Typography>
                                                        </CardContent>
                                                    </Card>
                                                </Grid>
                                            </Grid>

                                            {/* Sentiment Analysis */}
                                            <Card sx={{ mb: 3 }}>
                                                <CardContent>
                                                    <Typography variant="h6" gutterBottom>📊 Sentiment Analysis Dashboard</Typography>
                                                    <Grid container spacing={2} alignItems="center">
                                                        <Grid item xs={12} md={6}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                                <Box sx={{ width: '100%', mr: 2 }}>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                                        <Typography variant="body2">😊 Positive ({sentimentStats.positive})</Typography>
                                                                        <Typography variant="body2">{posts.length > 0 ? Math.round((sentimentStats.positive / posts.length) * 100) : 0}%</Typography>
                                                                    </Box>
                                                                    <LinearProgress 
                                                                        variant="determinate" 
                                                                        value={posts.length > 0 ? (sentimentStats.positive / posts.length) * 100 : 0} 
                                                                        sx={{ height: 8, borderRadius: 4, backgroundColor: 'grey.200' }}
                                                                        color="success"
                                                                    />
                                                                </Box>
                                                            </Box>
                                                            
                                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                                <Box sx={{ width: '100%', mr: 2 }}>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                                        <Typography variant="body2">😐 Neutral ({sentimentStats.neutral})</Typography>
                                                                        <Typography variant="body2">{posts.length > 0 ? Math.round((sentimentStats.neutral / posts.length) * 100) : 0}%</Typography>
                                                                    </Box>
                                                                    <LinearProgress 
                                                                        variant="determinate" 
                                                                        value={posts.length > 0 ? (sentimentStats.neutral / posts.length) * 100 : 0} 
                                                                        sx={{ height: 8, borderRadius: 4, backgroundColor: 'grey.200' }}
                                                                        color="info"
                                                                    />
                                                                </Box>
                                                            </Box>
                                                            
                                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                <Box sx={{ width: '100%', mr: 2 }}>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                                        <Typography variant="body2">😞 Negative ({sentimentStats.negative})</Typography>
                                                                        <Typography variant="body2">{posts.length > 0 ? Math.round((sentimentStats.negative / posts.length) * 100) : 0}%</Typography>
                                                                    </Box>
                                                                    <LinearProgress 
                                                                        variant="determinate" 
                                                                        value={posts.length > 0 ? (sentimentStats.negative / posts.length) * 100 : 0} 
                                                                        sx={{ height: 8, borderRadius: 4, backgroundColor: 'grey.200' }}
                                                                        color="error"
                                                                    />
                                                                </Box>
                                                            </Box>
                                                        </Grid>
                                                        
                                                        <Grid item xs={12} md={6}>
                                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                                Most Liked Post: <strong>❤️ {Math.max(...posts.map(p => p.likes || 0)).toLocaleString()} likes</strong>
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                                Most Commented: <strong>💬 {Math.max(...posts.map(p => p.comments_count || 0))} comments</strong>
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                Overall Sentiment: <strong>{sentimentStats.positive > sentimentStats.negative ? '😊 Positive Tone' : sentimentStats.negative > sentimentStats.positive ? '😞 Negative Tone' : '😐 Neutral Tone'}</strong>
                                                            </Typography>
                                                        </Grid>
                                                    </Grid>
                                                </CardContent>
                                            </Card>

                                            {/* Top Posts */}
                                            <Card>
                                                <CardContent>
                                                    <Typography variant="h6" gutterBottom>🏆 Top Performing Posts</Typography>
                                                    <TableContainer sx={{ maxHeight: 400, overflowY: 'auto' }}>
                                                        <Table size="small" stickyHeader>
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell>Post</TableCell>
                                                                    <TableCell>Caption</TableCell>
                                                                    <TableCell>Sentiment</TableCell>
                                                                    <TableCell>Likes</TableCell>
                                                                    <TableCell>Comments</TableCell>
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
                                                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                                {post.images && post.images[0] && (
                                                                                    <img 
                                                                                        src={post.images[0]} 
                                                                                        alt="Post" 
                                                                                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, marginRight: 8 }}
                                                                                    />
                                                                                )}
                                                                                <Box>
                                                                                    <Typography variant="body2" fontWeight="bold">@{post.username}</Typography>
                                                                                    <Typography variant="caption" color="text.secondary">
                                                                                        {post.timestamp ? new Date(post.timestamp).toLocaleDateString() : ''}
                                                                                    </Typography>
                                                                                </Box>
                                                                            </Box>
                                                                        </TableCell>
                                                                        <TableCell sx={{ maxWidth: 250 }}>
                                                                            <Typography variant="body2" noWrap title={post.caption}>
                                                                                {post.caption ? post.caption.substring(0, 80) + (post.caption.length > 80 ? '...' : '') : 'No caption'}
                                                                            </Typography>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Chip 
                                                                                label={post.overallSentiment === 'positive' ? '😊' : post.overallSentiment === 'negative' ? '😞' : '😐'} 
                                                                                size="small"
                                                                                color={
                                                                                    post.overallSentiment === 'positive' ? 'success' :
                                                                                    post.overallSentiment === 'negative' ? 'error' : 'default'
                                                                                }
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Typography variant="body2">❤️ {(post.likes || 0).toLocaleString()}</Typography>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Typography variant="body2">💬 {post.comments_count || 0}</Typography>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Typography variant="body2" color="primary" fontWeight="bold">
                                                                                {((post.likes || 0) + (post.comments_count || 0)).toLocaleString()}
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
                    <Button 
                        onClick={() => setJobResultsDialog({ open: false, job: null, results: [] })}
                        color="primary"
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert 
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default UnifiedSocialScraper;