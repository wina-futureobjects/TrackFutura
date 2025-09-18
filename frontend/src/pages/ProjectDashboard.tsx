import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent,
  Button,
  Grid as MuiGrid,
  Divider,
  CircularProgress,
  Paper,
  Breadcrumbs,
  Link,
  Stack,
  LinearProgress,
  Avatar,
  Chip,
  IconButton,
  Tooltip as MuiTooltip,
  Tab,
  Tabs,
  Container,
  useTheme,
  alpha,
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home,
  FolderOpen,
  Instagram,
  Facebook,
  Linkedin,
  Users,
  BarChart3,
  HardDrive,
  TrendingUp,
  CreditCard,
  MoreHorizontal,
  Bell,
  RefreshCw,
  Calendar,
  Gauge,
  Settings,
  Sliders,
  Activity,
  Eye,
  Target,
  Award,
  Clock,
  MessageCircle,
  FileText,
  Download,
  Brain,
  Zap
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import StatCard from '../components/dashboard/StatCard';
import { useScrapyJobs } from '../hooks/useScrapyJobs';
import { useSentimentAnalysis } from '../hooks/useSentimentAnalysis';
import { useAIReport } from '../hooks/useAIReport';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
} from 'recharts';

// Create a Grid component that inherits from MuiGrid to fix type issues
const Grid = (props: any) => <MuiGrid {...props} />;

interface Project {
  id: number;
  name: string;
  description: string | null;
  owner: number;
  owner_name: string;
  created_at: string;
  updated_at: string;
  organization?: {
    id: number;
    name: string;
  };
  status?: 'active' | 'pending' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  progress?: number;
}

// Mock data for the dashboard
interface ProjectStats {
  totalPosts: number;
  totalAccounts: number;
  totalReports: number;
  totalStorageUsed: string;
  creditBalance: number;
  maxCredits: number;
  engagementRate: number;
  growthRate: number;
}

// Demo data for the charts
const activityData = [
  { date: 'Jun', instagram: 340, facebook: 240, linkedin: 180, tiktok: 120 },
  { date: 'Jul', instagram: 520, facebook: 320, linkedin: 220, tiktok: 180 },
  { date: 'Aug', instagram: 450, facebook: 280, linkedin: 310, tiktok: 240 },
  { date: 'Sep', instagram: 610, facebook: 380, linkedin: 340, tiktok: 320 },
  { date: 'Oct', instagram: 580, facebook: 450, linkedin: 290, tiktok: 360 },
];

// Sample LinkedIn data (loaded from the JSON file)
const sampleLinkedInPosts = [
  {
    "top_visible_comments": [
      { "comment": "Amazing!!!" },
      { "comment": "This has been incredibly helpful also as I've brought it into family businesses over the last year! The biggest impact I've seen so far is to that it begins establishing appropriate meeting pulses with the right attendees and agendas." },
      { "comment": "I love small family-owned businesses as well! Thanks for sharing!" }
    ]
  },
  {
    "top_visible_comments": [
      { "comment": "Guys😂 This post isn't about taking breaks!! So read before you comment or react☠️" },
      { "comment": "You don't rise to the level of your marketing. You fall to the level of your services. (I taught James Clear how to write quotes 🤫)" },
      { "comment": "I regret posting this on a Saturday evening 🥲" },
      { "comment": "Ever felt the weight of \"urgent\"? Clients texting, calls flooding. Brain: chaos. Peace: a fantasy. But what if you just… paused? Missing deadlines, losing sleep. How do you reclaim that focus? We all crave a breath of fresh air." },
      { "comment": "Wonderfully elaborated Simran 👏" },
      { "comment": "That was amazing Simran Kaur 🔮 🙂↕️" },
      { "comment": "Damn. Loved the flow" },
      { "comment": "Can I get a class for hooks?😌" },
      { "comment": "Love the way you said those things✨" },
      { "comment": "Work-life balance is so hard to achieve these tips work perfectly to have endlessly free time on your hands. Thanks Simran !" }
    ]
  }
];

