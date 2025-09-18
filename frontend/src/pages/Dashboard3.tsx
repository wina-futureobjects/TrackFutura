import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid as MuiGrid,
  Card,
  CardContent,
  Divider,
  Stack,
  Button,
  useTheme,
  alpha,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconUsers,
  IconEye,
  IconMouse,
  IconClock,
  IconWorldWww,
  IconDeviceMobile,
  IconDeviceDesktop,
  IconArrowUpRight,
  IconArrowDownRight,
  IconDots,
  IconRefresh,
  IconDownload,
  IconFilter,
  IconCalendar,
  IconMapPin,
  IconChartLine,
  IconChartArea,
  IconChartBar,
  IconInfoCircle,
} from '@tabler/icons-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { apiFetch } from '../utils/api';

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
}

// Social media analytics data structure
interface SocialMediaAnalytics {
  instagramPosts: number;
  facebookPosts: number;
  linkedinPosts: number;
  tiktokPosts: number;
  instagramEngagement: number;
  facebookEngagement: number;
  linkedinEngagement: number;
  tiktokEngagement: number;
  instagramChange: number;
  facebookChange: number;
  linkedinChange: number;
  tiktokChange: number;
}

// Sample social media engagement data (engagement rates as percentages)
const dailySocialMediaData = [
  { date: 'May 16', instagram: 15.2, facebook: 12.8, linkedin: 18.5, tiktok: 22.1 },
  { date: 'May 17', instagram: 17.8, facebook: 14.3, linkedin: 19.2, tiktok: 24.5 },
  { date: 'May 18', instagram: 13.9, facebook: 11.2, linkedin: 16.8, tiktok: 19.3 },
  { date: 'May 19', instagram: 19.5, facebook: 16.1, linkedin: 21.4, tiktok: 26.8 },
  { date: 'May 20', instagram: 21.2, facebook: 17.9, linkedin: 20.1, tiktok: 28.2 },
  { date: 'May 21', instagram: 16.8, facebook: 13.7, linkedin: 22.3, tiktok: 23.6 },
  { date: 'May 22', instagram: 18.4, facebook: 15.2, linkedin: 19.8, tiktok: 25.1 },
  { date: 'May 23', instagram: 20.1, facebook: 16.8, linkedin: 23.7, tiktok: 27.4 },
];

const engagementData = [
  { name: 'High Engagement', value: 1840, color: '#62EF83' }, // Corporate success green
  { name: 'Medium Engagement', value: 3210, color: '#6EE5D9' }, // Corporate secondary teal
  { name: 'Low Engagement', value: 1250, color: '#D291E2' }, // Corporate primary purple
];

