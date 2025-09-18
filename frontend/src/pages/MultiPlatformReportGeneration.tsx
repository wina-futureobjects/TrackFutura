import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Breadcrumbs,
  Link,
  Tabs,
  Tab,
  Checkbox,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  TextField,
  InputAdornment,
  FormGroup,
  FormControlLabel,
  Chip,
  LinearProgress,
  Grid,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import axios from 'axios';

// Custom icon for TikTok since Material UI doesn't have one
const TikTokIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.321 5.562a5.122 5.122 0 0 1-3.414-1.267 5.133 5.133 0 0 1-1.348-1.75H9.953v12.137a3.373 3.373 0 0 1-6.748 0 3.373 3.373 0 0 1 3.414-3.414c.236-.01.471.018.699.084V6.86c-.25-.034-.503-.05-.756-.05a7.865 7.865 0 0 0-7.865 7.865 7.865 7.865 0 0 0 7.865 7.865 7.865 7.865 0 0 0 7.865-7.865V8.338c1.672 1.199 3.695 1.85 5.766 1.85h1.008V5.74a8.05 8.05 0 0 1-1.88-.178z" />
  </svg>
);

// Inline implementation of the API client
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

// Generic folder interface that works for all platforms
interface PlatformFolder {
  id: number;
  name: string;
  description: string | null;
  post_count?: number;
  created_at: string;
  updated_at: string;
}

// Report parameters interface
interface ReportParams {
  name: string;
  description: string;
  start_date: Date;
  end_date: Date;
  platform_folders: {
    instagram: number[];
    facebook: number[];
    linkedin: number[];
    tiktok: number[];
  };
}