// Simple sentiment analysis function
const analyzeSentiment = (comment: string): 'positive' | 'neutral' | 'negative' => {
  const positiveWords = ['amazing', 'incredible', 'helpful', 'love', 'wonderful', 'great', 'awesome', 'excellent', 'fantastic', 'good', 'thanks', 'thank you', 'appreciate', 'brilliant', 'perfect', '👏', '🔮', '✨', '🙂', '😌'];
  const negativeWords = ['terrible', 'awful', 'bad', 'hate', 'horrible', 'disgusting', 'stupid', 'boring', 'waste', 'regret', 'chaos', 'urgent', '😂', '☠️', '🥲'];
  
  const lowerComment = comment.toLowerCase();
  
  let positiveScore = 0;
  let negativeScore = 0;
  
  positiveWords.forEach(word => {
    if (lowerComment.includes(word)) {
      positiveScore++;
    }
  });
  
  negativeWords.forEach(word => {
    if (lowerComment.includes(word)) {
      negativeScore++;
    }
  });
  
  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
};

// Process the comments and generate sentiment data
const processCommentsForSentiment = () => {
  const allComments: string[] = [];
  
  sampleLinkedInPosts.forEach(post => {
    if (post.top_visible_comments) {
      post.top_visible_comments.forEach(commentObj => {
        allComments.push(commentObj.comment);
      });
    }
  });
  
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  
  allComments.forEach(comment => {
    const sentiment = analyzeSentiment(comment);
    if (sentiment === 'positive') positive++;
    else if (sentiment === 'negative') negative++;
    else neutral++;
  });
  
  return [
    { name: 'Positive', value: positive, color: '#4CAF50' }, // Green from existing success color
    { name: 'Neutral', value: neutral, color: '#2196F3' },   // Blue from existing primary color  
    { name: 'Negative', value: negative, color: '#E91E63' }  // Pink/purple from existing colors
  ];
};

// Use fallback data only if no real sentiment data is available
const fallbackSentimentData = processCommentsForSentiment();

// Additional mock data for enhanced dashboard
const recentActivity = [
  { id: 1, action: 'New Instagram post uploaded', time: '2 hours ago', type: 'upload' },
  { id: 2, action: 'Facebook analysis completed', time: '4 hours ago', type: 'analysis' },
  { id: 3, action: 'Report generated successfully', time: '1 day ago', type: 'report' },
  { id: 4, action: 'LinkedIn data imported', time: '2 days ago', type: 'import' },
];

const topPerformers = [
  { platform: 'Instagram', account: '@brand_official', engagement: '8.4%', growth: '+12.3%' },
  { platform: 'Facebook', account: 'Brand Page', engagement: '6.2%', growth: '+8.1%' },
  { platform: 'LinkedIn', account: 'Company Page', engagement: '4.8%', growth: '+15.2%' },
];

const weeklyGoals = [
  { goal: 'Post Uploads', current: 45, target: 60, percentage: 75 },
  { goal: 'Engagement Rate', current: 3.2, target: 4.0, percentage: 80 },
  { goal: 'New Followers', current: 1200, target: 1500, percentage: 80 },
];

