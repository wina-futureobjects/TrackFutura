import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Breadcrumbs,
  Link,
  TextField,
  LinearProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import axios from 'axios';

// Inline implementation of the API client to avoid path resolution issues
const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add request interceptor to include CSRF token
api.interceptors.request.use((config) => {
  // Get CSRF token from cookie if it exists
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];

  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken;
  }

  return config;
});

interface Folder {
  id: number;
  name: string;
  description: string;
  post_count?: number;
  created_at: string;
  updated_at: string;
}

interface ReportParams {
  name: string;
  description: string;
  start_date: Date;
  end_date: Date;
  existing_report_id?: string;
}

const FolderReportGeneration = () => {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [existingReport, setExistingReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportParams, setReportParams] = useState<ReportParams>({
    name: '',
    description: '',
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)), // Default to last 30 days
    end_date: new Date(),
    existing_report_id: folderId && !isNaN(parseInt(folderId)) ? folderId : undefined,
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  const isExistingReport = reportParams.existing_report_id !== undefined;

  useEffect(() => {
    if (isExistingReport) {
      fetchExistingReport();
    } else {
      fetchFolder();
    }
  }, [folderId]);

  useEffect(() => {
    // Set default report name when folder is loaded
    if (folder && !isExistingReport) {
      setReportParams(prev => ({
        ...prev,
        name: `${folder.name} Report - ${new Date().toLocaleDateString()}`,
        description: `Generated report for ${folder.name} folder`,
      }));
    } else if (existingReport) {
      setReportParams(prev => ({
        ...prev,
        name: existingReport.name,
        description: existingReport.description || '',
        start_date: new Date(existingReport.start_date),
        end_date: new Date(existingReport.end_date),
      }));
    }
  }, [folder, existingReport]);

  const fetchExistingReport = async () => {
    if (!folderId) return;
    
    try {
      setLoading(true);
      // Fetch the report details
      const response = await api.get(`/api/track-accounts/reports/${folderId}/`);
      setExistingReport(response.data);
    } catch (error) {
      console.error('Error fetching report:', error);
      handleShowSnackbar('Failed to load report details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolder = async () => {
    if (!folderId) return;
    
    try {
      setLoading(true);
      // Fetch the folder details first
      const response = await api.get(`/api/track-accounts/folders/${folderId}/`);
      setFolder(response.data);
    } catch (error) {
      console.error('Error fetching folder:', error);
      handleShowSnackbar('Failed to load folder details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (name: keyof ReportParams, value: any) => {
    setReportParams({
      ...reportParams,
      [name]: value,
    });
  };

  const handleShowSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleGenerateReport = async () => {
    if ((!folder && !isExistingReport) || (!existingReport && isExistingReport)) return;
    
    try {
      setGenerating(true);
      
      let reportId;
      
      if (isExistingReport) {
        // We're updating an existing report
        reportId = folderId;
        
        // Update the existing report
        await api.put(`/api/track-accounts/reports/${reportId}/`, {
          name: reportParams.name,
          description: reportParams.description,
          start_date: reportParams.start_date.toISOString(),
          end_date: reportParams.end_date.toISOString(),
        });
      } else {
        // Create a new report folder
        const reportResponse = await api.post('/api/track-accounts/reports/', {
          name: reportParams.name,
          description: reportParams.description,
          start_date: reportParams.start_date.toISOString(),
          end_date: reportParams.end_date.toISOString(),
          source_folders: JSON.stringify([parseInt(folderId!)]),
          total_posts: 0,
          matched_posts: 0
        });
        
        if (reportResponse.status === 201) {
          reportId = reportResponse.data.id;
        } else {
          throw new Error('Failed to create report');
        }
      }
      
      // Generate the report content
      if (reportId) {
        try {
          await api.post(`/api/track-accounts/reports/${reportId}/generate_report/`, {
            folder_ids: [parseInt(folderId!)],
            start_date: reportParams.start_date.toISOString(),
            end_date: reportParams.end_date.toISOString(),
            name: reportParams.name,
            description: reportParams.description
          });
          
          handleShowSnackbar(
            isExistingReport ? 'Instagram data added to report successfully' : 'Report generated successfully', 
            'success'
          );
          
          // Navigate to the report detail page after successful generation
          setTimeout(() => {
            navigate(`/report-folders/${reportId}`);
          }, 1000);
        } catch (genError) {
          console.error('Error generating report content:', genError);
          handleShowSnackbar(
            isExistingReport 
              ? 'Failed to add Instagram data to report' 
              : 'Created report folder but failed to generate content', 
            'warning'
          );
          
          // Still navigate to the report folder
          setTimeout(() => {
            navigate(`/report-folders/${reportId}`);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error generating report:', error);
      handleShowSnackbar('Failed to generate report', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleBackToFolders = () => {
    if (isExistingReport) {
      navigate(`/report-folders/${folderId}`);
    } else {
      navigate('/report-folders');
    }
  };

  const handleDownloadCSV = async () => {
    if (!folder || !folderId) return;
    
    try {
      setGenerating(true);
      
      // Create a simple CSV content
      const csvRows = ['Name,Report URL,Generated Date'];
      csvRows.push(`${reportParams.name},Generated on ${new Date().toLocaleDateString()}`);
      
      // Create and download CSV
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${reportParams.name.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      handleShowSnackbar('Report downloaded successfully', 'success');
    } catch (error) {
      console.error('Error downloading report:', error);
      handleShowSnackbar('Failed to download report', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {isExistingReport ? 'Add Instagram Data' : 'Generate Report'}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToFolders}
        >
          Back to Folders
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (folder || existingReport) ? (
        <>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Box>
                <Typography variant="h4" gutterBottom>
                  {isExistingReport 
                    ? `Add Instagram Data to ${existingReport.name}` 
                    : `Generate Report for ${folder!.name}`}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {isExistingReport 
                    ? existingReport.description 
                    : folder!.description}
                </Typography>
                {!isExistingReport && folder?.post_count !== undefined && (
                  <Chip 
                    label={`${folder.post_count} posts available`} 
                    color="primary" 
                    variant="outlined"
                    sx={{ mt: 1 }} 
                  />
                )}
              </Box>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={handleBackToFolders}
              >
                {isExistingReport ? 'Back to Report' : 'Back to Folders'}
              </Button>
            </Box>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Report Details
                </Typography>
                <TextField
                  fullWidth
                  label="Report Name"
                  value={reportParams.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  margin="normal"
                  variant="outlined"
                  disabled={isExistingReport}
                />
                <TextField
                  fullWidth
                  label="Description"
                  value={reportParams.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  margin="normal"
                  variant="outlined"
                  multiline
                  rows={2}
                  disabled={isExistingReport}
                />
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Date Range
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <DatePicker
                    label="Start Date"
                    value={reportParams.start_date}
                    onChange={(date: Date | null) => handleInputChange('start_date', date)}
                  />
                  <DatePicker
                    label="End Date"
                    value={reportParams.end_date}
                    onChange={(date: Date | null) => handleInputChange('end_date', date)}
                  />
                </Box>
              </Box>
            </LocalizationProvider>

            {generating && (
              <Box sx={{ width: '100%', mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  {isExistingReport ? 'Adding Instagram data...' : 'Generating report...'}
                </Typography>
                <LinearProgress />
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              {!isExistingReport && (
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadCSV}
                  disabled={generating}
                >
                  Download CSV
                </Button>
              )}
              <Button
                variant="contained"
                onClick={handleGenerateReport}
                disabled={generating || !reportParams.name}
              >
                {isExistingReport ? 'Add Instagram Data' : 'Generate Report'}
              </Button>
            </Box>
          </Paper>
        </>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            {isExistingReport ? 'Report not found.' : 'Folder not found.'}
          </Typography>
          <Button
            variant="contained"
            onClick={handleBackToFolders}
          >
            Back to Folders
          </Button>
        </Paper>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default FolderReportGeneration; 