const platformPerformanceData = [
  { platform: 'Instagram', posts: 1250, percentage: 38.4, color: '#62EF83' },
  { platform: 'Facebook', posts: 892, percentage: 27.4, color: '#6EE5D9' },
  { platform: 'LinkedIn', posts: 634, percentage: 19.5, color: '#D291E2' },
  { platform: 'TikTok', posts: 468, percentage: 14.4, color: '#1976d2' },
  { platform: 'Other', posts: 12, percentage: 0.3, color: '#9e9e9e' },
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

// Process the real comments and generate sentiment data
const processCommentsForSentiment = (comments: any[] = []) => {
  if (!comments || comments.length === 0) {
    // Fallback to sample data if no real comments available
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
    
    const total = positive + neutral + negative;
    
    return [
      { 
        name: 'Positive', 
        value: positive, 
        percentage: total > 0 ? Math.round((positive / total) * 100) : 0,
        color: '#62EF83', // Corporate success green
        icon: '😊'
      },
      { 
        name: 'Neutral', 
        value: neutral, 
        percentage: total > 0 ? Math.round((neutral / total) * 100) : 0,
        color: '#6EE5D9', // Corporate secondary teal
        icon: '😐'
      },
      { 
        name: 'Negative', 
        value: negative, 
        percentage: total > 0 ? Math.round((negative / total) * 100) : 0,
        color: '#D291E2', // Corporate primary purple
        icon: '😞'
      }
    ];
  }
  
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  
  console.log('Processing comments for sentiment:', { 
    totalComments: comments.length,
    sampleCommentKeys: comments.length > 0 ? Object.keys(comments[0]) : [],
    sampleComment: comments[0] 
  });

  comments.forEach((comment, index) => {
    // Handle different possible field names for comment text based on the actual data structure
    const commentText = comment.comment_text ||      // Facebook comment field (primary)
                       comment.comment ||            // Instagram comment field
                       comment.content ||            // Other platforms
                       comment.text ||               // Generic text field
                       comment.body ||               // Body field
                       comment.message ||            // Message field
                       '';
    
    if (index < 3) {
      console.log(`Comment ${index}:`, { 
        commentText: commentText.substring(0, 100) + (commentText.length > 100 ? '...' : ''),
        originalKeys: Object.keys(comment),
        platform: comment.platform || 'unknown'
      });
    }
    
    if (commentText && typeof commentText === 'string' && commentText.length > 2) {
      const sentiment = analyzeSentiment(commentText);
      if (sentiment === 'positive') positive++;
      else if (sentiment === 'negative') negative++;
      else neutral++;
    }
  });
  
  const total = positive + neutral + negative;
  
  return [
    { 
      name: 'Positive', 
      value: positive, 
      percentage: total > 0 ? Math.round((positive / total) * 100) : 0,
      color: '#62EF83', // Corporate success green
      icon: '😊'
    },
    { 
      name: 'Neutral', 
      value: neutral, 
      percentage: total > 0 ? Math.round((neutral / total) * 100) : 0,
      color: '#6EE5D9', // Corporate secondary teal
      icon: '😐'
    },
    { 
      name: 'Negative', 
      value: negative, 
      percentage: total > 0 ? Math.round((negative / total) * 100) : 0,
      color: '#D291E2', // Corporate primary purple
      icon: '😞'
    }
  ];
};

const sentimentData = processCommentsForSentiment([]);

// Enhanced sentiment analysis function for better negative word detection
const analyzeSentimentEnhanced = (comment: string): 'positive' | 'neutral' | 'negative' => {
  const positiveWords = ['amazing', 'incredible', 'helpful', 'love', 'wonderful', 'great', 'awesome', 'excellent', 'fantastic', 'good', 'thanks', 'thank you', 'appreciate', 'brilliant', 'perfect', 'wonderfully', 'elaborated', 'damn', 'loved', 'flow', 'work', 'achieve', 'balance', 'tips', 'perfectly', 'free', 'time', 'hands'];
  const negativeWords = ['terrible', 'awful', 'bad', 'hate', 'horrible', 'disgusting', 'stupid', 'boring', 'waste', 'regret', 'chaos', 'urgent', 'guys', 'read', 'comment', 'react', 'breaks', 'saturday', 'evening', 'weight', 'calls', 'flooding', 'fantasy', 'deadlines', 'losing', 'sleep', 'isn\'t', 'before', 'rise', 'fall', 'level', 'taught', 'posting', 'felt', 'missing', 'reclaim', 'breath', 'fresh', 'air'];
  
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
  
  // Special handling for emojis
  if (lowerComment.includes('😂') || lowerComment.includes('☠️') || lowerComment.includes('🥲')) {
    negativeScore += 2;
  }
  if (lowerComment.includes('👏') || lowerComment.includes('🔮') || lowerComment.includes('✨') || lowerComment.includes('😌')) {
    positiveScore += 2;
  }
  
  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
};

const sentimentDataEnhanced = processCommentsForSentiment([]);

const Dashboard3 = () => {
  const theme = useTheme();
  const { projectId, organizationId } = useParams<{ 
    projectId: string;
    organizationId?: string;
  }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [chartType, setChartType] = useState('area');
  const [realTimeData, setRealTimeData] = useState(dailySocialMediaData);
  const [realEngagementData, setRealEngagementData] = useState(engagementData);
  const [realCommentsData, setRealCommentsData] = useState<any[]>([]);
  const [realSentimentData, setRealSentimentData] = useState(processCommentsForSentiment([]));
  
  // Social media analytics metrics
  const [analytics, setAnalytics] = useState<SocialMediaAnalytics>({
    instagramPosts: 1250,
    facebookPosts: 892,
    linkedinPosts: 634,
    tiktokPosts: 468,
    instagramEngagement: 15.8,
    facebookEngagement: 12.4,
    linkedinEngagement: 18.2,
    tiktokEngagement: 22.6,
    instagramChange: 8.3,
    facebookChange: 5.7,
    linkedinChange: 12.1,
    tiktokChange: 18.9,
  });

  // Fetch social media data functions
  const fetchSocialMediaData = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      
      // Fetch project details
      const projectResponse = await apiFetch(`/api/users/projects/${projectId}/`);
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        setProject(projectData);
      }
      
      // Fetch social media analytics data
      const endpoints = [
        '/api/instagram-data/posts/',
        '/api/facebook-data/posts/',
        '/api/linkedin-data/posts/',
        '/api/tiktok-data/posts/'
      ];
      
      const commentsEndpoints = [
        '/api/instagram-data/comments/',
        '/api/facebook-data/comments/'
        // Note: LinkedIn and TikTok comment endpoints return 404, so we only use working endpoints
      ];
      
      const [postResponses, commentResponses] = await Promise.all([
        Promise.all(
          endpoints.map(endpoint => 
            apiFetch(`${endpoint}?project=${projectId}&limit=100`)
              .then(res => res.ok ? res.json() : { results: [] })
              .catch(() => ({ results: [] }))
          )
        ),
        Promise.all(
          commentsEndpoints.map(endpoint => 
            apiFetch(`${endpoint}?project=${projectId}&limit=500`)
              .then(res => res.ok ? res.json() : { results: [] })
              .catch(() => ({ results: [] }))
          )
        )
      ]);
      
      const [instagramData, facebookData, linkedinData, tiktokData] = postResponses;
      const [instagramComments, facebookComments] = commentResponses;
      
      // Process real data for visualizations (only Instagram and Facebook comments work)
      const allComments = [
        ...(instagramComments.results || []),
        ...(facebookComments.results || [])
      ];
      
      console.log('Fetched comments data:', {
        instagram: instagramComments.results?.length || 0,
        facebook: facebookComments.results?.length || 0,
        total: allComments.length,
        sampleComment: allComments[0],
        sampleInstagramComment: instagramComments.results?.[0],
        sampleFacebookComment: facebookComments.results?.[0]
      });
      
      setRealCommentsData(allComments);
      setRealSentimentData(processCommentsForSentiment(allComments));
      
      // Calculate engagement distribution from real posts
      const allPosts = [
        ...(instagramData.results || []),
        ...(facebookData.results || []),
        ...(linkedinData.results || []),
        ...(tiktokData.results || [])
      ];
      
      const processPlatformPerformance = () => {
        return [
          { 
            name: 'Instagram', 
            value: instagramData.results?.length || 0, 
            color: '#62EF83',
            avgEngagement: calculateAvgEngagement(instagramData.results || [])
          },
          { 
            name: 'Facebook', 
            value: facebookData.results?.length || 0, 
            color: '#6EE5D9',
            avgEngagement: calculateAvgEngagement(facebookData.results || [])
          },
          { 
            name: 'LinkedIn', 
            value: linkedinData.results?.length || 0, 
            color: '#D291E2',
            avgEngagement: calculateAvgEngagement(linkedinData.results || [])
          },
          { 
            name: 'TikTok', 
            value: tiktokData.results?.length || 0, 
            color: '#1976d2',
            avgEngagement: calculateAvgEngagement(tiktokData.results || [])
          }
        ].filter(platform => platform.value > 0);
      };
      
      // Update platform performance data
      setRealEngagementData(processPlatformPerformance());
      
      // Calculate average engagement rates
      const calculateAvgEngagement = (posts: any[]) => {
        if (posts.length === 0) return 0;
        const totalEngagement = posts.reduce((sum, post) => {
          const likes = post.likes || 0;
          const comments = post.num_comments || post.comments_count || 0;
          return sum + likes + comments;
        }, 0);
        return Math.round((totalEngagement / posts.length) * 100) / 100;
      };
      
      // Update analytics with real data
      setAnalytics(prev => ({
        ...prev,
        instagramPosts: instagramData.results?.length || prev.instagramPosts,
        facebookPosts: facebookData.results?.length || prev.facebookPosts,
        linkedinPosts: linkedinData.results?.length || prev.linkedinPosts,
        tiktokPosts: tiktokData.results?.length || prev.tiktokPosts,
        instagramEngagement: calculateAvgEngagement(instagramData.results || []) || prev.instagramEngagement,
        facebookEngagement: calculateAvgEngagement(facebookData.results || []) || prev.facebookEngagement,
        linkedinEngagement: calculateAvgEngagement(linkedinData.results || []) || prev.linkedinEngagement,
        tiktokEngagement: calculateAvgEngagement(tiktokData.results || []) || prev.tiktokEngagement,
      }));
      
    } catch (error) {
      console.error('Error fetching social media data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocialMediaData();
  }, [projectId]);

  // Add auto-refresh functionality every 5 minutes
  useEffect(() => {
    if (!projectId) return;
    
    const interval = setInterval(() => {
      console.log('Auto-refreshing social media data...');
      fetchSocialMediaData();
    }, 5 * 60 * 1000); // 5 minutes in milliseconds
    
    return () => clearInterval(interval);
  }, [projectId]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const getMetricByTab = () => {
    switch (selectedTab) {
      case 0: return { key: 'instagram', label: 'Instagram Engagement', value: analytics.instagramEngagement, change: analytics.instagramChange, engagement: analytics.instagramEngagement, suffix: '%', posts: analytics.instagramPosts };
      case 1: return { key: 'facebook', label: 'Facebook Engagement', value: analytics.facebookEngagement, change: analytics.facebookChange, engagement: analytics.facebookEngagement, suffix: '%', posts: analytics.facebookPosts };
      case 2: return { key: 'linkedin', label: 'LinkedIn Engagement', value: analytics.linkedinEngagement, change: analytics.linkedinChange, engagement: analytics.linkedinEngagement, suffix: '%', posts: analytics.linkedinPosts };
      case 3: return { key: 'tiktok', label: 'TikTok Engagement', value: analytics.tiktokEngagement, change: analytics.tiktokChange, engagement: analytics.tiktokEngagement, suffix: '%', posts: analytics.tiktokPosts };
      default: return { key: 'instagram', label: 'Instagram Engagement', value: analytics.instagramEngagement, change: analytics.instagramChange, engagement: analytics.instagramEngagement, suffix: '%', posts: analytics.instagramPosts };
    }
  };

  const getCurrentDataKey = () => {
    switch (selectedTab) {
      case 0: return 'instagram';
      case 1: return 'facebook';
      case 2: return 'linkedin';
      case 3: return 'tiktok';
      default: return 'instagram';
    }
  };

  const renderChart = () => {
    const dataKey = getCurrentDataKey();
    
    // Platform-specific colors using existing color scheme
    const getPlatformColor = () => {
      switch (dataKey) {
        case 'instagram': return '#62EF83'; // Corporate success green
        case 'facebook': return '#6EE5D9'; // Corporate secondary teal
        case 'linkedin': return '#D291E2'; // Corporate primary purple
        case 'tiktok': return '#1976d2'; // Corporate blue
        default: return '#1976d2';
      }
    };
    
    const platformColor = getPlatformColor();
    const commonProps = {
      data: realTimeData,
      children: [
        <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f0f0f0" />,
        <XAxis 
          key="xaxis"
          dataKey="date" 
          tick={{ fill: '#666', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />,
        <YAxis 
          key="yaxis"
          tick={{ fill: '#666', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />,
        <Tooltip 
          key="tooltip"
          contentStyle={{ 
            borderRadius: 8, 
            border: '1px solid #e0e0e0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            background: '#fff'
          }}
        />
      ]
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {commonProps.children}
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={platformColor} 
              strokeWidth={2}
              dot={{ fill: platformColor, strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {commonProps.children}
            <Bar 
              dataKey={dataKey} 
              fill={`${platformColor}CC`} 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );
      default: // area
        return (
          <AreaChart {...commonProps}>
            {commonProps.children}
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={platformColor} 
              fill={`${platformColor}1A`} 
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        );
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <Typography variant="h6" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  const currentMetric = getMetricByTab();
  const lastUpdated = new Date().toLocaleString();

  return (
    <Box sx={{ 
      p: 3, 
      bgcolor: '#f8f9fa',
      minHeight: '100vh',
      width: '100%'
    }}>
      {/* Header with Last Updated */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Box>
          <Typography 
            variant="h4" 
            fontWeight={600} 
            sx={{ mb: 0.5, color: 'text.primary' }}
          >
            Social Media Analytics
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1" color="text.secondary">
              {project?.name || 'Nike'} • Real-time insights
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2 }}>
              <IconInfoCircle size={16} color={theme.palette.text.secondary} />
              <Typography variant="body2" color="text.secondary">
                Last updated: {lastUpdated}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<IconCalendar size={16} />}
            sx={{ 
              borderColor: 'divider',
              color: 'text.secondary',
              bgcolor: 'background.paper'
            }}
          >
            Last 7 days
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<IconRefresh size={16} className={loading ? 'rotating' : ''} />}
            onClick={fetchSocialMediaData}
            disabled={loading}
            sx={{ 
              borderColor: 'divider',
              color: 'text.secondary',
              bgcolor: 'background.paper',
              '& .rotating': {
                animation: 'rotation 1s infinite linear',
              },
              '@keyframes rotation': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
              }
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>

      {/* Web Engagement Section with Tabs and Integrated Metrics */}
      <Card 
        elevation={0} 
        sx={{ 
          p: 0, 
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.paper',
          mb: 4
        }}
      >
        {/* Tabs Header */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, pt: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Social Media Engagement
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                  displayEmpty
                  sx={{ fontSize: '0.875rem' }}
                >
                  <MenuItem value="area">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconChartArea size={16} />
                      Area Chart
                    </Box>
                  </MenuItem>
                  <MenuItem value="line">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconChartLine size={16} />
                      Line Chart
                    </Box>
                  </MenuItem>
                  <MenuItem value="bar">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconChartBar size={16} />
                      Bar Chart
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              <Button 
                size="small"
                variant="text"
                endIcon={<IconArrowUpRight size={14} />}
                sx={{ color: 'primary.main', fontWeight: 500 }}
              >
                Open Analysis
              </Button>
              <Button 
                size="small"
                variant="text"
                sx={{ color: 'text.secondary', minWidth: 'auto', p: 1 }}
              >
                <IconDots size={16} />
              </Button>
            </Box>
          </Box>
          <Tabs 
            value={selectedTab} 
            onChange={handleTabChange}
            sx={{ 
              px: 3,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                minWidth: 'auto',
                px: 2
              }
            }}
          >
            <Tab label="Instagram" />
            <Tab label="Facebook" />
            <Tab label="LinkedIn" />
            <Tab label="TikTok" />
          </Tabs>
        </Box>

        {/* Metric Display and Chart */}
        <Box sx={{ p: 3 }}>
          {/* Current Metric Display */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {currentMetric.label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 1 }}>
              <Typography variant="h3" fontWeight={700} color="text.primary">
                {typeof currentMetric.value === 'number' ? currentMetric.value.toLocaleString() : currentMetric.value}
                {currentMetric.suffix || ''}
              </Typography>
              {currentMetric.change !== 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {currentMetric.change > 0 ? (
                    <IconArrowUpRight size={16} color={theme.palette.success.main} />
                  ) : (
                    <IconArrowDownRight size={16} color={theme.palette.error.main} />
                  )}
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 600,
                      color: currentMetric.change > 0 ? 'success.main' : 'error.main'
                    }}
                  >
                    {Math.abs(currentMetric.change)}%
                  </Typography>
                </Box>
              )}
            </Box>
            {/* Post Count Display */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Total Posts:
              </Typography>
              <Typography variant="body1" fontWeight={600} color="primary.main">
                {currentMetric.posts ? currentMetric.posts.toLocaleString() : 'N/A'}
              </Typography>
            </Box>
          </Box>

          {/* Chart */}
          <Box sx={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </Box>
        </Box>
      </Card>

      {/* Main Charts - CSS Grid */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          lg: '2fr 1fr'
        },
        gap: 3,
        mb: 4
      }}>
        {/* Current Live Users */}
        <Card 
          elevation={0} 
          sx={{ 
            p: 3, 
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Platform Performance Overview
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Box 
              sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: 'success.main',
                mr: 1,
                animation: 'pulse 1.5s infinite'
              }} 
            />
            <Typography variant="body2" color="text.secondary">
              Realtime
            </Typography>
          </Box>
          
          {/* Donut Chart */}
          <Box sx={{ position: 'relative', height: 180, mb: 3 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={realEngagementData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {realEngagementData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <Typography variant="h4" fontWeight={700} color="primary.main">
                {realEngagementData.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Active Platforms
              </Typography>
            </Box>
          </Box>

          {/* Engagement Metrics */}
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Active Platforms
              </Typography>
              <Typography variant="h6" fontWeight={600}>
                4/4
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Avg engagement rate
              </Typography>
              <Typography variant="h6" fontWeight={600}>
                17.2%
              </Typography>
            </Box>
          </Stack>
        </Card>

        {/* Comment Sentiment Analysis */}
        <Card 
          elevation={0} 
          sx={{ 
            p: 3, 
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Comment Sentiment
          </Typography>
          
          {/* Professional Icon Indicators */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
            {realSentimentData.map((item, index) => (
              <Box
                key={index}
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: '20px',
                  border: `2px solid ${item.color}`,
                  backgroundColor: 'transparent',
                  color: item.color,
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  minWidth: '80px',
                  justifyContent: 'center'
                }}
              >
                {item.name === 'Positive' && <IconTrendingUp size={16} color={item.color} />}
                {item.name === 'Neutral' && <IconClock size={16} color={item.color} />}
                {item.name === 'Negative' && <IconTrendingDown size={16} color={item.color} />}
                <Typography variant="body2" sx={{ fontWeight: 600, color: item.color }}>
                  {item.name}
                </Typography>
              </Box>
            ))}
          </Box>
          
          {/* Donut Chart */}
          <Box sx={{ position: 'relative', height: 180, mb: 3 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={realSentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {realSentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => [
                    `${props.payload.percentage}%`, 
                    name
                  ]}
                  contentStyle={{ 
                    borderRadius: 8, 
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    border: 'none' 
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>


        </Card>
      </Box>

      {/* Bottom Section - CSS Grid */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          lg: 'repeat(2, 1fr)'
        },
        gap: 3,
        mb: 4
      }}>
        {/* Country Breakdown */}
        <Card 
          elevation={0} 
          sx={{ 
            p: 3, 
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              Post Distribution by Platform
            </Typography>
            <Box sx={{ ml: 1, color: 'text.secondary' }}>
              <IconChartBar size={16} />
            </Box>
          </Box>
          <Stack spacing={2}>
            {platformPerformanceData.map((platform, index) => (
              <Box key={platform.platform} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {platform.platform}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {platform.percentage}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={platform.percentage}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#f0f0f0',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        backgroundColor: platform.color
                      }
                    }}
                  />
                </Box>
                <Typography variant="body2" fontWeight={600} sx={{ minWidth: 60, textAlign: 'right' }}>
                  {platform.posts.toLocaleString()}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Card>

        {/* Comment Word Cloud */}
        <Card 
          elevation={0} 
          sx={{ 
            p: 3, 
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: '#000000' }}>
            Comment Word Cloud
          </Typography>
          
          <Box sx={{ 
            height: 200, 
            display: 'flex', 
            flexWrap: 'wrap', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: 1,
            p: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.02),
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            {(() => {
              // Generate word cloud data from real comments or fallback to sample
              console.log('Processing word cloud from real comments:', { 
                totalComments: realCommentsData.length,
                sampleCommentForWordCloud: realCommentsData[0]
              });
              
              const commentsToProcess = realCommentsData.length > 0 
                ? realCommentsData.map(comment => 
                    comment.comment_text ||      // Facebook comment field (primary)
                    comment.comment ||           // Instagram comment field
                    comment.content ||           // Other platforms
                    comment.text ||              // Generic text field
                    comment.body ||              // Body field
                    comment.message ||           // Message field
                    ''
                  ).filter(text => text && text.length > 2)
                : sampleLinkedInPosts.flatMap(post => post.top_visible_comments || []).map(comment => comment.comment);
              
              // Extract words and count frequency
              const wordFreq: { [key: string]: number } = {};
              const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'];
              
              commentsToProcess.forEach(comment => {
                if (comment) {
                  const words = comment.toLowerCase()
                    .replace(/[^\w\s]/g, ' ')
                    .split(/\s+/)
                    .filter(word => word.length > 2 && !stopWords.includes(word));
                  
                  words.forEach(word => {
                    wordFreq[word] = (wordFreq[word] || 0) + 1;
                  });
                }
              });
              
              // Sort by frequency and take top words
              const topWords = Object.entries(wordFreq)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 20);
              
              const maxFreq = Math.max(...topWords.map(([,freq]) => freq), 1);
              
              return topWords.map(([word, freq], index) => {
                const size = 10 + (freq / maxFreq) * 16; // Size between 10px and 26px
                
                // Determine sentiment color based on word using corporate colors
                let color = '#6EE5D9'; // Default neutral teal (corporate secondary)
                const sentiment = analyzeSentimentEnhanced(word);
                if (sentiment === 'positive') color = '#62EF83'; // Corporate success green
                else if (sentiment === 'negative') color = '#D291E2'; // Corporate primary purple
                
                return (
                  <Box
                    key={word}
                    title={`${word}: ${freq} occurrence${freq > 1 ? 's' : ''}`}
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
          
          {/* Color Legend */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#62EF83' }} />
              <Typography variant="caption" color="text.secondary">Positive</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#6EE5D9' }} />
              <Typography variant="caption" color="text.secondary">Neutral</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#D291E2' }} />
              <Typography variant="caption" color="text.secondary">Negative</Typography>
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Templates Section */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" fontWeight={600}>
            Templates
          </Typography>
          <Button 
            size="small"
            variant="text"
            sx={{ color: 'primary.main', fontWeight: 500 }}
          >
            See All
          </Button>
        </Box>
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(6, 1fr)'
          },
          gap: 2
        }}>
          {[
            { name: 'User Activity', icon: '👤', charts: '10 Charts' },
            { name: 'Marketing Analytics', icon: '📊', charts: '14 Charts' },
            { name: 'Session Engagement', icon: '📈', charts: '6 Charts' },
            { name: 'Product KPIs', icon: '📋', charts: '9 Charts' },
            { name: 'Media', icon: '🎬', charts: '12 Charts' },
            { name: 'Feature Adoption', icon: '⚡', charts: '8 Charts' },
          ].map((template, index) => (
            <Card 
              key={template.name}
              elevation={0} 
              sx={{ 
                p: 2, 
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: '0 4px 20px rgba(25, 118, 210, 0.1)',
                }
              }}
            >
              <Typography variant="h5" sx={{ mb: 1 }}>
                {template.icon}
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                {template.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Dashboard • {template.charts}
              </Typography>
            </Card>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard3; 