const ProjectDashboard = () => {
  const theme = useTheme();
  // Get parameters from both URL patterns
  const { projectId, organizationId } = useParams<{ 
    projectId: string;
    organizationId?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Project stats - will be fetched from API
  const [stats, setStats] = useState<ProjectStats>({
    totalPosts: 0,
    totalAccounts: 0,
    totalReports: 0,
    totalStorageUsed: '0 MB',
    creditBalance: 0,
    maxCredits: 0,
    engagementRate: 0,
    growthRate: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Determine which URL pattern we're using
  const isOrgProjectUrl = location.pathname.includes('/organizations/') && location.pathname.includes('/projects/');

  // Initialize scrapy jobs and sentiment analysis hooks
  const {
    jobs,
    loading: jobsLoading,
    getJobStats,
    getPlatformDistribution,
    getMostRecentJobWithData
  } = useScrapyJobs({
    projectId: projectId ? parseInt(projectId) : undefined
  });

  // Get the most recent job with data for sentiment analysis
  const recentJobWithData = getMostRecentJobWithData();

  const {
    sentimentData,
    loading: sentimentLoading,
    error: sentimentError,
    chartData: sentimentChartData,
    summary: sentimentSummary,
    analyzeSentiment
  } = useSentimentAnalysis({
    jobId: recentJobWithData?.id
  });

  // Initialize AI report generation
  const {
    loading: reportLoading,
    error: reportError,
    generateReport,
    generateSentimentAnalysis
  } = useAIReport();

  // Get current sentiment data (real data if available, fallback otherwise)
  const getCurrentSentimentData = () => {
    return sentimentChartData.length > 0 ? sentimentChartData : fallbackSentimentData;
  };

  // Get current platform distribution (real data if available, fallback otherwise)
  const getCurrentPlatformDistribution = () => {
    const realDistribution = getPlatformDistribution();
    if (realDistribution.length > 0) {
      return realDistribution.map(item => ({
        name: item.name,
        value: item.value, // This is already percentage
        color: item.color
      }));
    }

    // Fallback data
    return [
      { name: 'Instagram', value: 45, color: '#E1306C' },
      { name: 'Facebook', value: 30, color: '#1877F2' },
      { name: 'LinkedIn', value: 15, color: '#0A66C2' },
      { name: 'TikTok', value: 10, color: '#000000' },
    ];
  };

  // Function to fetch project statistics
  const fetchProjectStats = async () => {
    if (!projectId) return;
    
    try {
      setStatsLoading(true);
      const response = await apiFetch(`/api/users/projects/${projectId}/stats/`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch project statistics');
      }
      
      const data = await response.json();
      setStats({
        totalPosts: data.totalPosts || 0,
        totalAccounts: data.totalAccounts || 0,
        totalReports: data.totalReports || 0,
        totalStorageUsed: data.totalStorageUsed || '0 MB',
        creditBalance: data.creditBalance || 0,
        maxCredits: data.maxCredits || 0,
        engagementRate: data.engagementRate || 0,
        growthRate: data.growthRate || 0
      });
    } catch (error) {
      console.error('Error fetching project statistics:', error);
      // Don't set error state for stats - just log it and keep using default values
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      
      try {
        setLoading(true);
        const response = await apiFetch(`/api/users/projects/${projectId}/`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch project details');
        }
        
        const data = await response.json();
        setProject(data);
        
        // If we're using the old URL pattern but have organization info,
        // redirect to the new URL pattern
        if (!isOrgProjectUrl && data.organization && data.organization.id) {
          navigate(`/organizations/${data.organization.id}/projects/${projectId}`, { replace: true });
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        setError('Failed to load project. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProject();
    fetchProjectStats();
  }, [projectId, isOrgProjectUrl]);

  // Function to get the project URL in the correct format
  const getProjectUrl = () => {
    if (organizationId && projectId) {
      return `/organizations/${organizationId}/projects/${projectId}`;
    }
    return `/dashboard/${projectId}`;
  };
  
  // Function to get the organization projects URL
  const getOrganizationProjectsUrl = () => {
    if (organizationId) {
      return `/organizations/${organizationId}/projects`;
    }
    if (project?.organization?.id) {
      return `/organizations/${project.organization.id}/projects`;
    }
    return '/organizations';
  };

  const handleNavigate = (path: string) => {
    // If we have organization and project IDs, use the new URL structure
    if (organizationId && projectId) {
      navigate(path);
    } else if (project?.organization?.id && projectId) {
      // If we have organization info in the project, use that
      const orgId = project.organization.id;
      // If the path doesn't already include organization/project IDs
      if (!path.includes('/organizations/')) {
        navigate(path.replace(/^\//, `/organizations/${orgId}/projects/${projectId}/`));
      } else {
        navigate(path);
      }
    } else {
      // Fallback to old URL structure with query parameters
      const baseUrl = path.split('?')[0];
      navigate(`${baseUrl}?project=${projectId}`);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !project) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography variant="h6">{error || 'Project not found'}</Typography>
          <Button 
            variant="contained" 
            sx={{ mt: 2 }} 
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%', 
      backgroundColor: '#f8f9fd',
      p: { xs: 2, md: 3, lg: 4 },
      flexGrow: 1,
      minHeight: '100vh'
    }}>
      <Box sx={{ mx: 'auto', maxWidth: 'none', width: '100%' }}>
        {/* Dashboard Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight={600} gutterBottom>
                {project?.name || 'Project Dashboard'}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Track your social media performance and manage your content across platforms
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<RefreshCw size={16} />}
              onClick={fetchProjectStats}
              disabled={statsLoading}
              sx={{ 
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': { borderColor: 'primary.main' }
              }}
            >
              {statsLoading ? 'Refreshing...' : 'Refresh Stats'}
            </Button>
          </Box>
        </Box>

        {/* Dashboard Stats Cards */}
        <Grid container columns={12} spacing={4} sx={{ mb: 4 }}>
          <Grid gridColumn={{ xs: 'span 12', sm: 'span 6', md: 'span 3', xl: 'span 3' }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', height: '100%', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="subtitle1" color="text.secondary" fontWeight={500}>Total Posts</Typography>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, width: 48, height: 48 }}>
                  <BarChart3 size={22} />
                </Avatar>
              </Box>
              {statsLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CircularProgress size={24} color="primary" />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    Loading...
                  </Typography>
                </Box>
              ) : (
                <>
                  <Typography variant="h3" fontWeight={700} gutterBottom sx={{ color: 'text.primary' }}>
                    {stats.totalPosts.toLocaleString()}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip 
                      label={`+12.5%`} 
                      size="small" 
                      sx={{ 
                        bgcolor: alpha(theme.palette.success.main, 0.1), 
                        color: theme.palette.success.main,
                        mr: 1,
                        fontWeight: 600
                      }} 
                    />
                    <Typography variant="body2" color="text.secondary">vs last period</Typography>
                  </Box>
                </>
              )}
            </Paper>
          </Grid>
          <Grid gridColumn={{ xs: 'span 12', sm: 'span 6', md: 'span 3', xl: 'span 3' }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', height: '100%', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="subtitle1" color="text.secondary" fontWeight={500}>Total Accounts</Typography>
                <Avatar sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), color: theme.palette.secondary.main, width: 48, height: 48 }}>
                  <Users size={22} />
                </Avatar>
              </Box>
              {statsLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CircularProgress size={24} color="secondary" />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    Loading...
                  </Typography>
                </Box>
              ) : (
                <>
                  <Typography variant="h3" fontWeight={700} gutterBottom sx={{ color: 'text.primary' }}>
                    {stats.totalAccounts.toLocaleString()}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip 
                      label={`+5.2%`} 
                      size="small" 
                      sx={{ 
                        bgcolor: alpha(theme.palette.success.main, 0.1), 
                        color: theme.palette.success.main,
                        mr: 1,
                        fontWeight: 600
                      }} 
                    />
                    <Typography variant="body2" color="text.secondary">vs last period</Typography>
                  </Box>
                </>
              )}
            </Paper>
          </Grid>
          <Grid gridColumn={{ xs: 'span 12', sm: 'span 6', md: 'span 3', xl: 'span 3' }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', height: '100%', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="subtitle1" color="text.secondary" fontWeight={500}>Engagement Rate</Typography>
                <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main, width: 48, height: 48 }}>
                  <TrendingUp size={22} />
                </Avatar>
              </Box>
              {statsLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CircularProgress size={24} color="success" />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    Loading...
                  </Typography>
                </Box>
              ) : (
                <>
                  <Typography variant="h3" fontWeight={700} gutterBottom sx={{ color: 'text.primary' }}>
                    {stats.engagementRate}%
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip 
                      label={`+0.8%`} 
                      size="small" 
                      sx={{ 
                        bgcolor: alpha(theme.palette.success.main, 0.1), 
                        color: theme.palette.success.main,
                        mr: 1,
                        fontWeight: 600
                      }} 
                    />
                    <Typography variant="body2" color="text.secondary">vs last period</Typography>
                  </Box>
                </>
              )}
            </Paper>
          </Grid>
          <Grid gridColumn={{ xs: 'span 12', sm: 'span 6', md: 'span 3', xl: 'span 3' }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', height: '100%', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="subtitle1" color="text.secondary" fontWeight={500}>Storage Used</Typography>
                <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main, width: 48, height: 48 }}>
                  <HardDrive size={22} />
                </Avatar>
              </Box>
              {statsLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CircularProgress size={24} color="warning" />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    Loading...
                  </Typography>
                </Box>
              ) : (
                <>
                  <Typography variant="h3" fontWeight={700} gutterBottom sx={{ color: 'text.primary' }}>
                    {stats.totalStorageUsed}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip 
                      label={`${Math.round((stats.creditBalance / stats.maxCredits) * 100)}%`} 
                      size="small" 
                      sx={{ 
                        bgcolor: alpha(theme.palette.info.main, 0.1), 
                        color: theme.palette.info.main,
                        mr: 1,
                        fontWeight: 600
                      }} 
                    />
                    <Typography variant="body2" color="text.secondary">of quota used</Typography>
                  </Box>
                </>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Activity, Platform Distribution, and Sentiment Analysis Charts */}
        <Grid container columns={12} spacing={4} sx={{ mb: 4 }}>
          <Grid gridColumn={{ xs: 'span 12', lg: 'span 6' }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>Activity Overview</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Posts and engagements across platforms over time
                  </Typography>
                </Box>
                <Box>
                  <Button 
                    variant="text" 
                    endIcon={<Calendar size={16} />}
                    sx={{ color: 'text.secondary' }}
                    size="small"
                  >
                    Last 30 Days
                  </Button>
                </Box>
              </Box>
              <Box sx={{ height: 320, width: '100%', mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={activityData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorInstagram" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E1306C" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#E1306C" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorFacebook" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1877F2" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#1877F2" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorLinkedin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0A66C2" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0A66C2" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorTiktok" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#000000" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#000000" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fill: '#666666' }} />
                    <YAxis tick={{ fill: '#666666' }} />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: 8, 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        border: 'none' 
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="instagram" 
                      stroke="#E1306C" 
                      fillOpacity={1}
                      fill="url(#colorInstagram)" 
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="facebook" 
                      stroke="#1877F2" 
                      fillOpacity={1}
                      fill="url(#colorFacebook)" 
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="linkedin" 
                      stroke="#0A66C2" 
                      fillOpacity={1}
                      fill="url(#colorLinkedin)" 
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="tiktok" 
                      stroke="#000000" 
                      fillOpacity={1}
                      fill="url(#colorTiktok)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
          
          <Grid gridColumn={{ xs: 'span 12', md: 'span 6', lg: 'span 3' }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', height: '100%', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>Platform Distribution</Typography>
                <IconButton size="small">
                  <MoreHorizontal size={16} />
                </IconButton>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Breakdown of your data across platforms
              </Typography>
              
              <Box sx={{ height: 240, display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getCurrentPlatformDistribution()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={1}
                      stroke="#fff"
                    >
                      {getCurrentPlatformDistribution().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value}%`, 'Percentage']}
                      contentStyle={{ 
                        borderRadius: 8, 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        border: 'none' 
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      layout="horizontal"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span style={{ color: '#666', fontSize: '0.75rem' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          <Grid gridColumn={{ xs: 'span 12', md: 'span 6', lg: 'span 3' }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', height: '100%', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>Comment Sentiment</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {recentJobWithData && (
                    <>
                      <MuiTooltip title="Refresh sentiment analysis with AI">
                        <IconButton
                          size="small"
                          onClick={() => analyzeSentiment(recentJobWithData.id)}
                          disabled={sentimentLoading || reportLoading}
                          sx={{ color: 'primary.main' }}
                        >
                          {sentimentLoading ? <CircularProgress size={16} /> : <Brain size={16} />}
                        </IconButton>
                      </MuiTooltip>
                      <MuiTooltip title="Generate comprehensive AI report">
                        <IconButton
                          size="small"
                          onClick={() => generateReport(recentJobWithData.id)}
                          disabled={reportLoading || sentimentLoading}
                          sx={{ color: 'success.main' }}
                        >
                          {reportLoading ? <CircularProgress size={16} /> : <FileText size={16} />}
                        </IconButton>
                      </MuiTooltip>
                    </>
                  )}
                  <IconButton size="small">
                    <MoreHorizontal size={16} />
                  </IconButton>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {sentimentSummary || 'AI-powered sentiment analysis of social media content'}
              </Typography>

              {sentimentLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1, mb: 2 }}>
                  <CircularProgress size={16} />
                  <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                    Analyzing with OpenAI...
                  </Typography>
                </Box>
              )}

              {sentimentError && !sentimentLoading && (
                <Typography variant="caption" color="warning.main" sx={{ mb: 2, display: 'block', fontStyle: 'italic' }}>
                  Using fallback analysis
                </Typography>
              )}
              
              <Box sx={{ height: 240, display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getCurrentSentimentData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="#fff"
                    >
                      {getCurrentSentimentData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        `${value} comments`, 
                        name
                      ]}
                      contentStyle={{ 
                        borderRadius: 8, 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        border: 'none' 
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      layout="horizontal"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span style={{ color: '#666', fontSize: '0.75rem', fontWeight: 500 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Word Cloud Section */}
        <Grid container columns={12} spacing={4} sx={{ mb: 4 }}>
          <Grid gridColumn={{ xs: 'span 12' }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>Comment Word Cloud</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Most frequently used words in LinkedIn comments
                  </Typography>
                </Box>
                <IconButton size="small">
                  <MoreHorizontal size={16} />
                </IconButton>
              </Box>
              
              <Box sx={{ 
                height: 400, 
                display: 'flex', 
                flexWrap: 'wrap', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: 2,
                p: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.02),
                borderRadius: 2
              }}>
                {(() => {
                  // Generate word cloud data from comments
                  const allComments = sampleLinkedInPosts
                    .flatMap(post => post.top_visible_comments || [])
                    .map(comment => comment.comment);
                  
                  // Extract words and count frequency
                  const wordFreq: { [key: string]: number } = {};
                  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'];
                  
                  allComments.forEach(comment => {
                    const words = comment.toLowerCase()
                      .replace(/[^\w\s]/g, ' ')
                      .split(/\s+/)
                      .filter(word => word.length > 2 && !stopWords.includes(word));
                    
                    words.forEach(word => {
                      wordFreq[word] = (wordFreq[word] || 0) + 1;
                    });
                  });
                  
                  // Sort by frequency and take top words
                  const topWords = Object.entries(wordFreq)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 30);
                  
                  const maxFreq = Math.max(...topWords.map(([,freq]) => freq));
                  
                  return topWords.map(([word, freq], index) => {
                    const size = 12 + (freq / maxFreq) * 24; // Size between 12px and 36px
                    
                    // Determine sentiment color based on word
                    let color = '#2196F3'; // Default neutral blue
                    const sentiment = analyzeSentiment(word);
                    if (sentiment === 'positive') color = '#4CAF50'; // Green
                    else if (sentiment === 'negative') color = '#E91E63'; // Pink
                    
                    return (
                      <Box
                        key={word}
                        sx={{
                          fontSize: `${size}px`,
                          fontWeight: freq > 1 ? 600 : 400,
                          color: color,
                          opacity: 0.7 + (freq / maxFreq) * 0.3,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            opacity: 1,
                            transform: 'scale(1.1)'
                          }
                        }}
                      >
                        {word}
                      </Box>
                    );
                  });
                })()}
              </Box>
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#4CAF50' }} />
                  <Typography variant="caption" color="text.secondary">Positive</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#2196F3' }} />
                  <Typography variant="caption" color="text.secondary">Neutral</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#E91E63' }} />
                  <Typography variant="caption" color="text.secondary">Negative</Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>


        {/* Additional Dashboard Content */}
        <Grid container columns={12} spacing={4} sx={{ mb: 4 }}>
          {/* Recent Activity */}
          <Grid gridColumn={{ xs: 'span 12', md: 'span 6', lg: 'span 4' }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', height: '100%', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>Recent Activity</Typography>
                <IconButton size="small">
                  <RefreshCw size={16} />
                </IconButton>
              </Box>
              <Stack spacing={2.5}>
                {recentActivity.map((activity) => (
                  <Box key={activity.id} sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                    <Avatar sx={{ 
                      bgcolor: activity.type === 'upload' ? alpha(theme.palette.primary.main, 0.1) :
                                activity.type === 'analysis' ? alpha(theme.palette.success.main, 0.1) :
                                activity.type === 'report' ? alpha(theme.palette.warning.main, 0.1) :
                                alpha(theme.palette.info.main, 0.1),
                      color: activity.type === 'upload' ? theme.palette.primary.main :
                             activity.type === 'analysis' ? theme.palette.success.main :
                             activity.type === 'report' ? theme.palette.warning.main :
                             theme.palette.info.main,
                      width: 40,
                      height: 40
                    }}>
                      {activity.type === 'upload' && <Activity size={18} />}
                      {activity.type === 'analysis' && <Target size={18} />}
                      {activity.type === 'report' && <BarChart3 size={18} />}
                      {activity.type === 'import' && <HardDrive size={18} />}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" fontWeight={500}>{activity.action}</Typography>
                      <Typography variant="caption" color="text.secondary">{activity.time}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid>

          {/* Top Performers */}
          <Grid gridColumn={{ xs: 'span 12', md: 'span 6', lg: 'span 4' }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', height: '100%', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>Top Performers</Typography>
                <IconButton size="small">
                  <Award size={16} />
                </IconButton>
              </Box>
              <Stack spacing={3.5}>
                {topPerformers.map((performer, index) => (
                  <Box key={index}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ 
                          bgcolor: performer.platform === 'Instagram' ? '#E1306C' :
                                   performer.platform === 'Facebook' ? '#1877F2' :
                                   '#0A66C2',
                          width: 36,
                          height: 36
                        }}>
                          {performer.platform === 'Instagram' && <Instagram size={16} />}
                          {performer.platform === 'Facebook' && <Facebook size={16} />}
                          {performer.platform === 'LinkedIn' && <Linkedin size={16} />}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{performer.account}</Typography>
                          <Typography variant="caption" color="text.secondary">{performer.platform}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" fontWeight={600}>{performer.engagement}</Typography>
                        <Typography variant="caption" color="success.main">{performer.growth}</Typography>
                      </Box>
                    </Box>
                    {index < topPerformers.length - 1 && <Divider />}
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid>

          {/* Weekly Goals */}
          <Grid gridColumn={{ xs: 'span 12', md: 'span 12', lg: 'span 4' }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', height: '100%', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>Weekly Goals</Typography>
                <IconButton size="small">
                  <Target size={16} />
                </IconButton>
              </Box>
              <Stack spacing={3.5}>
                {weeklyGoals.map((goal, index) => (
                  <Box key={index}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="body2" fontWeight={500}>{goal.goal}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {goal.goal === 'Engagement Rate' ? `${goal.current}% / ${goal.target}%` : `${goal.current} / ${goal.target}`}
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={goal.percentage} 
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 5
                        }
                      }} 
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {goal.percentage}% complete
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Quick Access Platform Buttons */}
        <Grid container columns={12} spacing={4}>
          <Grid gridColumn={{ xs: 'span 12' }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Quick Access</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Navigate to different platform data and tools
              </Typography>
              <Grid container columns={12} spacing={3}>
                <Grid gridColumn={{ xs: 'span 6', sm: 'span 4', md: 'span 3', lg: 'span 2', xl: 'span 2' }}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<Instagram size={20} />}
                    sx={{ 
                      p: 3,
                      py: 3, 
                      justifyContent: 'flex-start',
                      borderColor: '#E1306C',
                      color: '#E1306C',
                      borderRadius: 3,
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      '&:hover': {
                        borderColor: '#E1306C',
                        backgroundColor: 'rgba(225, 48, 108, 0.06)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 16px rgba(225, 48, 108, 0.25)'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onClick={() => {
                      handleNavigate(`/organizations/${organizationId}/projects/${projectId}/instagram-folders`);
                    }}
                  >
                    Instagram
                  </Button>
                </Grid>
                <Grid gridColumn={{ xs: 'span 6', sm: 'span 4', md: 'span 3', lg: 'span 2', xl: 'span 2' }}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<Facebook size={20} />}
                    sx={{ 
                      p: 3,
                      py: 3, 
                      justifyContent: 'flex-start',
                      borderColor: '#1877F2',
                      color: '#1877F2',
                      borderRadius: 3,
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      '&:hover': {
                        borderColor: '#1877F2',
                        backgroundColor: 'rgba(24, 119, 242, 0.06)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 16px rgba(24, 119, 242, 0.25)'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onClick={() => {
                      handleNavigate(`/organizations/${organizationId}/projects/${projectId}/facebook-folders`);
                    }}
                  >
                    Facebook
                  </Button>
                </Grid>
                <Grid gridColumn={{ xs: 'span 6', sm: 'span 4', md: 'span 3', lg: 'span 2', xl: 'span 2' }}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<Linkedin size={20} />}
                    sx={{ 
                      p: 3,
                      py: 3, 
                      justifyContent: 'flex-start',
                      borderColor: '#0A66C2',
                      color: '#0A66C2',
                      borderRadius: 3,
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      '&:hover': {
                        borderColor: '#0A66C2',
                        backgroundColor: 'rgba(10, 102, 194, 0.06)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 16px rgba(10, 102, 194, 0.25)'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onClick={() => {
                      handleNavigate(`/organizations/${organizationId}/projects/${projectId}/linkedin-folders`);
                    }}
                  >
                    LinkedIn
                  </Button>
                </Grid>
                <Grid gridColumn={{ xs: 'span 6', sm: 'span 4', md: 'span 3', lg: 'span 2', xl: 'span 2' }}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<MessageCircle size={20} />}
                    sx={{ 
                      p: 3,
                      py: 3, 
                      justifyContent: 'flex-start',
                      borderColor: '#000000',
                      color: '#000000',
                      borderRadius: 3,
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      '&:hover': {
                        borderColor: '#000000',
                        backgroundColor: 'rgba(0, 0, 0, 0.06)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25)'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onClick={() => {
                      handleNavigate(`/organizations/${organizationId}/projects/${projectId}/tiktok-folders`);
                    }}
                  >
                    TikTok
                  </Button>
                </Grid>
                <Grid gridColumn={{ xs: 'span 6', sm: 'span 4', md: 'span 3', lg: 'span 2', xl: 'span 2' }}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<Users size={20} />}
                    sx={{ 
                      p: 3,
                      py: 3, 
                      justifyContent: 'flex-start',
                      borderColor: '#6200EA',
                      color: '#6200EA',
                      borderRadius: 3,
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      '&:hover': {
                        borderColor: '#6200EA',
                        backgroundColor: 'rgba(98, 0, 234, 0.06)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 16px rgba(98, 0, 234, 0.25)'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onClick={() => {
                      handleNavigate(`/organizations/${organizationId}/projects/${projectId}/track-accounts/accounts`);
                    }}
                  >
                    Accounts
                  </Button>
                </Grid>
                <Grid gridColumn={{ xs: 'span 6', sm: 'span 4', md: 'span 3', lg: 'span 2', xl: 'span 2' }}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<BarChart3 size={20} />}
                    sx={{ 
                      p: 3,
                      py: 3, 
                      justifyContent: 'flex-start',
                      borderColor: '#FFA000',
                      color: '#FFA000',
                      borderRadius: 3,
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      '&:hover': {
                        borderColor: '#FFA000',
                        backgroundColor: 'rgba(255, 160, 0, 0.06)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 16px rgba(255, 160, 0, 0.25)'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onClick={() => {
                      handleNavigate(`/organizations/${organizationId}/projects/${projectId}/report-folders`);
                    }}
                  >
                    Reports
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default ProjectDashboard; 