// Tab panel component for platform folder selection
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`platform-tabpanel-${index}`}
      aria-labelledby={`platform-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const MultiPlatformReportGeneration = () => {
  const navigate = useNavigate();
  const { reportId } = useParams();
  const [activeTab, setActiveTab] = useState(0);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Data states
  const [instagramFolders, setInstagramFolders] = useState<PlatformFolder[]>([]);
  const [facebookFolders, setFacebookFolders] = useState<PlatformFolder[]>([]);
  const [linkedinFolders, setLinkedinFolders] = useState<PlatformFolder[]>([]);
  const [tiktokFolders, setTiktokFolders] = useState<PlatformFolder[]>([]);
  
  // Search filters
  const [instagramSearch, setInstagramSearch] = useState('');
  const [facebookSearch, setFacebookSearch] = useState('');
  const [linkedinSearch, setLinkedinSearch] = useState('');
  const [tiktokSearch, setTiktokSearch] = useState('');
  
  // Report data
  const [reportData, setReportData] = useState<any>(null);
  const [reportParams, setReportParams] = useState<ReportParams>({
    name: '',
    description: '',
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)), // Default to last 30 days
    end_date: new Date(),
    platform_folders: {
      instagram: [] as number[],
      facebook: [] as number[],
      linkedin: [] as number[],
      tiktok: [] as number[],
    },
  });
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // Initial data load
  useEffect(() => {
    if (reportId) {
      fetchReportDetails();
    }
    fetchAllPlatformFolders();
  }, [reportId]);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const fetchReportDetails = async () => {
    try {
      setReportLoading(true);
      const response = await api.get(`/api/track-accounts/reports/${reportId}/`);
      if (response.status === 200) {
        const data = response.data;
        setReportData(data);
        
        // Parse source_folders JSON if it exists
        let platformFolders: {
          instagram: number[];
          facebook: number[];
          linkedin: number[];
          tiktok: number[];
        } = {
          instagram: [],
          facebook: [],
          linkedin: [],
          tiktok: [],
        };
        
        if (data.source_folders) {
          try {
            const sourceFolders = JSON.parse(data.source_folders);
            if (typeof sourceFolders === 'object') {
              // Handle both formats - array or object
              if (Array.isArray(sourceFolders)) {
                // Legacy format - assume these are Instagram folders
                platformFolders.instagram = sourceFolders as number[];
              } else {
                // New format with platform keys
                platformFolders = {
                  instagram: sourceFolders.instagram || [],
                  facebook: sourceFolders.facebook || [],
                  linkedin: sourceFolders.linkedin || [],
                  tiktok: sourceFolders.tiktok || [],
                };
              }
            }
          } catch (e) {
            console.error('Error parsing source folders:', e);
          }
        }
        
        setReportParams(prev => ({
          ...prev,
          name: data.name,
          description: data.description || '',
          start_date: new Date(data.start_date),
          end_date: new Date(data.end_date),
          platform_folders: platformFolders,
        }));
      }
    } catch (error) {
      console.error('Error fetching report details:', error);
      showSnackbar('Failed to load report details', 'error');
    } finally {
      setReportLoading(false);
    }
  };

  // Function to fetch all platform folders
  const fetchAllPlatformFolders = () => {
    fetchInstagramFolders();
    fetchFacebookFolders();
    fetchLinkedinFolders();
    fetchTiktokFolders();
  };

  const fetchInstagramFolders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/instagram-data/folders/');
      if (response.status === 200) {
        const folderData = response.data.results || response.data;
        setInstagramFolders(folderData);
      }
    } catch (error) {
      console.error('Error fetching Instagram folders:', error);
      showSnackbar('Failed to load Instagram folders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchFacebookFolders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/facebook-data/folders/');
      if (response.status === 200) {
        const folderData = response.data.results || response.data;
        setFacebookFolders(folderData);
      }
    } catch (error) {
      console.error('Error fetching Facebook folders:', error);
      showSnackbar('Failed to load Facebook folders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkedinFolders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/linkedin-data/folders/');
      if (response.status === 200) {
        const folderData = response.data.results || response.data;
        // Ensure post_count is properly mapped for each folder
        const processedData = folderData.map((folder: any) => ({
          ...folder,
          post_count: folder.post_count || 0
        }));
        setLinkedinFolders(processedData);
      }
    } catch (error) {
      console.error('Error fetching LinkedIn folders:', error);
      showSnackbar('Failed to load LinkedIn folders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTiktokFolders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/tiktok-data/folders/');
      if (response.status === 200) {
        const folderData = response.data.results || response.data;
        // Ensure post_count is properly mapped for each folder
        const processedData = folderData.map((folder: any) => ({
          ...folder,
          post_count: folder.post_count || 0
        }));
        setTiktokFolders(processedData);
      }
    } catch (error) {
      console.error('Error fetching TikTok folders:', error);
      showSnackbar('Failed to load TikTok folders', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // General input change handler for report params
  const handleInputChange = (name: keyof Omit<ReportParams, 'platform_folders'>, value: any) => {
    setReportParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle date changes
  const handleDateChange = (field: 'start_date' | 'end_date', date: Date | null) => {
    if (date) {
      handleInputChange(field, date);
    }
  };

  // Toggle folder selection for each platform
  const toggleInstagramFolder = (folderId: number) => {
    setReportParams(prev => {
      const currentFolders = [...prev.platform_folders.instagram];
      const newFolders = currentFolders.includes(folderId)
        ? currentFolders.filter(id => id !== folderId)
        : [...currentFolders, folderId];
      
      return {
        ...prev,
        platform_folders: {
          ...prev.platform_folders,
          instagram: newFolders
        }
      };
    });
  };

  const toggleFacebookFolder = (folderId: number) => {
    setReportParams(prev => {
      const currentFolders = [...prev.platform_folders.facebook];
      const newFolders = currentFolders.includes(folderId)
        ? currentFolders.filter(id => id !== folderId)
        : [...currentFolders, folderId];
      
      return {
        ...prev,
        platform_folders: {
          ...prev.platform_folders,
          facebook: newFolders
        }
      };
    });
  };

  const toggleLinkedinFolder = (folderId: number) => {
    setReportParams(prev => {
      const currentFolders = [...prev.platform_folders.linkedin];
      const newFolders = currentFolders.includes(folderId)
        ? currentFolders.filter(id => id !== folderId)
        : [...currentFolders, folderId];
      
      return {
        ...prev,
        platform_folders: {
          ...prev.platform_folders,
          linkedin: newFolders
        }
      };
    });
  };

  const toggleTiktokFolder = (folderId: number) => {
    setReportParams(prev => {
      const currentFolders = [...prev.platform_folders.tiktok];
      const newFolders = currentFolders.includes(folderId)
        ? currentFolders.filter(id => id !== folderId)
        : [...currentFolders, folderId];
      
      return {
        ...prev,
        platform_folders: {
          ...prev.platform_folders,
          tiktok: newFolders
        }
      };
    });
  };

  // Filter folders by search term for each platform
  const filteredInstagramFolders = instagramFolders.filter(folder =>
    folder.name.toLowerCase().includes(instagramSearch.toLowerCase()) ||
    (folder.description && folder.description.toLowerCase().includes(instagramSearch.toLowerCase()))
  );

  const filteredFacebookFolders = facebookFolders.filter(folder =>
    folder.name.toLowerCase().includes(facebookSearch.toLowerCase()) ||
    (folder.description && folder.description.toLowerCase().includes(facebookSearch.toLowerCase()))
  );

  const filteredLinkedinFolders = linkedinFolders.filter(folder =>
    folder.name.toLowerCase().includes(linkedinSearch.toLowerCase()) ||
    (folder.description && folder.description.toLowerCase().includes(linkedinSearch.toLowerCase()))
  );

  const filteredTiktokFolders = tiktokFolders.filter(folder =>
    folder.name.toLowerCase().includes(tiktokSearch.toLowerCase()) ||
    (folder.description && folder.description.toLowerCase().includes(tiktokSearch.toLowerCase()))
  );

  // Navigation handlers
  const handleBackToReports = () => {
    navigate('/report-folders');
  };

  // Generate report
  const handleGenerateReport = async () => {
    // Check if any folders are selected
    const totalSelectedFolders = 
      reportParams.platform_folders.instagram.length +
      reportParams.platform_folders.facebook.length +
      reportParams.platform_folders.linkedin.length +
      reportParams.platform_folders.tiktok.length;
    
    if (totalSelectedFolders === 0) {
      showSnackbar('Please select at least one folder', 'error');
      return;
    }

    // Validate other required fields
    if (!reportParams.name) {
      showSnackbar('Please enter a report name', 'error');
      return;
    }

    // Enable debugging
    const DEBUG = true;
    const debug = (message: string, data?: any) => {
      if (DEBUG) {
        if (data) {
          console.log(`DEBUG: ${message}`, data);
        } else {
          console.log(`DEBUG: ${message}`);
        }
      }
    };

    try {
      setGenerating(true);
      
      // RADICAL APPROACH:
      // 1. Skip creating a report first
      // 2. Go directly to report generation endpoint with all params
      // 3. Let the backend handle creating the report and populating it in one step
      // 4. Only fall back to the two-step process if needed
      debug("Starting report generation with direct approach");
      debug("Report params:", reportParams);
      
      const generateData = {
        name: reportParams.name,
        description: reportParams.description,
        start_date: reportParams.start_date.toISOString(),
        end_date: reportParams.end_date.toISOString(),
        platform_folders: reportParams.platform_folders,
        create_if_needed: true, // Signal to backend that we want to create the report if it doesn't exist
      };
      
      let generationEndpoint = '/api/track-accounts/reports/generate_combined/';
      if (reportId) {
        // If we have a report ID, use it, but still try the combined endpoint first
        generationEndpoint = `/api/track-accounts/reports/${reportId}/generate_combined/`;
        debug(`Using existing report ID: ${reportId}`);
      }
      
      try {
        debug("Attempting combined report generation", generateData);
        // First try the combined endpoint that creates and generates in one step
        const combinedResponse = await api.post(generationEndpoint, generateData);
        
        debug("Combined generation response:", combinedResponse);
        
        if (combinedResponse.status === 200 || combinedResponse.status === 201) {
          // Success! Get the report ID from the response
          const generatedReportId = combinedResponse.data.id || reportId;
          debug(`Successfully created/generated report with ID: ${generatedReportId}`);
          
          showSnackbar('Report generated successfully', 'success');
          
          // Navigate to the detail page
          setTimeout(() => {
            debug(`Navigating to report: ${generatedReportId}`);
            navigate(`/report-folders/${generatedReportId}`);
          }, 2000);
          return;
        }
        
        // If we get here, the combined endpoint failed, fall back to the old approach
        debug("Combined approach failed, falling back to two-step process");
        throw new Error("Combined endpoint not available");
      } catch (combinedError) {
        debug("Error with combined approach:", combinedError);
        debug("Falling back to two-step process");
        
        // FALLBACK: Use the traditional two-step approach but with careful handling
        
        // Step 1: Determine if we need to create or update a report
        let targetReportId = reportId;
        
        if (!targetReportId) {
          // Check if a report with this name already exists to avoid duplication
          debug("Checking for existing reports with same name");
          const checkResponse = await api.get('/api/track-accounts/reports/');
          let existingReports: any[] = [];
          
          if (checkResponse.status === 200) {
            if (Array.isArray(checkResponse.data)) {
              existingReports = checkResponse.data;
            } else if (checkResponse.data.results && Array.isArray(checkResponse.data.results)) {
              existingReports = checkResponse.data.results;
            }
          }
          
          debug("Found existing reports:", existingReports);
          
          const existingReport = existingReports.find((report: any) => 
            report.name === reportParams.name && (!report.matched_posts || report.matched_posts === 0)
          );
          
          if (existingReport) {
            // Use the existing empty report
            targetReportId = existingReport.id;
            debug(`Using existing empty report ID: ${targetReportId}`);
          } else {
            // Create a new report
            debug("Creating new report");
            const createData = {
              name: reportParams.name,
              description: reportParams.description,
              start_date: reportParams.start_date.toISOString(),
              end_date: reportParams.end_date.toISOString(),
              source_folders: JSON.stringify(reportParams.platform_folders),
              total_posts: 0,
              matched_posts: 0
            };
            
            debug("Create request data:", createData);
            const createResponse = await api.post('/api/track-accounts/reports/', createData);
            debug("Create response:", createResponse);
            
            if (createResponse.status !== 201 || !createResponse.data || !createResponse.data.id) {
              throw new Error('Failed to create report');
            }
            
            targetReportId = createResponse.data.id;
            debug(`Created new report with ID: ${targetReportId}`);
          }
        } else {
          // Update the existing report
          debug(`Updating existing report: ${targetReportId}`);
          const updateData = {
            name: reportParams.name,
            description: reportParams.description,
            start_date: reportParams.start_date.toISOString(),
            end_date: reportParams.end_date.toISOString(),
            source_folders: JSON.stringify(reportParams.platform_folders)
          };
          
          debug("Update request data:", updateData);
          const updateResponse = await api.put(`/api/track-accounts/reports/${targetReportId}/`, updateData);
          debug("Update response:", updateResponse);
          
          if (updateResponse.status !== 200) {
            throw new Error('Failed to update report');
          }
        }
        
        // Step 2: Generate the report content
        debug(`Generating content for report ID: ${targetReportId}`);
        const generateContentData = {
          platform_folders: reportParams.platform_folders,
          start_date: reportParams.start_date.toISOString(),
          end_date: reportParams.end_date.toISOString(),
          name: reportParams.name,
          description: reportParams.description,
          replace_existing: true  // Tell backend to replace any existing entries
        };
        
        debug("Generate content request data:", generateContentData);
        const generateResponse = await api.post(
          `/api/track-accounts/reports/${targetReportId}/generate_report/`, 
          generateContentData
        );
        debug("Generate content response:", generateResponse);
        
        if (generateResponse.status !== 200 && generateResponse.status !== 201) {
          throw new Error('Failed to generate report content');
        }
        
        showSnackbar('Report generated successfully', 'success');
        
        // Add a delay before navigation to ensure backend processing completes
        setTimeout(() => {
          debug(`Navigating to report: ${targetReportId}`);
          navigate(`/report-folders/${targetReportId}`);
        }, 2500);
      }
    } catch (error) {
      console.error('Error in report generation process:', error);
      showSnackbar('Failed to generate report', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#f8f9fa', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header area with breadcrumbs and title */}
        <Box sx={{ mb: 2 }}>
          <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
            <Link 
              underline="hover" 
              sx={{ display: 'flex', alignItems: 'center' }} 
              color="inherit" 
              href="/"
            >
              <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
              Home
            </Link>
            <Link 
              underline="hover" 
              sx={{ display: 'flex', alignItems: 'center' }} 
              color="inherit" 
              onClick={handleBackToReports}
              style={{ cursor: 'pointer' }}
            >
              <DescriptionIcon sx={{ mr: 0.5 }} fontSize="inherit" />
              Report Folders
            </Link>
            <Typography
              sx={{ display: 'flex', alignItems: 'center' }}
              color="text.primary"
            >
              {reportId ? 'Edit Report' : 'New Multi-Platform Report'}
            </Typography>
          </Breadcrumbs>

          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1
          }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              {reportId ? 'Edit Multi-Platform Report' : 'Create Multi-Platform Report'}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBackToReports}
              size="large"
            >
              Back to Reports
            </Button>
          </Box>
        </Box>

        {/* Main content area with modernized layout */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 2,
          alignItems: 'stretch'
        }}>
          {/* Left column - Report details */}
          <Box sx={{ 
            width: { xs: '100%', lg: '350px' },
            flexShrink: 0,
            alignSelf: 'flex-start',
          }}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: 2, 
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                Report Details
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 2, 
                mt: 1,
              }}>
                <TextField
                  label="Report Name"
                  value={reportParams.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  fullWidth
                  required
                  variant="outlined"
                  size="small"
                />
                <TextField
                  label="Description"
                  value={reportParams.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  variant="outlined"
                  placeholder="Enter a description for this report"
                  size="small"
                />
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <DatePicker
                      label="Start Date"
                      value={reportParams.start_date}
                      onChange={(date) => handleDateChange('start_date', date)}
                      slotProps={{ 
                        textField: { 
                          fullWidth: true,
                          variant: "outlined",
                          size: "small"
                        } 
                      }}
                    />
                    <DatePicker
                      label="End Date"
                      value={reportParams.end_date}
                      onChange={(date) => handleDateChange('end_date', date)}
                      slotProps={{ 
                        textField: { 
                          fullWidth: true,
                          variant: "outlined",
                          size: "small"
                        } 
                      }}
                    />
                  </Box>
                </LocalizationProvider>

                {/* Summary of selected folders */}
                <Box sx={{ 
                  mt: 1,
                  p: 1.5, 
                  bgcolor: 'background.default', 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Selected Data:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <InstagramIcon sx={{ mr: 1, color: '#E1306C' }} fontSize="small" />
                        <Typography variant="body2">Instagram</Typography>
                      </Box>
                      <Chip 
                        label={reportParams.platform_folders.instagram.length} 
                        size="small" 
                        color={reportParams.platform_folders.instagram.length > 0 ? "primary" : "default"}
                      />
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <FacebookIcon sx={{ mr: 1, color: '#1877F2' }} fontSize="small" />
                        <Typography variant="body2">Facebook</Typography>
                      </Box>
                      <Chip 
                        label={reportParams.platform_folders.facebook.length} 
                        size="small" 
                        color={reportParams.platform_folders.facebook.length > 0 ? "primary" : "default"}
                      />
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LinkedInIcon sx={{ mr: 1, color: '#0A66C2' }} fontSize="small" />
                        <Typography variant="body2">LinkedIn</Typography>
                      </Box>
                      <Chip 
                        label={reportParams.platform_folders.linkedin.length} 
                        size="small" 
                        color={reportParams.platform_folders.linkedin.length > 0 ? "primary" : "default"}
                      />
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ mr: 1, display: 'flex', alignItems: 'center', color: '#000000' }}>
                          <TikTokIcon />
                        </Box>
                        <Typography variant="body2">TikTok</Typography>
                      </Box>
                      <Chip 
                        label={reportParams.platform_folders.tiktok.length} 
                        size="small" 
                        color={reportParams.platform_folders.tiktok.length > 0 ? "primary" : "default"}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Box>

          {/* Right column - Platform selection */}
          <Box sx={{ flex: 1 }}>
            <Paper 
              elevation={2} 
              sx={{ 
                borderRadius: 2, 
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
            >
              <Box sx={{ px: 3, pt: 2, pb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Select Platform Data
                </Typography>
              </Box>
              
              <Box sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                px: 2
              }}>
                <Tabs 
                  value={activeTab} 
                  onChange={handleTabChange} 
                  aria-label="platform tabs"
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    '& .MuiTab-root': {
                      minHeight: 48,
                      textTransform: 'none',
                      fontSize: '0.95rem',
                      fontWeight: 500
                    }
                  }}
                >
                  <Tab 
                    icon={<InstagramIcon sx={{ color: '#E1306C' }} />} 
                    label="Instagram" 
                    iconPosition="start" 
                    id="platform-tab-0"
                    aria-controls="platform-tabpanel-0"
                  />
                  <Tab 
                    icon={<FacebookIcon sx={{ color: '#1877F2' }} />} 
                    label="Facebook" 
                    iconPosition="start"
                    id="platform-tab-1"
                    aria-controls="platform-tabpanel-1"
                  />
                  <Tab 
                    icon={<LinkedInIcon sx={{ color: '#0A66C2' }} />} 
                    label="LinkedIn" 
                    iconPosition="start"
                    id="platform-tab-2"
                    aria-controls="platform-tabpanel-2"
                  />
                  <Tab 
                    icon={<Box sx={{ color: '#000000' }}><TikTokIcon /></Box>}
                    label="TikTok" 
                    iconPosition="start"
                    id="platform-tab-3"
                    aria-controls="platform-tabpanel-3"
                  />
                </Tabs>
              </Box>
              
              <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Instagram Tab */}
                <TabPanel value={activeTab} index={0}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                        mb: 1
                      }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          Select Instagram Folders ({reportParams.platform_folders.instagram.length} selected)
                        </Typography>
                        <TextField
                          placeholder="Search folders..."
                          value={instagramSearch}
                          onChange={(e) => setInstagramSearch(e.target.value)}
                          size="small"
                          variant="outlined"
                          sx={{ width: { xs: '100%', sm: '250px' } }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchIcon />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Box>
                      
                      {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                          <CircularProgress />
                        </Box>
                      ) : filteredInstagramFolders.length === 0 ? (
                        <Box sx={{ 
                          p: 4, 
                          textAlign: 'center',
                          bgcolor: 'background.default',
                          borderRadius: 1
                        }}>
                          <Typography>No Instagram folders found</Typography>
                        </Box>
                      ) : (
                        <Box sx={{ 
                          height: { xs: '300px', sm: '300px', lg: '350px' }, 
                          overflow: 'auto',
                          borderRadius: 1,
                          bgcolor: 'background.default',
                          border: '1px solid',
                          borderColor: 'divider'
                        }}>
                          <List dense disablePadding>
                            {filteredInstagramFolders.map((folder) => (
                              <React.Fragment key={folder.id}>
                                <ListItemButton
                                  onClick={() => toggleInstagramFolder(folder.id)}
                                  selected={reportParams.platform_folders.instagram.includes(folder.id)}
                                  sx={{ 
                                    py: 1,
                                    '&.Mui-selected': {
                                      bgcolor: 'primary.lighter',
                                      '&:hover': {
                                        bgcolor: 'primary.lighter',
                                      }
                                    }
                                  }}
                                >
                                  <ListItemIcon>
                                    <Checkbox
                                      edge="start"
                                      checked={reportParams.platform_folders.instagram.includes(folder.id)}
                                      tabIndex={-1}
                                      disableRipple
                                      color="primary"
                                    />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary={
                                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                        {folder.name}
                                      </Typography>
                                    }
                                    secondary={
                                      <>
                                        {folder.description && <Typography variant="body2" color="text.secondary">{folder.description}</Typography>}
                                        <Typography variant="body2" color="text.secondary">
                                          {folder.post_count !== undefined ? folder.post_count : 0} posts
                                        </Typography>
                                      </>
                                    }
                                  />
                                  <InstagramIcon sx={{ color: '#E1306C' }} />
                                </ListItemButton>
                                <Divider />
                              </React.Fragment>
                            ))}
                          </List>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </TabPanel>

                {/* Facebook Tab */}
                <TabPanel value={activeTab} index={1}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                        mb: 1
                      }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          Select Facebook Folders ({reportParams.platform_folders.facebook.length} selected)
                        </Typography>
                        <TextField
                          placeholder="Search folders..."
                          value={facebookSearch}
                          onChange={(e) => setFacebookSearch(e.target.value)}
                          size="small"
                          variant="outlined"
                          sx={{ width: { xs: '100%', sm: '250px' } }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchIcon />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Box>
                      
                      {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                          <CircularProgress />
                        </Box>
                      ) : filteredFacebookFolders.length === 0 ? (
                        <Box sx={{ 
                          p: 4, 
                          textAlign: 'center',
                          bgcolor: 'background.default',
                          borderRadius: 1
                        }}>
                          <Typography>No Facebook folders found</Typography>
                        </Box>
                      ) : (
                        <Box sx={{ 
                          height: { xs: '300px', sm: '300px', lg: '350px' }, 
                          overflow: 'auto',
                          borderRadius: 1,
                          bgcolor: 'background.default',
                          border: '1px solid',
                          borderColor: 'divider'
                        }}>
                          <List dense disablePadding>
                            {filteredFacebookFolders.map((folder) => (
                              <React.Fragment key={folder.id}>
                                <ListItemButton
                                  onClick={() => toggleFacebookFolder(folder.id)}
                                  selected={reportParams.platform_folders.facebook.includes(folder.id)}
                                  sx={{ 
                                    py: 1,
                                    '&.Mui-selected': {
                                      bgcolor: 'primary.lighter',
                                      '&:hover': {
                                        bgcolor: 'primary.lighter',
                                      }
                                    }
                                  }}
                                >
                                  <ListItemIcon>
                                    <Checkbox
                                      edge="start"
                                      checked={reportParams.platform_folders.facebook.includes(folder.id)}
                                      tabIndex={-1}
                                      disableRipple
                                      color="primary"
                                    />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary={
                                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                        {folder.name}
                                      </Typography>
                                    }
                                    secondary={
                                      <>
                                        {folder.description && <Typography variant="body2" color="text.secondary">{folder.description}</Typography>}
                                        <Typography variant="body2" color="text.secondary">
                                          {folder.post_count !== undefined ? folder.post_count : 0} posts
                                        </Typography>
                                      </>
                                    }
                                  />
                                  <FacebookIcon sx={{ color: '#1877F2' }} />
                                </ListItemButton>
                                <Divider />
                              </React.Fragment>
                            ))}
                          </List>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </TabPanel>

                {/* LinkedIn Tab */}
                <TabPanel value={activeTab} index={2}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                        mb: 1
                      }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          Select LinkedIn Folders ({reportParams.platform_folders.linkedin.length} selected)
                        </Typography>
                        <TextField
                          placeholder="Search folders..."
                          value={linkedinSearch}
                          onChange={(e) => setLinkedinSearch(e.target.value)}
                          size="small"
                          variant="outlined"
                          sx={{ width: { xs: '100%', sm: '250px' } }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchIcon />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Box>
                      
                      {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                          <CircularProgress />
                        </Box>
                      ) : filteredLinkedinFolders.length === 0 ? (
                        <Box sx={{ 
                          p: 4, 
                          textAlign: 'center',
                          bgcolor: 'background.default',
                          borderRadius: 1
                        }}>
                          <Typography>No LinkedIn folders found</Typography>
                        </Box>
                      ) : (
                        <Box sx={{ 
                          height: { xs: '300px', sm: '300px', lg: '350px' }, 
                          overflow: 'auto',
                          borderRadius: 1,
                          bgcolor: 'background.default',
                          border: '1px solid',
                          borderColor: 'divider'
                        }}>
                          <List dense disablePadding>
                            {filteredLinkedinFolders.map((folder) => (
                              <React.Fragment key={folder.id}>
                                <ListItemButton
                                  onClick={() => toggleLinkedinFolder(folder.id)}
                                  selected={reportParams.platform_folders.linkedin.includes(folder.id)}
                                  sx={{ 
                                    py: 1,
                                    '&.Mui-selected': {
                                      bgcolor: 'primary.lighter',
                                      '&:hover': {
                                        bgcolor: 'primary.lighter',
                                      }
                                    }
                                  }}
                                >
                                  <ListItemIcon>
                                    <Checkbox
                                      edge="start"
                                      checked={reportParams.platform_folders.linkedin.includes(folder.id)}
                                      tabIndex={-1}
                                      disableRipple
                                      color="primary"
                                    />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary={
                                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                        {folder.name}
                                      </Typography>
                                    }
                                    secondary={
                                      <>
                                        {folder.description && <Typography variant="body2" color="text.secondary">{folder.description}</Typography>}
                                        <Typography variant="body2" color="text.secondary">
                                          {folder.post_count !== undefined ? folder.post_count : 0} posts
                                        </Typography>
                                      </>
                                    }
                                  />
                                  <LinkedInIcon sx={{ color: '#0A66C2' }} />
                                </ListItemButton>
                                <Divider />
                              </React.Fragment>
                            ))}
                          </List>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </TabPanel>

                {/* TikTok Tab */}
                <TabPanel value={activeTab} index={3}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                        mb: 1
                      }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          Select TikTok Folders ({reportParams.platform_folders.tiktok.length} selected)
                        </Typography>
                        <TextField
                          placeholder="Search folders..."
                          value={tiktokSearch}
                          onChange={(e) => setTiktokSearch(e.target.value)}
                          size="small"
                          variant="outlined"
                          sx={{ width: { xs: '100%', sm: '250px' } }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchIcon />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Box>
                      
                      {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                          <CircularProgress />
                        </Box>
                      ) : filteredTiktokFolders.length === 0 ? (
                        <Box sx={{ 
                          p: 4, 
                          textAlign: 'center',
                          bgcolor: 'background.default',
                          borderRadius: 1
                        }}>
                          <Typography>No TikTok folders found</Typography>
                        </Box>
                      ) : (
                        <Box sx={{ 
                          height: { xs: '300px', sm: '300px', lg: '350px' }, 
                          overflow: 'auto',
                          borderRadius: 1,
                          bgcolor: 'background.default',
                          border: '1px solid',
                          borderColor: 'divider'
                        }}>
                          <List dense disablePadding>
                            {filteredTiktokFolders.map((folder) => (
                              <React.Fragment key={folder.id}>
                                <ListItemButton
                                  onClick={() => toggleTiktokFolder(folder.id)}
                                  selected={reportParams.platform_folders.tiktok.includes(folder.id)}
                                  sx={{ 
                                    py: 1,
                                    '&.Mui-selected': {
                                      bgcolor: 'primary.lighter',
                                      '&:hover': {
                                        bgcolor: 'primary.lighter',
                                      }
                                    }
                                  }}
                                >
                                  <ListItemIcon>
                                    <Checkbox
                                      edge="start"
                                      checked={reportParams.platform_folders.tiktok.includes(folder.id)}
                                      tabIndex={-1}
                                      disableRipple
                                      color="primary"
                                    />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary={
                                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                        {folder.name}
                                      </Typography>
                                    }
                                    secondary={
                                      <>
                                        {folder.description && <Typography variant="body2" color="text.secondary">{folder.description}</Typography>}
                                        <Typography variant="body2" color="text.secondary">
                                          {folder.post_count !== undefined ? folder.post_count : 0} posts
                                        </Typography>
                                      </>
                                    }
                                  />
                                  <Box sx={{ color: '#000000' }}>
                                    <TikTokIcon />
                                  </Box>
                                </ListItemButton>
                                <Divider />
                              </React.Fragment>
                            ))}
                          </List>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </TabPanel>
              </Box>
              
              {/* Generate Report button positioned at the bottom right */}
              <Box sx={{ 
                p: 2, 
                borderTop: '1px solid', 
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'flex-end'
              }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleGenerateReport}
                  disabled={generating}
                  sx={{ 
                    py: 1,
                    px: 3,
                    borderRadius: 2,
                    boxShadow: 2,
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '1rem'
                  }}
                >
                  {generating ? (
                    <>
                      <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                      Generating...
                    </>
                  ) : (
                    reportId ? 'Update Report' : 'Generate Report'
                  )}
                </Button>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Container>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MultiPlatformReportGeneration; 