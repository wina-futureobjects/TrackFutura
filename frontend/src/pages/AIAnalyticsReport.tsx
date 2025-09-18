import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    LinearProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Alert,
    Snackbar,
    Stack,
    Divider,
    Grid,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Download as DownloadIcon,
    Analytics as AnalyticsIcon,
    TrendingUp as TrendingUpIcon,
    ThumbUp as ThumbUpIcon,
    Comment as CommentIcon,
    Share as ShareIcon,
    Article as ArticleIcon,
    EmojiEvents as TrophyIcon,
    SentimentSatisfiedAlt as PositiveSentimentIcon,
    SentimentNeutral as NeutralSentimentIcon,
    SentimentDissatisfied as NegativeSentimentIcon,
    LinkedIn as LinkedInIcon,
    Instagram as InstagramIcon,
    Facebook as FacebookIcon,
    VideoLibrary as TikTokIcon,
    Insights as InsightsIcon,
} from '@mui/icons-material';

interface ConfigDetails {
    id: number;
    name: string;
    platform: string;
    platform_display: string;
    content_type: string;
    content_type_display: string;
    is_active: boolean;
    description: string;
    delay_range: string;
    user_agent_rotation: boolean;
    use_proxy: boolean;
    proxy_list: string | null;
    headless: boolean;
    viewport_width: number;
    viewport_height: number;
    created_at: string;
    updated_at: string;
}

