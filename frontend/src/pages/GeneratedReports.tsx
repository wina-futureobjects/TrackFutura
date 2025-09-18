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
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fade,
  Paper
} from '@mui/material';
import {
  CheckCircle,
  Schedule,
  Error as ErrorIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Input as InputIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';

// Mock data for generated reports - this would come from localStorage or API in a real app
const mockGeneratedReports = [
  {
    id: 1,
    title: 'Sentiment Analysis - Dec 2024',
    template_name: 'Sentiment Analysis',
    status: 'completed',
    created_at: '2024-12-15T10:30:00Z',
    completed_at: '2024-12-15T10:33:00Z',
    processing_time: 180,
    description: 'Analysis of customer feedback and social media sentiment'
  },
  {
    id: 2,
    title: 'Engagement Metrics - Q4 2024',
    template_name: 'Engagement Metrics',
    status: 'processing',
    created_at: '2024-12-15T09:15:00Z',
    completed_at: null,
    processing_time: null,
    description: 'Quarterly engagement analysis across all platforms'
  },
  {
    id: 3,
    title: 'Content Analysis - November',
    template_name: 'Content Analysis',
    status: 'completed',
    created_at: '2024-12-14T14:20:00Z',
    completed_at: '2024-12-14T14:26:00Z',
    processing_time: 360,
    description: 'Deep dive into content performance and optimization'
  },
  {
    id: 4,
    title: 'User Behavior Analysis - Holiday Season',
    template_name: 'User Behavior Analysis',
    status: 'completed',
    created_at: '2024-12-13T16:45:00Z',
    completed_at: '2024-12-13T16:53:00Z',
    processing_time: 480,
    description: 'Holiday shopping behavior patterns analysis'
  },
  {
    id: 5,
    title: 'Competitive Analysis - Industry Benchmark',
    template_name: 'Competitive Analysis',
    status: 'failed',
    created_at: '2024-12-12T11:20:00Z',
    completed_at: null,
    processing_time: null,
    description: 'Comparison with industry competitors'
  }
];

interface GeneratedReport {
  id: number;
  title: string;
  template_name: string;
  status: string;
  created_at: string;
  completed_at?: string | null;
  processing_time?: number | null;
  description: string;
}

const GeneratedReports: React.FC = () => {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const navigate = useNavigate();
  const { organizationId, projectId } = useParams();

  // Load reports from localStorage or use mock data
  const loadReports = useCallback(async () => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real app, this would load from an API or localStorage
      const storedReports = localStorage.getItem('generated_reports');
      if (storedReports) {
        const parsedReports = JSON.parse(storedReports);
        // Merge with mock data, preferring stored reports
        const allReports = [...parsedReports, ...mockGeneratedReports.filter(
          mock => !parsedReports.some((stored: GeneratedReport) => stored.id === mock.id)
        )];
        setReports(allReports);
      } else {
        setReports(mockGeneratedReports);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      setReports(mockGeneratedReports);
      showSnackbar('Failed to load some reports', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
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

  const handleViewReport = (reportId: number) => {
    if (organizationId && projectId) {
      navigate(`/organizations/${organizationId}/projects/${projectId}/report/generated/${reportId}`);
    } else {
      navigate(`/report/generated/${reportId}`);
    }
  };

  const handleDeleteReport = async (reportId: number) => {
    try {
      const updatedReports = reports.filter(report => report.id !== reportId);
      setReports(updatedReports);
      
      // Update localStorage
      localStorage.setItem('generated_reports', JSON.stringify(updatedReports));
      
      showSnackbar('Report deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting report:', error);
      showSnackbar('Failed to delete report', 'error');
    }
  };

  // Filter reports based on search and filters
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesTemplate = templateFilter === 'all' || report.template_name === templateFilter;
    
    return matchesSearch && matchesStatus && matchesTemplate;
  });

  // Get unique template names for filter
  const uniqueTemplates = Array.from(new Set(reports.map(report => report.template_name)));

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
          Generated Reports
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage all your previously generated analytics reports
        </Typography>
      </Box>

      {/* Filters and Search */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="processing">Processing</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Template</InputLabel>
              <Select
                value={templateFilter}
                label="Template"
                onChange={(e) => setTemplateFilter(e.target.value)}
              >
                <MenuItem value="all">All Templates</MenuItem>
                {uniqueTemplates.map(template => (
                  <MenuItem key={template} value={template}>{template}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm || statusFilter !== 'all' || templateFilter !== 'all' 
              ? 'No reports match your filters' 
              : 'No reports generated yet'
            }
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchTerm || statusFilter !== 'all' || templateFilter !== 'all'
              ? 'Try adjusting your search criteria or filters'
              : 'Go to the Report Marketplace to generate your first report'
            }
          </Typography>
          {!searchTerm && statusFilter === 'all' && templateFilter === 'all' && (
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button 
                variant="outlined"
                onClick={() => {
                  if (organizationId && projectId) {
                    navigate(`/organizations/${organizationId}/projects/${projectId}/input-selection`);
                  } else {
                    navigate('/input-selection');
                  }
                }}
                startIcon={<InputIcon />}
              >
                Select Data Sources
              </Button>
              <Button 
                variant="contained" 
                onClick={() => {
                  if (organizationId && projectId) {
                    navigate(`/organizations/${organizationId}/projects/${projectId}/report`);
                  } else {
                    navigate('/report');
                  }
                }}
              >
                Go to Marketplace
              </Button>
            </Box>
          )}
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredReports.map((report, index) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={report.id}>
              <Fade in={true} timeout={300 + index * 100}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1, mr: 1 }}>
                        {report.title}
                      </Typography>
                      <Chip
                        label={report.status}
                        color={getStatusColor(report.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                        size="small"
                        icon={getStatusIcon(report.status)}
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Template:</strong> {report.template_name}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {report.description}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Created:</strong> {new Date(report.created_at).toLocaleDateString()} at {new Date(report.created_at).toLocaleTimeString()}
                    </Typography>
                    
                    {report.completed_at && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Completed:</strong> {new Date(report.completed_at).toLocaleDateString()} at {new Date(report.completed_at).toLocaleTimeString()}
                      </Typography>
                    )}
                    
                    {report.processing_time && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Processing Time:</strong> {Math.floor(report.processing_time / 60)}m {report.processing_time % 60}s
                      </Typography>
                    )}
                  </CardContent>
                  
                  <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                    <Button 
                      size="small" 
                      variant="contained"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewReport(report.id)}
                      disabled={report.status !== 'completed'}
                    >
                      View
                    </Button>
                    <Button 
                      size="small" 
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteReport(report.id)}
                    >
                      Delete
                    </Button>
                  </CardActions>
                </Card>
              </Fade>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Summary */}
      <Box mt={4}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Showing {filteredReports.length} of {reports.length} reports
        </Typography>
      </Box>

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

export default GeneratedReports; 