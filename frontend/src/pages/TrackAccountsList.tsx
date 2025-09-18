import { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  InputAdornment,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
  Card,
  CardContent,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  LinkedIn as LinkedInIcon,
  MusicNote as TikTokIcon,
  Clear as ClearIcon,
  Folder as FolderIcon,
  TrendingUp as TrendingUpIcon,
  Download as DownloadIcon,
  SmartToy as SmartToyIcon,
} from '@mui/icons-material';
import { apiFetch } from '../utils/api';

interface TrackSource {
  id: number;
  name: string;
  platform: string | null;
  facebook_link: string | null;
  instagram_link: string | null;
  linkedin_link: string | null;
  tiktok_link: string | null;
  other_social_media: string | null;
  service_name: string | null;
  url_count: number;
  created_at: string;
  updated_at: string;
}

interface FilterStats {
  total: number;
  socialMediaCounts: {
    facebook: number;
    instagram: number;
    linkedin: number;
    tiktok: number;
  };
}

const TrackSourcesList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  
  // Extract project ID from URL path or query parameters
  const getProjectId = () => {
    // First try to extract from URL path: /organizations/{orgId}/projects/{projectId}/...
    const pathMatch = location.pathname.match(/\/organizations\/\d+\/projects\/(\d+)/);
    if (pathMatch) {
      return pathMatch[1];
    }
    
    // Fallback to query parameter: ?project=13
    const queryParams = new URLSearchParams(location.search);
    return queryParams.get('project');
  };
  
  const projectId = getProjectId();
  
  const [sources, setSources] = useState<TrackSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter states
  const [socialMediaFilters, setSocialMediaFilters] = useState({
    hasFacebook: false,
    hasInstagram: false,
    hasLinkedIn: false,
    hasTikTok: false,
  });
  
  // Stats for filter sidebar
  const [filterStats, setFilterStats] = useState<FilterStats>({
    total: 0,
    socialMediaCounts: {
      facebook: 0,
      instagram: 0,
      linkedin: 0,
      tiktok: 0,
    },
  });
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    sourceId: null as number | null,
    sourceName: '',
  });

  // CSV download loading state
  const [csvDownloading, setCsvDownloading] = useState(false);

  // Fetch sources with filters
  const fetchSources = async (
    pageNumber = 0, 
    pageSize = 10, 
    searchQuery = '',
    socialMedia = socialMediaFilters
  ) => {
    try {
      setLoading(true);
      
      // Don't fetch sources if no project is found
      if (!projectId) {
        console.error('No project ID found in URL');
        setSources([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }
      
      // Build query parameters
      let queryParams = `page=${pageNumber + 1}&page_size=${pageSize}`;
      
      // Add project ID (required)
      queryParams += `&project=${projectId}`;
      
      // Add search parameter
      if (searchQuery) {
        queryParams += `&search=${encodeURIComponent(searchQuery)}`;
      }
      
      // Add social media filters
      if (socialMedia.hasFacebook) {
        queryParams += '&has_facebook=true';
      }
      if (socialMedia.hasInstagram) {
        queryParams += '&has_instagram=true';
      }
      if (socialMedia.hasLinkedIn) {
        queryParams += '&has_linkedin=true';
      }
      if (socialMedia.hasTikTok) {
        queryParams += '&has_tiktok=true';
      }
      
      console.log('=== FRONTEND FETCH SOURCES DEBUG ===');
      console.log('Project ID from URL:', projectId);
      console.log('Current URL:', location.pathname);
      console.log('Fetch URL:', `/api/track-accounts/sources/?${queryParams}`);
      
      const response = await apiFetch(`/api/track-accounts/sources/?${queryParams}`);
      console.log('Fetch response status:', response.status);
      console.log('Fetch response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error('Failed to fetch sources');
      }
      
      const data = await response.json();
      console.log('Raw response data:', data);
      
      if (data && typeof data === 'object' && 'results' in data) {
        console.log('Using paginated data, count:', data.count);
        console.log('Results:', data.results);
        setSources(data.results || []);
        setTotalCount(data.count || 0);
        
        // Update filter stats
        if (data.filter_stats) {
          setFilterStats(data.filter_stats);
        }
      } else {
        console.error('Unexpected data format from API:', data);
        setSources([]);
        setTotalCount(0);
      }
      console.log('=== END FRONTEND FETCH SOURCES DEBUG ===');
    } catch (error) {
      console.error('Error fetching sources:', error);
      setSources([]);
      setTotalCount(0);
      showSnackbar('Failed to load sources. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch filter statistics
  const fetchFilterStats = async () => {
    try {
      let queryParams = '';
      if (projectId) {
        queryParams = `?project=${projectId}`;
      }
      
      const response = await apiFetch(`/api/track-accounts/sources/statistics/${queryParams}`);
      if (response.ok) {
        const stats = await response.json();
        setFilterStats(stats);
        console.log('Updated filter stats:', stats);
      }
    } catch (error) {
      console.error('Error fetching filter stats:', error);
    }
  };

  // Refresh both sources and stats
  const refreshData = () => {
    fetchSources(page, rowsPerPage, searchTerm, socialMediaFilters);
    fetchFilterStats();
  };
  


  // Initial data load
  useEffect(() => {
    if (projectId) {
      fetchSources(page, rowsPerPage, searchTerm, socialMediaFilters);
      fetchFilterStats();
    }
  }, [projectId]);

  // Handle pagination change
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
    fetchSources(newPage, rowsPerPage, searchTerm, socialMediaFilters);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    console.log('=== ROWS PER PAGE CHANGE DEBUG ===');
    console.log('New rows per page:', newRowsPerPage);
    console.log('Current page:', page);
    console.log('Current search term:', searchTerm);
    console.log('Current social media filters:', socialMediaFilters);
    
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    fetchSources(0, newRowsPerPage, searchTerm, socialMediaFilters);
  };

  // Handle search input change
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (projectId) {
        setPage(0);
        fetchSources(0, rowsPerPage, searchTerm, socialMediaFilters);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [searchTerm, projectId]); // Dependencies for the effect



  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setSocialMediaFilters({
      hasFacebook: false,
      hasInstagram: false,
      hasLinkedIn: false,
      hasTikTok: false,
    });
    setPage(0);
    fetchSources(0, rowsPerPage, '', {
      hasFacebook: false,
      hasInstagram: false,
      hasLinkedIn: false,
      hasTikTok: false,
    });
    // Refresh stats after clearing filters
    fetchFilterStats();
  };

  // Show snackbar message
  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  // Handle delete source
  const handleDeleteSource = (sourceId: number, sourceName: string) => {
    setDeleteDialog({
      open: true,
      sourceId,
      sourceName,
    });
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deleteDialog.sourceId) return;

    try {
      console.log('Attempting to delete source:', deleteDialog.sourceId);
      console.log('Delete URL:', `/api/track-accounts/sources/${deleteDialog.sourceId}/`);
      
      const response = await apiFetch(`/api/track-accounts/sources/${deleteDialog.sourceId}/`, {
        method: 'DELETE',
      });

      console.log('Delete response status:', response.status);
      console.log('Delete response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete response error:', errorText);
        throw new Error(`Failed to delete source: ${response.status} ${errorText}`);
      }

      showSnackbar(`Source "${deleteDialog.sourceName}" deleted successfully`, 'success');
      
      // Refresh both sources list and filter statistics
      refreshData();
      
      // Close dialog
      setDeleteDialog({
        open: false,
        sourceId: null,
        sourceName: '',
      });
    } catch (error) {
      console.error('Delete error:', error);
      showSnackbar(`Failed to delete source: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteDialog({
      open: false,
      sourceId: null,
      sourceName: '',
    });
  };

  // Handle CSV download
  const handleCsvDownload = async () => {
    if (!projectId) {
      showSnackbar('No project selected for export', 'error');
      return;
    }

    try {
      setCsvDownloading(true);
      
      // Build query parameters to include current filters
      let queryParams = `project=${projectId}`;
      
      // Add search parameter if active
      if (searchTerm) {
        queryParams += `&search=${encodeURIComponent(searchTerm)}`;
      }
      
      // Add social media filters if active
      if (socialMediaFilters.hasFacebook) {
        queryParams += '&has_facebook=true';
      }
      if (socialMediaFilters.hasInstagram) {
        queryParams += '&has_instagram=true';
      }
      if (socialMediaFilters.hasLinkedIn) {
        queryParams += '&has_linkedin=true';
      }
      if (socialMediaFilters.hasTikTok) {
        queryParams += '&has_tiktok=true';
      }
      
      console.log('=== CSV DOWNLOAD DEBUG ===');
      console.log('Download URL:', `/api/track-accounts/sources/download_csv/?${queryParams}`);
      console.log('Current filters:', { searchTerm, socialMediaFilters });
      
      // Use direct fetch for CSV download to avoid apiFetch header interference
      const baseUrl = window.location.origin;
      const downloadUrl = `${baseUrl}/api/track-accounts/sources/download_csv/?${queryParams}`;
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv, application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download response error:', errorText);
        
        // Try to parse as JSON for better error messages
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || errorJson.detail || `Download failed: ${response.status}`);
        } catch {
          throw new Error(`Download failed: ${response.status} ${errorText}`);
        }
      }
      
      // Check content type to ensure we got CSV
      const contentType = response.headers.get('content-type');
      if (!contentType || (!contentType.includes('text/csv') && !contentType.includes('application/octet-stream'))) {
        console.warn('Unexpected content type:', contentType);
      }

      // Create a blob from the response
      const blob = await response.blob();
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `track_sources_export_${timestamp}.csv`;
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up the download link with a timeout to ensure it's processed
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      showSnackbar(`CSV exported successfully: ${filename}`, 'success');
    } catch (error) {
      console.error('Download error:', error);
      showSnackbar(`Failed to download CSV: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setCsvDownloading(false);
    }
  };

  // Navigation helper
  const getNavigationPath = (path: string) => {
    const pathMatch = location.pathname.match(/\/organizations\/(\d+)\/projects\/(\d+)/);
    if (pathMatch) {
      const [, orgId, projId] = pathMatch;
      return `/organizations/${orgId}/projects/${projId}${path}`;
    }
    return path;
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || 
    socialMediaFilters.hasFacebook || socialMediaFilters.hasInstagram || 
    socialMediaFilters.hasLinkedIn || socialMediaFilters.hasTikTok;



  // Helper functions to match workflow management page
  const getPlatformIcon = (platformName: string) => {
    switch (platformName.toLowerCase()) {
      case 'facebook': return <FacebookIcon />;
      case 'instagram': return <InstagramIcon />;
      case 'linkedin': return <LinkedInIcon />;
      case 'tiktok': return <TikTokIcon />;
      default: return <SmartToyIcon />;
    }
  };

  const getPlatformColor = (platformName: string) => {
    switch (platformName.toLowerCase()) {
      case 'facebook': return '#1877f2';
      case 'instagram': return '#e4405f';
      case 'linkedin': return '#0077b5';
      case 'tiktok': return '#000000';
      default: return '#666666';
    }
  };

  const getPlatformName = (source: TrackSource): string => {
    // Determine platform based on which link is present
    if (source.facebook_link) return 'Facebook';
    if (source.instagram_link) return 'Instagram';
    if (source.linkedin_link) return 'LinkedIn';
    if (source.tiktok_link) return 'TikTok';
    return source.platform || 'Unknown';
  };

  const getServiceType = (source: TrackSource): string => {
    // Use the service_name from the database (user input from step 3)
    if (source.service_name) {
      // Map service keys to display labels
      const serviceLabels: { [key: string]: string } = {
        'linkedin_posts': 'Posts',
        'tiktok_posts': 'Posts',
        'instagram_posts': 'Posts',
        'instagram_reels': 'Reels',
        'instagram_comments': 'Comments',
        'facebook_pages_posts': 'Posts',
        'facebook_reels_profile': 'Reels',
        'facebook_comments': 'Comments',
      };
      
      return serviceLabels[source.service_name] || source.service_name;
    }
    
    // Fallback if no service_name is set
    return 'Posts';
  };

  const getFirstUrl = (source: TrackSource): string => {
    // Get the first available URL from the source
    if (source.instagram_link) return source.instagram_link;
    if (source.facebook_link) return source.facebook_link;
    if (source.linkedin_link) return source.linkedin_link;
    if (source.tiktok_link) return source.tiktok_link;
    return 'No URL';
  };

  // Keep the old getService function for backward compatibility
  const getService = (source: TrackSource): string => {
    return getServiceType(source);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f8fafc' }}>
      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{ p: 3, bgcolor: 'white', borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                Source Collection
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b' }}>
                Manage sources with social media links of corresponding platform service type for this project.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {/* CSV Download */}
              <Tooltip title={hasActiveFilters ? "Export filtered data as CSV" : "Export all sources as CSV"}>
                <Button
                  variant="outlined"
                  startIcon={csvDownloading ? <CircularProgress size={16} /> : <DownloadIcon />}
                  onClick={handleCsvDownload}
                  disabled={csvDownloading}
                  size="small"
                  sx={{ 
                    borderColor: theme.palette.secondary.main,
                    color: theme.palette.secondary.main,
                    '&:hover': { 
                      borderColor: theme.palette.secondary.dark,
                      bgcolor: theme.palette.secondary.main + '0A'
                    },
                    '&:disabled': {
                      borderColor: theme.palette.action.disabled,
                      color: theme.palette.action.disabled
                    }
                  }}
                >
                  {csvDownloading ? 'Exporting...' : 'Export CSV'}
                </Button>
              </Tooltip>
              
              {/* Add Source */}
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => navigate(getNavigationPath('/source-tracking/create'))}
                sx={{ 
                  bgcolor: theme.palette.primary.main,
                  '&:hover': { bgcolor: theme.palette.primary.dark }
                }}
              >
                Add Source
              </Button>
            </Box>
          </Box>
          
          {/* Stats Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
            <Card sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
                    <FolderIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {totalCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Sources
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
                         <Card sx={{ bgcolor: '#f0fdf4', border: '1px solid #10b981' }}>
               <CardContent sx={{ p: 2 }}>
                 <Box sx={{ display: 'flex', alignItems: 'center' }}>
                   <Avatar sx={{ bgcolor: '#10b981', mr: 2 }}>
                     <TrendingUpIcon />
                   </Avatar>
                   <Box>
                     <Typography variant="h6" sx={{ fontWeight: 600 }}>
                       {sources.filter(source => 
                         source.facebook_link || source.instagram_link || 
                         source.linkedin_link || source.tiktok_link
                       ).length}
                     </Typography>
                     <Typography variant="body2" color="text.secondary">
                       Social Accounts
                     </Typography>
                   </Box>
                 </Box>
               </CardContent>
             </Card>

          </Box>
        </Box>

        {/* Filters Section - Now horizontally under Source Collection */}
        <Box sx={{ p: 3, bgcolor: 'white', borderBottom: '1px solid #e2e8f0' }}>
          {/* Search Row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', minWidth: 80 }}>
              Search :
            </Typography>
            <TextField
              placeholder="Search sources..."
              value={searchTerm}
              onChange={handleSearchChange}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#64748b', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: 1000,
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#f8fafc',
                  '&:hover': { bgcolor: '#f1f5f9' },
                  '&.Mui-focused': { bgcolor: 'white' }
                }
              }}
            />
            {hasActiveFilters && (
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
                sx={{ color: '#64748b', fontSize: '0.75rem', ml: 'auto' }}
              >
                Clear all
              </Button>
            )}
          </Box>

          {/* Social Media Presence Filters Row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', minWidth: 80 }}>
              Social Media Presence :
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
              <Button
                variant={socialMediaFilters.hasFacebook ? "contained" : "outlined"}
                size="small"
                onClick={() => {
                  const updatedFilters = {
                    ...socialMediaFilters,
                    hasFacebook: !socialMediaFilters.hasFacebook
                  };
                  setSocialMediaFilters(updatedFilters);
                  setPage(0);
                  fetchSources(0, rowsPerPage, searchTerm, updatedFilters);
                  fetchFilterStats();
                }}
                startIcon={<FacebookIcon sx={{ fontSize: 16 }} />}
                sx={{
                  minWidth: 'auto',
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  ...(socialMediaFilters.hasFacebook ? {
                    bgcolor: '#4267B2',
                    color: 'white',
                    border: 'none',
                    '&:hover': { bgcolor: '#365899' }
                  } : {
                    border: 'none',
                    color: '#4267B2',
                    bgcolor: 'transparent',
                    '&:hover': { 
                      bgcolor: '#4267B2',
                      color: 'white'
                    }
                  })
                }}
              >
                Facebook
                <Chip 
                  label={filterStats.socialMediaCounts.facebook} 
                  size="small" 
                  variant="outlined"
                  sx={{ 
                    ml: 0.5, 
                    height: 16, 
                    fontSize: '0.625rem',
                    ...(socialMediaFilters.hasFacebook ? {
                      borderColor: 'white',
                      color: 'white'
                    } : {
                      borderColor: '#4267B2',
                      color: '#4267B2'
                    })
                  }} 
                />
              </Button>
              
              <Button
                variant={socialMediaFilters.hasInstagram ? "contained" : "outlined"}
                size="small"
                onClick={() => {
                  const updatedFilters = {
                    ...socialMediaFilters,
                    hasInstagram: !socialMediaFilters.hasInstagram
                  };
                  setSocialMediaFilters(updatedFilters);
                  setPage(0);
                  fetchSources(0, rowsPerPage, searchTerm, updatedFilters);
                  fetchFilterStats();
                }}
                startIcon={<InstagramIcon sx={{ fontSize: 16 }} />}
                sx={{
                  minWidth: 'auto',
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  ...(socialMediaFilters.hasInstagram ? {
                    bgcolor: '#E1306C',
                    color: 'white',
                    border: 'none',
                    '&:hover': { bgcolor: '#C13584' }
                  } : {
                    border: 'none',
                    color: '#E1306C',
                    bgcolor: 'transparent',
                    '&:hover': { 
                      bgcolor: '#E1306C',
                      color: 'white'
                    }
                  })
                }}
              >
                Instagram
                <Chip 
                  label={filterStats.socialMediaCounts.instagram} 
                  size="small" 
                  variant="outlined"
                  sx={{ 
                    ml: 0.5, 
                    height: 16, 
                    fontSize: '0.625rem',
                    ...(socialMediaFilters.hasInstagram ? {
                      borderColor: 'white',
                      color: 'white'
                    } : {
                      borderColor: '#E1306C',
                      color: '#E1306C'
                    })
                  }} 
                />
              </Button>
              
              <Button
                variant={socialMediaFilters.hasLinkedIn ? "contained" : "outlined"}
                size="small"
                onClick={() => {
                  const updatedFilters = {
                    ...socialMediaFilters,
                    hasLinkedIn: !socialMediaFilters.hasLinkedIn
                  };
                  setSocialMediaFilters(updatedFilters);
                  setPage(0);
                  fetchSources(0, rowsPerPage, searchTerm, updatedFilters);
                  fetchFilterStats();
                }}
                startIcon={<LinkedInIcon sx={{ fontSize: 16 }} />}
                sx={{
                  minWidth: 'auto',
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  ...(socialMediaFilters.hasLinkedIn ? {
                    bgcolor: '#0077B5',
                    color: 'white',
                    border: 'none',
                    '&:hover': { bgcolor: '#005885' }
                  } : {
                    border: 'none',
                    color: '#0077B5',
                    bgcolor: 'transparent',
                    '&:hover': { 
                      bgcolor: '#0077B5',
                      color: 'white'
                    }
                  })
                }}
              >
                LinkedIn
                <Chip 
                  label={filterStats.socialMediaCounts.linkedin} 
                  size="small" 
                  variant="outlined"
                  sx={{ 
                    ml: 0.5, 
                    height: 16, 
                    fontSize: '0.625rem',
                    ...(socialMediaFilters.hasLinkedIn ? {
                      borderColor: 'white',
                      color: 'white'
                    } : {
                      borderColor: '#0077B5',
                      color: '#0077B5'
                    })
                  }} 
                />
              </Button>
              
              <Button
                variant={socialMediaFilters.hasTikTok ? "contained" : "outlined"}
                size="small"
                onClick={() => {
                  const updatedFilters = {
                    ...socialMediaFilters,
                    hasTikTok: !socialMediaFilters.hasTikTok
                  };
                  setSocialMediaFilters(updatedFilters);
                  setPage(0);
                  fetchSources(0, rowsPerPage, searchTerm, updatedFilters);
                  fetchFilterStats();
                }}
                startIcon={<TikTokIcon sx={{ fontSize: 16 }} />}
                sx={{
                  minWidth: 'auto',
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  ...(socialMediaFilters.hasTikTok ? {
                    bgcolor: '#000',
                    color: 'white',
                    border: 'none',
                    '&:hover': { bgcolor: '#333' }
                  } : {
                    border: 'none',
                    color: '#000',
                    bgcolor: 'transparent',
                    '&:hover': { 
                      bgcolor: '#000',
                      color: 'white'
                    }
                  })
                }}
              >
                TikTok
                <Chip 
                  label={filterStats.socialMediaCounts.tiktok} 
                  size="small" 
                  variant="outlined"
                  sx={{ 
                    ml: 0.5, 
                    height: 16, 
                    fontSize: '0.625rem',
                    ...(socialMediaFilters.hasTikTok ? {
                      borderColor: 'white',
                      color: 'white'
                    } : {
                      borderColor: '#000',
                      color: '#000'
                    })
                  }} 
                />
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Table Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          <Paper sx={{ width: '100%', borderRadius: 2, overflow: 'hidden' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : sources.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom color="text.secondary">
                  No sources found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {hasActiveFilters ? 'Try adjusting your filters or search terms.' : 'Get started by adding your first source.'}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate(getNavigationPath('/source-tracking/create'))}
                  sx={{ bgcolor: theme.palette.primary.main, '&:hover': { bgcolor: theme.palette.primary.dark } }}
                >
                  Add Source
                </Button>
              </Box>
            ) : (
              <>
                                 <TableContainer component={Paper}>
                   <Table>
                     <TableHead>
                       <TableRow>
                         <TableCell>Name</TableCell>
                         <TableCell>Platform</TableCell>
                         <TableCell>Service</TableCell>
                         <TableCell>URL</TableCell>
                         <TableCell align="right">Actions</TableCell>
                       </TableRow>
                     </TableHead>
                     <TableBody>
                       {sources.map((source) => (
                         <TableRow key={source.id} hover>
                           <TableCell>
                             <Typography variant="body2" sx={{ fontWeight: 600 }}>
                               {source.name}
                             </Typography>
                           </TableCell>
                           <TableCell>
                             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                               <Avatar
                                 sx={{
                                   width: 24,
                                   height: 24,
                                   bgcolor: getPlatformColor(getPlatformName(source))
                                 }}
                               >
                                 {getPlatformIcon(getPlatformName(source))}
                               </Avatar>
                               <Typography variant="body2">
                                 {getPlatformName(source)}
                               </Typography>
                             </Box>
                           </TableCell>
                           <TableCell>
                             <Typography variant="body2">
                               {getServiceType(source)}
                             </Typography>
                           </TableCell>
                           <TableCell>
                             <Typography variant="body2" sx={{ 
                               maxWidth: 300, 
                               overflow: 'hidden', 
                               textOverflow: 'ellipsis', 
                               whiteSpace: 'nowrap' 
                             }}>
                               {getFirstUrl(source)}
                             </Typography>
                           </TableCell>
                           <TableCell align="right">
                             <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                               <IconButton
                                 size="small"
                                 onClick={() => navigate(getNavigationPath(`/source-tracking/edit/${source.id}`))}
                                 sx={{ 
                                   color: theme.palette.primary.main,
                                   '&:hover': { 
                                     bgcolor: theme.palette.primary.main + '1A'
                                   }
                                 }}
                               >
                                 <EditIcon fontSize="small" />
                               </IconButton>
                               <IconButton
                                 size="small"
                                 onClick={() => handleDeleteSource(source.id, source.name)}
                                 sx={{ 
                                   color: '#dc2626',
                                   '&:hover': { 
                                     bgcolor: '#dc2626',
                                     color: 'white'
                                   }
                                 }}
                               >
                                 <DeleteIcon fontSize="small" />
                               </IconButton>
                             </Box>
                           </TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                   </Table>
                 </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  component="div"
                  count={totalCount}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  sx={{ borderTop: '1px solid #e2e8f0' }}
                />
              </>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={cancelDelete}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: '#dc2626', fontWeight: 600 }}>
          Delete Source
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the source "{deleteDialog.sourceName}"? 
            <br/>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={cancelDelete}
            variant="outlined"
            color="primary"
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            variant="contained"
            sx={{ 
              bgcolor: '#dc2626',
              color: 'white',
              '&:hover': { bgcolor: '#b91c1c' }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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

export default TrackSourcesList;

// Keep backward compatibility alias
export { TrackSourcesList as TrackAccountsList }; 