interface ScrapyJob {
    id: number;
    name: string;
    project: number;
    config: number;
    config_details: ConfigDetails;
    target_urls: string[];
    source_names: string[];
    num_of_posts: number;
    start_date: string | null;
    end_date: string | null;
    output_folder_id: string | null;
    auto_create_folders: boolean;
    status: string;
    status_display: string;
    total_urls: number;
    processed_urls: number;
    successful_scrapes: number;
    failed_scrapes: number;
    progress_percentage: number;
    job_metadata: any;
    error_log: string | null;
    scrapy_process_id: string;
    created_at: string;
    updated_at: string;
    started_at: string;
    completed_at: string;
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

interface AIAnalysis {
    success: boolean;
    analysis?: string;
    platform?: string;
    analyzed_posts?: number;
    total_characters?: number;
    error?: string;
}

interface AnalyticsData {
    totalPosts: number;
    totalEngagement: number;
    avgLikes: number;
    totalComments: number;
    totalShares: number;
    sentimentStats: {
        positive: number;
        negative: number;
        neutral: number;
    };
    topPosts: any[];
    posts: any[];
}

const AIAnalyticsReport: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [job, setJob] = useState<ScrapyJob | null>(null);
    const [results, setResults] = useState<ScrapyResult[]>([]);
    const [aiAnalysis, setAIAnalysis] = useState<AIAnalysis | null>(null);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'success' | 'error' | 'info' });

    useEffect(() => {
        if (jobId) {
            fetchJobData();
        }
    }, [jobId]);

    const fetchJobData = async () => {
        try {
            setLoading(true);
            
            // Fetch job details
            const jobResponse = await fetch(`/api/scrapy/api/jobs/${jobId}/`);
            if (!jobResponse.ok) throw new Error('Failed to fetch job details');
            const jobData = await jobResponse.json();
            setJob(jobData);

            // Fetch job results
            const resultsResponse = await fetch(`/api/scrapy/api/jobs/${jobId}/results/`);
            if (!resultsResponse.ok) throw new Error('Failed to fetch job results');
            const resultsData = await resultsResponse.json();
            setResults(resultsData);

            // Process analytics data
            if (resultsData.length > 0) {
                const analytics = processAnalyticsData(resultsData);
                setAnalyticsData(analytics);
                
                // Generate AI analysis
                await generateAIAnalysis(analytics, jobData.config_details?.platform || 'unknown');
            }

        } catch (error) {
            console.error('Error fetching job data:', error);
            setSnackbar({ open: true, message: 'Failed to load analytics data', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const processAnalyticsData = (results: ScrapyResult[]): AnalyticsData => {
        const allPosts = results
            .filter(result => result.success && result.scraped_data)
            .flatMap(result => Array.isArray(result.scraped_data) ? result.scraped_data : [result.scraped_data])
            .filter(Boolean);

        if (allPosts.length === 0) {
            return {
                totalPosts: 0,
                totalEngagement: 0,
                avgLikes: 0,
                totalComments: 0,
                totalShares: 0,
                sentimentStats: { positive: 0, negative: 0, neutral: 0 },
                topPosts: [],
                posts: []
            };
        }

        // Calculate metrics
        const totalLikes = allPosts.reduce((sum, post) => sum + (post.likes || post.num_likes || 0), 0);
        const totalComments = allPosts.reduce((sum, post) => sum + (post.comments_count || post.num_comments || (Array.isArray(post.comments) ? post.comments.length : post.comments) || 0), 0);
        const totalShares = allPosts.reduce((sum, post) => sum + (post.shares || post.num_shares || 0), 0);
        const totalEngagement = totalLikes + totalComments + totalShares;
        const avgLikes = Math.round(totalLikes / allPosts.length);

        // Simple sentiment analysis
        const analyzeSentiment = (text: string): 'positive' | 'negative' | 'neutral' => {
            const positiveWords = ['good', 'great', 'amazing', 'awesome', 'excellent', 'wonderful', 'fantastic', 'love', 'best', 'perfect', 'innovative', 'successful', 'growth', 'opportunity', 'excited', 'proud', 'achievement', 'congratulations', '👏', '🚀', '💼', '✨', '🎉'];
            const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing', 'failed', 'problem', 'issue', 'concern', 'difficult', 'challenge', '😞', '💔', '👎'];
            
            if (!text) return 'neutral';
            
            const lowerText = text.toLowerCase();
            const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
            const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
            
            if (positiveCount > negativeCount) return 'positive';
            if (negativeCount > positiveCount) return 'negative';
            return 'neutral';
        };

        const sentimentData = allPosts.map(post => {
            const textContent = post.text || post.description || post.post_text || post.content || post.caption || '';
            const sentiment = analyzeSentiment(textContent);
            return { ...post, sentiment, textContent };
        });

        const sentimentStats = {
            positive: sentimentData.filter(p => p.sentiment === 'positive').length,
            negative: sentimentData.filter(p => p.sentiment === 'negative').length,
            neutral: sentimentData.filter(p => p.sentiment === 'neutral').length
        };

        // Top performing posts
        const topPosts = sentimentData
            .sort((a, b) => {
                const aEngagement = (a.likes || a.num_likes || 0) + (a.comments_count || a.num_comments || (Array.isArray(a.comments) ? a.comments.length : a.comments) || 0) + (a.shares || a.num_shares || 0);
                const bEngagement = (b.likes || b.num_likes || 0) + (b.comments_count || b.num_comments || (Array.isArray(b.comments) ? b.comments.length : b.comments) || 0) + (b.shares || b.num_shares || 0);
                return bEngagement - aEngagement;
            })
            .slice(0, 10);

        return {
            totalPosts: allPosts.length,
            totalEngagement,
            avgLikes,
            totalComments,
            totalShares,
            sentimentStats,
            topPosts,
            posts: sentimentData
        };
    };

    const generateAIAnalysis = async (analytics: AnalyticsData, platform: string) => {
        try {
            const textContent = analytics.posts.map(post => post.textContent).filter(Boolean);
            
            if (textContent.length === 0) {
                setAIAnalysis({
                    success: false,
                    error: 'No text content available for analysis'
                });
                return;
            }

            const combinedText = textContent.slice(0, 50).join('\n\n'); // Limit to first 50 posts
            
            const prompt = `
            Analyze the following ${platform} social media content and provide detailed insights:

            Content to analyze:
            ${combinedText}

            Please provide a comprehensive analysis including:

            1. **Content Summary**: A brief overview of the main themes and topics discussed

            2. **Sentiment Analysis**: 
               - Overall sentiment distribution (positive, negative, neutral percentages)
               - Key emotional indicators found in the content

            3. **Common Words Analysis**:
               - Most frequently used positive words (minimum 10 words)
               - Most frequently used negative words (minimum 10 words)
               - Most frequently used neutral/descriptive words (minimum 15 words)
               - Trending hashtags and keywords

            4. **Engagement Insights**:
               - What types of content seem to generate more engagement
               - Best times or patterns for posting
               - Content themes that resonate with the audience

            5. **Comment Strategy Recommendations**:
               - Suggested words and phrases for positive engagement
               - Words to avoid in comments
               - Tone and style recommendations for this audience

            6. **Content Opportunities**:
               - Trending topics to leverage
               - Content gaps or opportunities
               - Audience interests and preferences

            7. **Risk Assessment**:
               - Potential negative sentiment areas
               - Controversial topics to handle carefully
               - Brand safety considerations

            Please format your response in clear sections with actionable insights and specific examples from the analyzed content.
            Make the analysis practical and business-oriented.
            `;

            const response = await fetch('/api/scrapy/api/ai-analysis/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    platform: platform,
                    analyzed_posts: analytics.totalPosts
                })
            });

            if (response.ok) {
                const aiData = await response.json();
                setAIAnalysis(aiData);
            } else {
                throw new Error('Failed to generate AI analysis');
            }

        } catch (error) {
            console.error('Error generating AI analysis:', error);
            setAIAnalysis({
                success: false,
                error: 'Failed to generate AI analysis'
            });
        }
    };

    const downloadPDFReport = async () => {
        try {
            setDownloadLoading(true);
            setSnackbar({ open: true, message: 'Generating PDF report... This may take a few moments.', severity: 'info' });
            
            const response = await fetch(`/api/scrapy/api/jobs/${jobId}/generate_ai_report/`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${job?.name.replace(/\s+/g, '_')}_AI_Report_${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                setSnackbar({ open: true, message: 'PDF report downloaded successfully!', severity: 'success' });
            } else {
                const errorData = await response.json();
                setSnackbar({ open: true, message: `Error generating report: ${errorData.error || 'Unknown error'}`, severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to download PDF report', severity: 'error' });
        } finally {
            setDownloadLoading(false);
        }
    };

    const getPlatformIcon = (platform?: string) => {
        switch (platform?.toLowerCase()) {
            case 'linkedin': return <LinkedInIcon sx={{ fontSize: 32, color: '#0077b5' }} />;
            case 'instagram': return <InstagramIcon sx={{ fontSize: 32, color: '#E4405F' }} />;
            case 'facebook': return <FacebookIcon sx={{ fontSize: 32, color: '#1877F2' }} />;
            case 'tiktok': return <TikTokIcon sx={{ fontSize: 32, color: '#000000' }} />;
            default: return <AnalyticsIcon sx={{ fontSize: 32, color: 'primary.main' }} />;
        }
    };

    if (loading) {
        return (
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                    <Stack spacing={2} alignItems="center">
                        <CircularProgress size={60} />
                        <Typography variant="h6">Loading AI Analytics...</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Processing scraped data and generating insights
                        </Typography>
                    </Stack>
                </Box>
            </Container>
        );
    }

    if (!job || !analyticsData || !job.name) {
        return (
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Alert severity="error">
                    Failed to load analytics data. Please try again.
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate(-1)}
                        variant="outlined"
                    >
                        Back
                    </Button>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getPlatformIcon(job.config_details?.platform)}
                        <Box>
                            <Typography variant="h4" component="h1">
                                AI Analytics Report
                            </Typography>
                            <Typography variant="subtitle1" color="text.secondary">
                                {job.name} • {job.config_details?.platform ? job.config_details.platform.charAt(0).toUpperCase() + job.config_details.platform.slice(1) : 'Unknown Platform'}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
                <Button
                    variant="contained"
                    startIcon={downloadLoading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                    onClick={downloadPDFReport}
                    disabled={downloadLoading}
                    size="large"
                    sx={{ minWidth: 200 }}
                >
                    {downloadLoading ? 'Generating PDF...' : 'Download PDF Report'}
                </Button>
            </Box>

            {/* Summary Cards */}
            <Box sx={{ display: 'flex', justifyContent: 'space-evenly', gap: 3, mb: 4 }}>
                <Card sx={{ width: '23%', height: 160, display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 3 }}>
                        <ArticleIcon sx={{ fontSize: 36, mb: 2, color: 'primary.main' }} />
                        <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                            {analyticsData.totalPosts}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                            Total Posts
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{ width: '23%', height: 160, display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 3 }}>
                        <TrendingUpIcon sx={{ fontSize: 36, mb: 2, color: 'success.main' }} />
                        <Typography variant="h3" color="success.main" sx={{ fontWeight: 'bold', mb: 1 }}>
                            {analyticsData.totalEngagement.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                            Total Engagement
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{ width: '23%', height: 160, display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 3 }}>
                        <ThumbUpIcon sx={{ fontSize: 36, mb: 2, color: 'info.main' }} />
                        <Typography variant="h3" color="info.main" sx={{ fontWeight: 'bold', mb: 1 }}>
                            {analyticsData.avgLikes.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                            Avg Likes/Post
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{ width: '23%', height: 160, display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 3 }}>
                        <CommentIcon sx={{ fontSize: 36, mb: 2, color: 'warning.main' }} />
                        <Typography variant="h3" color="warning.main" sx={{ fontWeight: 'bold', mb: 1 }}>
                            {analyticsData.totalComments.toLocaleString()}
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
                        <InsightsIcon />
                        <Typography variant="h6">Sentiment Analysis</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-evenly', gap: 4 }}>
                        {/* Positive */}
                        <Box sx={{ flex: 1, textAlign: 'center' }}>
                            <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                                Positive ({analyticsData.sentimentStats.positive})
                            </Typography>
                            <Box sx={{ mb: 1 }}>
                                <LinearProgress 
                                    variant="determinate" 
                                    value={analyticsData.totalPosts > 0 ? (analyticsData.sentimentStats.positive / analyticsData.totalPosts) * 100 : 0} 
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
                                {analyticsData.totalPosts > 0 ? Math.round((analyticsData.sentimentStats.positive / analyticsData.totalPosts) * 100) : 0}%
                            </Typography>
                        </Box>

                        {/* Neutral */}
                        <Box sx={{ flex: 1, textAlign: 'center' }}>
                            <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                                Neutral ({analyticsData.sentimentStats.neutral})
                            </Typography>
                            <Box sx={{ mb: 1 }}>
                                <LinearProgress 
                                    variant="determinate" 
                                    value={analyticsData.totalPosts > 0 ? (analyticsData.sentimentStats.neutral / analyticsData.totalPosts) * 100 : 0} 
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
                                {analyticsData.totalPosts > 0 ? Math.round((analyticsData.sentimentStats.neutral / analyticsData.totalPosts) * 100) : 0}%
                            </Typography>
                        </Box>

                        {/* Negative */}
                        <Box sx={{ flex: 1, textAlign: 'center' }}>
                            <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                                Negative ({analyticsData.sentimentStats.negative})
                            </Typography>
                            <Box sx={{ mb: 1 }}>
                                <LinearProgress 
                                    variant="determinate" 
                                    value={analyticsData.totalPosts > 0 ? (analyticsData.sentimentStats.negative / analyticsData.totalPosts) * 100 : 0} 
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
                                {analyticsData.totalPosts > 0 ? Math.round((analyticsData.sentimentStats.negative / analyticsData.totalPosts) * 100) : 0}%
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* AI Analysis */}
            {aiAnalysis && (
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                            <AnalyticsIcon />
                            <Typography variant="h6">AI-Powered Content Analysis</Typography>
                            {aiAnalysis.success && (
                                <Chip 
                                    label="AI Generated" 
                                    color="primary" 
                                    size="small" 
                                    variant="outlined"
                                />
                            )}
                        </Box>
                        
                        {aiAnalysis.success ? (
                            <Box sx={{ '& > *': { mb: 2 } }}>
                                {aiAnalysis.analysis && aiAnalysis.analysis.split('\n').map((paragraph, index) => {
                                    const trimmedParagraph = paragraph.trim();
                                    if (!trimmedParagraph) return null;
                                    
                                    // Handle headers starting with numbers and **bold**
                                    if (trimmedParagraph.match(/^\d+\.\s*\*\*(.+?)\*\*:?/)) {
                                        const headerMatch = trimmedParagraph.match(/^\d+\.\s*\*\*(.+?)\*\*:?(.*)/);
                                        if (headerMatch) {
                                            return (
                                                <Box key={index} sx={{ mt: 3, mb: 2 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                                                        {headerMatch[1]}
                                                    </Typography>
                                                    {headerMatch[2] && (
                                                        <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                                                            {headerMatch[2].trim()}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            );
                                        }
                                    }
                                    
                                    // Handle headers starting with # (make them big and bold)
                                    if (trimmedParagraph.startsWith('#')) {
                                        const level = (trimmedParagraph.match(/^#+/) || [''])[0].length;
                                        const headerText = trimmedParagraph.replace(/^#+\s*/, '');
                                        const variant = level === 1 ? 'h4' : level === 2 ? 'h5' : 'h6';
                                        return (
                                            <Typography key={index} variant={variant} sx={{ 
                                                fontWeight: 'bold', 
                                                color: 'primary.main',
                                                mt: 3,
                                                mb: 2
                                            }}>
                                                {headerText}
                                            </Typography>
                                        );
                                    }
                                    
                                    // Handle bullet points
                                    if (trimmedParagraph.match(/^[-•]\s/)) {
                                        let bulletContent = trimmedParagraph.replace(/^[-•]\s*/, '');
                                        // Convert **bold** to <strong> tags
                                        bulletContent = bulletContent.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                                        // Clean up HTML encoding issues
                                        bulletContent = bulletContent.replace(/&lt;strong&gt;(.+?)&lt;\/strong&gt;/g, '<strong>$1</strong>');
                                        return (
                                            <Typography key={index} variant="body1" sx={{ 
                                                lineHeight: 1.8, 
                                                pl: 2,
                                                mb: 0.5,
                                                position: 'relative',
                                                '&::before': {
                                                    content: '"•"',
                                                    position: 'absolute',
                                                    left: 0,
                                                    color: 'primary.main',
                                                    fontWeight: 'bold'
                                                }
                                            }}
                                            dangerouslySetInnerHTML={{ __html: bulletContent }}
                                            />
                                        );
                                    }
                                    
                                    // Handle regular paragraphs with **bold** and <strong> formatting
                                    let processedText = trimmedParagraph;
                                    
                                    // Convert **bold** to <strong> tags
                                    processedText = processedText.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                                    
                                    // Clean up any malformed HTML or double conversions
                                    processedText = processedText.replace(/<strong><strong>(.+?)<\/strong><\/strong>/g, '<strong>$1</strong>');
                                    
                                    // Ensure proper HTML formatting
                                    processedText = processedText.replace(/&lt;strong&gt;(.+?)&lt;\/strong&gt;/g, '<strong>$1</strong>');
                                    
                                    return (
                                        <Typography 
                                            key={index} 
                                            variant="body1" 
                                            sx={{ lineHeight: 1.8, mb: 1.5 }}
                                            dangerouslySetInnerHTML={{ __html: processedText }}
                                        />
                                    );
                                }).filter(Boolean)}
                            </Box>
                        ) : (
                            <Alert severity="warning">
                                AI analysis could not be generated: {aiAnalysis.error}
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Top Performing Posts */}
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
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
                                    <TableCell>Content</TableCell>
                                    <TableCell>Sentiment</TableCell>
                                    <TableCell>Likes</TableCell>
                                    <TableCell>Comments</TableCell>
                                    <TableCell>Shares</TableCell>
                                    <TableCell>Engagement</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {analyticsData.topPosts.map((post, index) => (
                                    <TableRow key={index} hover>
                                        <TableCell>
                                            <Box 
                                                component="a" 
                                                href={post.url || post.post_url || post.link} 
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
                                                {getPlatformIcon(job.config_details?.platform)}
                                                <Box sx={{ ml: 1 }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                                        View Post
                                                    </Typography>
                                                    {post.timestamp && (
                                                        <Typography variant="caption" display="block" color="text.secondary">
                                                            {new Date(post.timestamp).toLocaleDateString()}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 250 }}>
                                            <Typography variant="body2" noWrap title={post.textContent}>
                                                {post.textContent ? post.textContent.substring(0, 80) + (post.textContent.length > 80 ? '...' : '') : 'No content'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                icon={
                                                    post.sentiment === 'positive' ? <PositiveSentimentIcon /> : 
                                                    post.sentiment === 'negative' ? <NegativeSentimentIcon /> : 
                                                    <NeutralSentimentIcon />
                                                }
                                                label={post.sentiment === 'positive' ? 'Positive' : post.sentiment === 'negative' ? 'Negative' : 'Neutral'} 
                                                size="small"
                                                color={
                                                    post.sentiment === 'positive' ? 'success' :
                                                    post.sentiment === 'negative' ? 'error' : 'default'
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <ThumbUpIcon sx={{ fontSize: 16, color: 'black' }} />
                                                <Typography variant="body2" color="black">{((post.likes || post.num_likes) || 0).toLocaleString()}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <CommentIcon sx={{ fontSize: 16, color: 'black' }} />
                                                <Typography variant="body2" color="black">{(post.comments_count || post.num_comments || (Array.isArray(post.comments) ? post.comments.length : post.comments) || 0)}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <ShareIcon sx={{ fontSize: 16, color: 'black' }} />
                                                <Typography variant="body2" color="black">{(post.shares || post.num_shares || 0)}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="black" fontWeight="bold">
                                                {(((post.likes || post.num_likes) || 0) + ((post.comments_count || post.num_comments || (Array.isArray(post.comments) ? post.comments.length : post.comments)) || 0) + ((post.shares || post.num_shares) || 0)).toLocaleString()}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Snackbar */}
            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={6000} 
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AIAnalyticsReport;