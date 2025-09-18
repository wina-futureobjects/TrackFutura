import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress
} from '@mui/material';
import {
  Download,
  TrendingUp,
  Psychology,
  Lightbulb,
  CheckCircle,
  Warning,
  ArrowBack,
  Insights,
  DataUsage
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
} from 'chart.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

// Mock data for demo
const mockReportData = {
  1: {
    id: 1,
    title: 'Sentiment Analysis - Dec 2024',
    template: {
      name: 'Sentiment Analysis',
      template_type: 'sentiment_analysis'
    },
    status: 'completed',
    created_at: '2024-12-15T10:30:00Z',
    completed_at: '2024-12-15T10:33:00Z',
    processing_time: 180, // 3 minutes
    results: {
      summary: {
        total_comments_analyzed: 2847,
        overall_sentiment: 'Positive',
        confidence_average: 85.2,
        sentiment_distribution: {
          positive: 1653,
          negative: 426,
          neutral: 768
        }
      },
      sentiment_data: {
        labels: ['Positive', 'Negative', 'Neutral'],
        datasets: [{
          data: [58.1, 15.0, 26.9],
          backgroundColor: ['#4CAF50', '#F44336', '#9E9E9E'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      trending_keywords: [
        { keyword: 'amazing', sentiment: 'positive', count: 234 },
        { keyword: 'love', sentiment: 'positive', count: 189 },
        { keyword: 'great', sentiment: 'positive', count: 156 },
        { keyword: 'disappointed', sentiment: 'negative', count: 87 },
        { keyword: 'issues', sentiment: 'negative', count: 65 },
        { keyword: 'okay', sentiment: 'neutral', count: 123 },
        { keyword: 'fine', sentiment: 'neutral', count: 98 }
      ],
      insights: [
        'Overall sentiment is overwhelmingly positive with 58.1% of comments expressing satisfaction',
        'Negative sentiment spikes around product delivery and customer service topics',
        'Neutral comments often relate to inquiries and general information requests',
        'Peak positive sentiment occurs during product launch announcements'
      ],
      recommendations: [
        'Focus on addressing delivery-related concerns to reduce negative sentiment',
        'Amplify successful product features mentioned in positive comments',
        'Create FAQ content to convert neutral inquiries into positive interactions',
        'Monitor sentiment during future product launches for optimization opportunities'
      ],
      detailed_analysis: [
        {
          comment: "Absolutely love the new features! This is exactly what I was looking for.",
          sentiment: 'Positive',
          confidence: 94.2,
          timestamp: '2024-12-14T15:30:00Z'
        },
        {
          comment: "The quality has really improved. Great job team!",
          sentiment: 'Positive',
          confidence: 91.7,
          timestamp: '2024-12-14T14:45:00Z'
        },
        {
          comment: "Had some issues with the delivery but customer service resolved it quickly.",
          sentiment: 'Neutral',
          confidence: 78.3,
          timestamp: '2024-12-14T13:20:00Z'
        },
        {
          comment: "Not what I expected. The product description was misleading.",
          sentiment: 'Negative',
          confidence: 87.9,
          timestamp: '2024-12-14T12:10:00Z'
        },
        {
          comment: "Works as advertised. No complaints here.",
          sentiment: 'Positive',
          confidence: 82.1,
          timestamp: '2024-12-14T11:55:00Z'
        }
      ]
    }
  },
  2: {
    id: 2,
    title: 'Engagement Metrics - Q4 2024',
    template: {
      name: 'Engagement Metrics',
      template_type: 'engagement_metrics'
    },
    status: 'processing',
    created_at: '2024-12-15T09:15:00Z',
    completed_at: null,
    results: null
  },
  3: {
    id: 3,
    title: 'Content Analysis - November',
    template: {
      name: 'Content Analysis',
      template_type: 'content_analysis'
    },
    status: 'completed',
    created_at: '2024-12-14T14:20:00Z',
    completed_at: '2024-12-14T14:26:00Z',
    results: {
      summary: {
        total_posts_analyzed: 156,
        top_performing_content: 'Video Content',
        average_engagement_rate: 7.8
      }
    }
  }
};

interface ReportResults {
  summary: {
    total_comments_analyzed?: number;
    total_posts_analyzed?: number;
    overall_sentiment?: string;
    confidence_average?: number;
    top_performing_content?: string;
    average_engagement_rate?: number;
    sentiment_distribution?: {
      positive: number;
      negative: number;
      neutral: number;
    };
  };
  sentiment_data?: {
    labels: string[];
    datasets: Array<{
      data: number[];
      backgroundColor: string[];
      borderWidth: number;
      borderColor: string;
    }>;
  };
  trending_keywords?: Array<{
    keyword: string;
    sentiment: string;
    count: number;
  }>;
  insights?: string[];
  recommendations?: string[];
  detailed_analysis?: Array<{
    comment: string;
    sentiment: string;
    confidence: number;
    timestamp: string;
  }>;
  [key: string]: unknown;
}

interface Report {
  id: number;
  title: string;
  template: {
    name: string;
    template_type: string;
  };
  status: string;
  created_at: string;
  completed_at?: string | null;
  processing_time?: number;
  results?: ReportResults | null;
}

const ReportView: React.FC = () => {
  const { id, organizationId, projectId } = useParams<{ id: string; organizationId?: string; projectId?: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const navigate = useNavigate();
  const reportContentRef = useRef<HTMLDivElement>(null);

  const fetchReport = useCallback(async (reportId: string) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      let reportData = mockReportData[reportId as '1' | '2' | '3'];
      
      // If report doesn't exist in mock data, create a default one for demo
      if (!reportData) {
        const reportIdNum = parseInt(reportId);
        reportData = {
          id: reportIdNum,
          title: `Generated Report ${reportIdNum}`,
          template: {
            name: 'Sentiment Analysis',
            template_type: 'sentiment_analysis'
          },
          status: 'completed',
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          processing_time: 180,
          results: {
            summary: {
              total_comments_analyzed: 2847,
              overall_sentiment: 'Positive',
              confidence_average: 85.2,
              sentiment_distribution: {
                positive: 1653,
                negative: 426,
                neutral: 768
              }
            },
            sentiment_data: {
              labels: ['Positive', 'Negative', 'Neutral'],
              datasets: [{
                data: [58.1, 15.0, 26.9],
                backgroundColor: ['#4CAF50', '#F44336', '#9E9E9E'],
                borderWidth: 2,
                borderColor: '#fff'
              }]
            },
            trending_keywords: [
              { keyword: 'amazing', sentiment: 'positive', count: 234 },
              { keyword: 'love', sentiment: 'positive', count: 189 },
              { keyword: 'great', sentiment: 'positive', count: 156 },
              { keyword: 'disappointed', sentiment: 'negative', count: 87 },
              { keyword: 'issues', sentiment: 'negative', count: 65 },
              { keyword: 'okay', sentiment: 'neutral', count: 123 },
              { keyword: 'fine', sentiment: 'neutral', count: 98 }
            ],
            insights: [
              'Overall sentiment is overwhelmingly positive with 58.1% of comments expressing satisfaction',
              'Negative sentiment spikes around product delivery and customer service topics',
              'Neutral comments often relate to inquiries and general information requests',
              'Peak positive sentiment occurs during product launch announcements'
            ],
            recommendations: [
              'Focus on addressing delivery-related concerns to reduce negative sentiment',
              'Amplify successful product features mentioned in positive comments',
              'Create FAQ content to convert neutral inquiries into positive interactions',
              'Monitor sentiment during future product launches for optimization opportunities'
            ],
            detailed_analysis: [
              {
                comment: "Absolutely love the new features! This is exactly what I was looking for.",
                sentiment: 'Positive',
                confidence: 94.2,
                timestamp: '2024-12-14T15:30:00Z'
              },
              {
                comment: "The quality has really improved. Great job team!",
                sentiment: 'Positive',
                confidence: 91.7,
                timestamp: '2024-12-14T14:45:00Z'
              },
              {
                comment: "Had some issues with the delivery but customer service resolved it quickly.",
                sentiment: 'Neutral',
                confidence: 78.3,
                timestamp: '2024-12-14T13:20:00Z'
              },
              {
                comment: "Not what I expected. The product description was misleading.",
                sentiment: 'Negative',
                confidence: 87.9,
                timestamp: '2024-12-14T12:10:00Z'
              },
              {
                comment: "Works as advertised. No complaints here.",
                sentiment: 'Positive',
                confidence: 82.1,
                timestamp: '2024-12-14T11:55:00Z'
              }
            ]
          }
        };
      }
      
      setReport(reportData);
    } catch (error) {
      console.error('Error fetching report:', error);
      showSnackbar('Failed to load report', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchReport(id);
    }
  }, [id, fetchReport]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleDownloadPDF = async () => {
    try {
      setSnackbar({ open: true, message: 'Generating PDF...', severity: 'success' });
      
      // Create new PDF document
      const pdf = new jsPDF();
      
      // Get page dimensions
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Helper function to check if we need a new page
      const addNewPageIfNeeded = (height: number) => {
        if (yPosition + height > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Social Media Analytics Report', margin, yPosition);
      yPosition += 15;

      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      pdf.text(report?.title || 'Generated Report', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.text(`Generated: ${new Date(report?.created_at || '').toLocaleDateString()}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Template: ${report?.template.name || 'N/A'}`, margin, yPosition);
      yPosition += 15;

      // Summary Section
      addNewPageIfNeeded(50);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Summary', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      const { summary } = report?.results || {};
      if (summary) {
        if (summary.total_comments_analyzed) {
          pdf.text(`Total Comments Analyzed: ${summary.total_comments_analyzed.toLocaleString()}`, margin, yPosition);
          yPosition += 6;
        }
        if (summary.total_posts_analyzed) {
          pdf.text(`Total Posts Analyzed: ${summary.total_posts_analyzed.toLocaleString()}`, margin, yPosition);
          yPosition += 6;
        }
        if (summary.overall_sentiment) {
          pdf.text(`Overall Sentiment: ${summary.overall_sentiment}`, margin, yPosition);
          yPosition += 6;
        }
        if (summary.confidence_average) {
          pdf.text(`Confidence Average: ${summary.confidence_average}%`, margin, yPosition);
          yPosition += 6;
        }
        if (summary.average_engagement_rate) {
          pdf.text(`Average Engagement Rate: ${summary.average_engagement_rate}%`, margin, yPosition);
          yPosition += 6;
        }
      }
      yPosition += 15;

      // Trending Keywords
      const trendingKeywords = report?.results?.trending_keywords;
      if (trendingKeywords && trendingKeywords.length > 0) {
        addNewPageIfNeeded(60);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Trending Keywords', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        
        trendingKeywords.slice(0, 10).forEach((keyword, index) => {
          addNewPageIfNeeded(8);
          pdf.text(`${index + 1}. ${keyword.keyword} - ${keyword.count} mentions (${keyword.sentiment})`, margin, yPosition);
          yPosition += 6;
        });
        yPosition += 15;
      }

      // Key Insights
      const insights = report?.results?.insights;
      if (insights && insights.length > 0) {
        addNewPageIfNeeded(40);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Key Insights', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        insights.forEach((insight, index) => {
          addNewPageIfNeeded(20);
          // Split long text into multiple lines
          const maxWidth = pageWidth - 2 * margin;
          const lines = pdf.splitTextToSize(`${index + 1}. ${insight}`, maxWidth);
          pdf.text(lines, margin, yPosition);
          yPosition += lines.length * 6;
        });
        yPosition += 15;
      }

      // Recommendations
      const recommendations = report?.results?.recommendations;
      if (recommendations && recommendations.length > 0) {
        addNewPageIfNeeded(40);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Recommendations', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        recommendations.forEach((recommendation, index) => {
          addNewPageIfNeeded(20);
          // Split long text into multiple lines
          const maxWidth = pageWidth - 2 * margin;
          const lines = pdf.splitTextToSize(`${index + 1}. ${recommendation}`, maxWidth);
          pdf.text(lines, margin, yPosition);
          yPosition += lines.length * 6;
        });
      }

      // Save the PDF
      const filename = `${report?.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.pdf`;
      pdf.save(filename);
      
      setSnackbar({ open: false, message: '', severity: 'success' });
      showSnackbar('PDF report downloaded successfully!', 'success');
      
    } catch (error) {
      console.error('PDF Generation Error:', error);
      setSnackbar({ open: false, message: '', severity: 'success' });
      showSnackbar(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
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

  if (!report) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Report not found</Alert>
      </Container>
    );
  }

  if (report.status === 'processing') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Processing Report
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {report.title} is currently being processed. Please check back in a few minutes.
          </Typography>
          <Box mt={2}>
            <LinearProgress />
          </Box>
        </Card>
      </Container>
    );
  }

  const { results } = report;
  if (!results) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">No results available for this report</Alert>
      </Container>
    );
  }

  const { summary } = results;

  // Chart configuration
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: { label: string; parsed: number }) => {
            return `${context.label}: ${context.parsed}%`;
          }
        }
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} ref={reportContentRef}>
      {/* Header */}
      <Box mb={4}>        
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              {report.title}
            </Typography>
            <Box display="flex" gap={2} alignItems="center" mb={2}>
              <Chip label={report.template.name} color="primary" />
              <Chip 
                label="Completed" 
                color="success" 
                icon={<CheckCircle />}
              />
              {report.processing_time && (
                <Typography variant="body2" color="text.secondary">
                  Processed in {Math.floor(report.processing_time / 60)}m {report.processing_time % 60}s
                </Typography>
              )}
            </Box>
          </Box>
          
          <Box display="flex" gap={1}>
            <Button 
              variant="outlined" 
              startIcon={<ArrowBack />}
              onClick={() => {
                if (organizationId && projectId) {
                  navigate(`/organizations/${organizationId}/projects/${projectId}/report`);
                } else {
                  navigate('/report');
                }
              }}
            >
              Back to Marketplace
            </Button>
            <Button 
              variant="contained" 
              startIcon={<Download />}
              onClick={handleDownloadPDF}
            >
              Download PDF
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <DataUsage />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {summary.total_comments_analyzed || summary.total_posts_analyzed || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {summary.total_comments_analyzed ? 'Comments Analyzed' : 'Posts Analyzed'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <Psychology />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {summary.overall_sentiment || summary.top_performing_content || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {summary.overall_sentiment ? 'Overall Sentiment' : 'Top Content Type'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <TrendingUp />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {summary.confidence_average ? `${summary.confidence_average}%` : 
                     summary.average_engagement_rate ? `${summary.average_engagement_rate}%` : 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {summary.confidence_average ? 'Confidence Average' : 'Avg Engagement Rate'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <Insights />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {results.insights?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Key Insights
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Sentiment Distribution Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Sentiment Distribution
              </Typography>
              {results.sentiment_data ? (
                <Box display="flex" justifyContent="center" mt={2}>
                  <Box width={300} height={300}>
                    <Doughnut data={results.sentiment_data} options={chartOptions} />
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No sentiment data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Trending Keywords */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Trending Keywords
              </Typography>
              <List>
                {results.trending_keywords?.map((keyword, index) => (
                  <ListItem key={index} divider>
                    <ListItemIcon>
                      {keyword.sentiment === 'positive' && <CheckCircle color="success" />}
                      {keyword.sentiment === 'negative' && <Warning color="error" />}
                      {keyword.sentiment === 'neutral' && <TrendingUp color="action" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={keyword.keyword}
                      secondary={`${keyword.count} mentions`}
                    />
                    <Chip 
                      label={keyword.sentiment} 
                      size="small"
                      color={
                        keyword.sentiment === 'positive' ? 'success' :
                        keyword.sentiment === 'negative' ? 'error' : 'default'
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Key Insights */}
        {results.insights && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  <Lightbulb sx={{ mr: 1 }} />
                  Key Insights
                </Typography>
                <List>
                  {results.insights.map((insight, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={insight} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Recommendations */}
        {results.recommendations && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  <TrendingUp sx={{ mr: 1 }} />
                  Recommendations
                </Typography>
                <List>
                  {results.recommendations.map((recommendation, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={recommendation} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Detailed Analysis Table */}
        {results.detailed_analysis && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Detailed Analysis
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Comment</TableCell>
                        <TableCell>Sentiment</TableCell>
                        <TableCell>Confidence</TableCell>
                        <TableCell>Timestamp</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {results.detailed_analysis.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell sx={{ maxWidth: 400 }}>
                            {item.comment}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={item.sentiment} 
                              size="small"
                              color={
                                item.sentiment === 'Positive' ? 'success' :
                                item.sentiment === 'Negative' ? 'error' : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <Typography variant="body2" sx={{ mr: 1 }}>
                                {item.confidence.toFixed(1)}%
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={item.confidence} 
                                sx={{ width: 60, height: 6 }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            {new Date(item.timestamp).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

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

export default ReportView; 