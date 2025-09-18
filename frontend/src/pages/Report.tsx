import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Fade,
  Grow,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Badge
} from '@mui/material';
import {
  Psychology,
  TrendingUp,
  Description,
  People,
  Assessment,
  CompareArrows,
  CheckCircle,
  Schedule,
  Error as ErrorIcon,
  AutoAwesome,
  DataUsage,
  Insights,
  BarChart,
  Timeline,
  Analytics,
  Input as InputIcon,
  Refresh as RefreshIcon,
  Info,
  Star,
  StarBorder,
  AccessTime
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';

// Mock data for demo
const mockTemplates = [
  {
    id: 1,
    name: 'Sentiment Analysis',
    description: 'Analyze sentiment of comments and feedback across social media platforms',
    template_type: 'sentiment_analysis',
    icon: 'psychology',
    color: 'green',
    estimated_time: '2-5 minutes',
    required_data_types: ['comments', 'reviews'],
    features: [
      'Positive/Negative/Neutral classification',
      'Confidence scores for each sentiment',
      'Trending keywords analysis',
      'Sentiment over time tracking'
    ]
  },
  {
    id: 2,
    name: 'Engagement Metrics',
    description: 'Track engagement rates and interaction patterns across your social media posts',
    template_type: 'engagement_metrics',
    icon: 'trending_up',
    color: 'blue',
    estimated_time: '1-3 minutes',
    required_data_types: ['posts', 'likes', 'comments', 'shares'],
    features: [
      'Engagement rate calculation',
      'Top performing posts identification',
      'Audience interaction patterns',
      'Peak engagement times'
    ]
  },
  {
    id: 3,
    name: 'Content Analysis',
    description: 'Deep dive into content performance and optimization opportunities',
    template_type: 'content_analysis',
    icon: 'description',
    color: 'purple',
    estimated_time: '3-7 minutes',
    required_data_types: ['posts', 'images', 'videos'],
    features: [
      'Content type breakdown',
      'Hashtag effectiveness analysis',
      'Visual content impact assessment',
      'Content scheduling optimization'
    ]
  },
  {
    id: 4,
    name: 'User Behavior Analysis',
    description: 'Understand your audience behavior and interaction preferences',
    template_type: 'user_behavior',
    icon: 'people',
    color: 'orange',
    estimated_time: '4-8 minutes',
    required_data_types: ['users', 'interactions', 'demographics'],
    features: [
      'User engagement patterns',
      'Demographic breakdowns',
      'Peak activity times',
      'User journey mapping'
    ]
  },
  {
    id: 5,
    name: 'Trend Analysis',
    description: 'Identify emerging trends and opportunities in your industry',
    template_type: 'trend_analysis',
    icon: 'assessment',
    color: 'teal',
    estimated_time: '5-10 minutes',
    required_data_types: ['hashtags', 'keywords', 'mentions'],
    features: [
      'Trending topics identification',
      'Hashtag performance tracking',
      'Seasonal trend analysis',
      'Competitor trend comparison'
    ]
  },
  {
    id: 6,
    name: 'Competitive Analysis',
    description: 'Compare your performance against competitors and industry benchmarks',
    template_type: 'competitive_analysis',
    icon: 'compare_arrows',
    color: 'red',
    estimated_time: '6-12 minutes',
    required_data_types: ['competitor_data', 'benchmarks'],
    features: [
      'Competitor performance comparison',
      'Market share analysis',
      'Growth opportunity identification',
      'Benchmark reporting'
    ]
  }
];

const mockReports = [
  {
    id: 1,
    title: 'Sentiment Analysis - Dec 2024',
    template_name: 'Sentiment Analysis',
    status: 'completed',
    created_at: '2024-12-15T10:30:00Z',
    completed_at: '2024-12-15T10:33:00Z'
  },
  {
    id: 2,
    title: 'Engagement Metrics - Q4 2024',
    template_name: 'Engagement Metrics',
    status: 'processing',
    created_at: '2024-12-15T09:15:00Z',
    completed_at: null
  },
  {
    id: 3,
    title: 'Content Analysis - November',
    template_name: 'Content Analysis',
    status: 'completed',
    created_at: '2024-12-14T14:20:00Z',
    completed_at: '2024-12-14T14:26:00Z'
  }
];

interface ReportTemplate {
  id: number;
  name: string;
  description: string;
  template_type: string;
  icon: string;
  color: string;
  estimated_time: string;
  required_data_types: string[];
  features: string[];
}

interface GeneratedReport {
  id: number;
  title: string;
  template_name: string;
  status: string;
  created_at: string;
  completed_at?: string | null;
}

const Report: React.FC = () => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [generateDialog, setGenerateDialog] = useState({ open: false, template: null as ReportTemplate | null });
  const [reportTitle, setReportTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectedDataSources, setSelectedDataSources] = useState<any[]>([]);
  const navigate = useNavigate();
  const { organizationId, projectId } = useParams();

  // Mock API functions for demo
  const fetchTemplates = useCallback(async () => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      showSnackbar('Failed to load report templates', 'error');
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      setReports(mockReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      showSnackbar('Failed to load recent reports', 'error');
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTemplates(), fetchReports()]);
      setLoading(false);
    };
    loadData();
  }, [fetchTemplates, fetchReports]);

  // Load selected data sources from session storage
  useEffect(() => {
    const savedSources = sessionStorage.getItem('selectedDataSources');
    if (savedSources) {
      try {
        const parsedSources = JSON.parse(savedSources);
        setSelectedDataSources(parsedSources);
      } catch (error) {
        console.error('Error parsing selected data sources:', error);
      }
    }
  }, []);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleGoToInputSelection = () => {
    const basePath = organizationId && projectId 
      ? `/organizations/${organizationId}/projects/${projectId}` 
      : '';
    navigate(`${basePath}/input-selection`);
  };

  const getTemplateIcon = (iconName: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      psychology: <Psychology />,
      trending_up: <TrendingUp />,
      description: <Description />,
      people: <People />,
      assessment: <Assessment />,
      compare_arrows: <CompareArrows />
    };
    return iconMap[iconName] || <AutoAwesome />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle />;
      case 'processing':
        return <Schedule />;
      case 'failed':
        return <ErrorIcon />;
      default:
        return <Schedule />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleGenerateReport = (template: ReportTemplate) => {
    setGenerateDialog({ open: true, template });
    setReportTitle(`${template.name} - ${new Date().toLocaleDateString()}`);
  };

  const handleConfirmGenerate = async () => {
    if (!generateDialog.template) return;

    setGenerating(true);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a new report entry
      const newReport = {
        id: Date.now(), // Use timestamp as unique ID for demo
        title: reportTitle,
        template_name: generateDialog.template.name,
        status: 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        processing_time: 180,
        description: `Generated ${generateDialog.template.name.toLowerCase()} report with latest data`
      };
      
      // Save to localStorage for Generated Reports page
      const existingReports = localStorage.getItem('generated_reports');
      const allReports = existingReports ? JSON.parse(existingReports) : [];
      allReports.unshift(newReport); // Add to beginning
      localStorage.setItem('generated_reports', JSON.stringify(allReports));
      
      setReports(prev => [newReport, ...prev]);
      setGenerateDialog({ open: false, template: null });
      showSnackbar(`Report "${reportTitle}" generated successfully!`, 'success');
      
      // Navigate to the generated report with proper context
      if (organizationId && projectId) {
        navigate(`/organizations/${organizationId}/projects/${projectId}/report/generated/${newReport.id}`);
      } else {
        navigate(`/report/generated/${newReport.id}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      showSnackbar('Failed to generate report', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleViewReport = (reportId: number) => {
    if (organizationId && projectId) {
      navigate(`/organizations/${organizationId}/projects/${projectId}/report/generated/${reportId}`);
    } else {
      navigate(`/report/generated/${reportId}`);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>        
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          Report Marketplace
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Select from our pre-built analytics templates to generate insights from your social media data
        </Typography>
      </Box>

      {/* Selected Data Sources Section */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InputIcon />
            Selected Data Sources
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh data sources">
              <IconButton size="small" onClick={() => window.location.reload()}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              size="small"
              onClick={handleGoToInputSelection}
              startIcon={<InputIcon />}
            >
              Change Selection
            </Button>
          </Box>
        </Box>
        
        {selectedDataSources.length > 0 ? (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Reports will be generated using data from the following {selectedDataSources.length} source{selectedDataSources.length > 1 ? 's' : ''}:
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {selectedDataSources.map((source, index) => (
                <Chip
                  key={index}
                  label={`${source.platform}: ${source.name}`}
                  variant="outlined"
                  color="primary"
                  size="small"
                  sx={{ textTransform: 'capitalize' }}
                />
              ))}
            </Box>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No data sources selected
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select your data sources to generate reports with relevant social media data.
            </Typography>
            <Button
              variant="contained"
              onClick={handleGoToInputSelection}
              startIcon={<InputIcon />}
            >
              Select Data Sources
            </Button>
          </Box>
        )}
      </Paper>

      {/* Template Marketplace */}
      <Box mb={6}>
        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
          Available Templates
        </Typography>
        
        <Grid container spacing={3}>
          {templates.map((template, index) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={template.id}>
              <Grow in={true} timeout={300 + index * 100}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Avatar 
                        sx={{ 
                          bgcolor: `${template.color}.main`, 
                          mr: 2,
                          width: 48,
                          height: 48
                        }}
                      >
                        {getTemplateIcon(template.icon)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {template.name}
                        </Typography>
                        <Chip 
                          label={template.estimated_time} 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                        />
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      {template.description}
                    </Typography>
                    
                    <Box mb={2}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Key Features:
                      </Typography>
                      {template.features.slice(0, 3).map((feature, idx) => (
                        <Typography key={idx} variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                          • {feature}
                        </Typography>
                      ))}
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Required Data:
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {template.required_data_types.map((type) => (
                          <Chip 
                            key={type} 
                            label={type} 
                            size="small" 
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  </CardContent>
                  
                  <CardActions sx={{ p: 2 }}>
                    <Button 
                      variant="contained" 
                      fullWidth
                      onClick={() => handleGenerateReport(template)}
                      startIcon={<Insights />}
                    >
                      Generate Report
                    </Button>
                  </CardActions>
                </Card>
              </Grow>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Generate Report Dialog */}
      <Dialog 
        open={generateDialog.open} 
        onClose={() => setGenerateDialog({ open: false, template: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate New Report</DialogTitle>
        <DialogContent>
          {generateDialog.template && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {generateDialog.template.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {generateDialog.template.description}
              </Typography>
              
              <TextField
                autoFocus
                margin="dense"
                label="Report Title"
                fullWidth
                variant="outlined"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                sx={{ mt: 2 }}
              />
              
              <Box mt={2}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  This report will include:
                </Typography>
                {generateDialog.template.features.map((feature, idx) => (
                  <Typography key={idx} variant="body2" color="text.secondary">
                    • {feature}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialog({ open: false, template: null })}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmGenerate} 
            variant="contained"
            disabled={generating || !reportTitle.trim()}
          >
            {generating ? <CircularProgress size={20} /> : 'Generate Report'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Report; 