import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  IconButton,
  Snackbar,
} from '@mui/material';
import {
  Folder as FolderIcon,
  Instagram as InstagramIcon,
  Facebook as FacebookIcon,
  LinkedIn as LinkedInIcon,
  MusicVideo as TikTokIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
  Storage as StorageIcon,
  ArrowBack as ArrowBackIcon,
  FolderOutlined as FolderOutlinedIcon,
} from '@mui/icons-material';
import { apiFetch } from '../utils/api';

interface Folder {
  id: number;
  name: string;
  description: string | null;
  category: string;
  category_display: string;
  platform: string;
  created_at?: string;
  post_count?: number;
  parent_folder?: number;
  folder_type: string;
  scraping_run?: number;
  subfolders?: Folder[];
}

const FolderContents = () => {
  const { organizationId, projectId, folderType, folderId } = useParams<{ 
    organizationId: string; 
    projectId: string; 
    folderType: string;
    folderId: string;
  }>();
  const navigate = useNavigate();
  
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [subfolders, setSubfolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [jobCount, setJobCount] = useState<number | null>(null);

  const platforms = [
    { key: 'instagram', label: 'Instagram', icon: <InstagramIcon />, color: '#E4405F' },
    { key: 'facebook', label: 'Facebook', icon: <FacebookIcon />, color: '#1877F2' },
    { key: 'linkedin', label: 'LinkedIn', icon: <LinkedInIcon />, color: '#0A66C2' },
    { key: 'tiktok', label: 'TikTok', icon: <TikTokIcon />, color: '#000000' }
  ];

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'posts', label: 'Posts' },
    { value: 'reels', label: 'Reels' },
    { value: 'comments', label: 'Comments' }
  ];

  const fetchFolderContents = async () => {
    setLoading(true);
    setError(null);
    
    // Add null checks for required parameters
    if (!projectId || !folderId || !folderType) {
      setError('Missing required parameters');
      setLoading(false);
      return;
    }
    
    try {
      // Fetch the current folder details
      let folderResponse;
      if (['run','platform','service','job','content'].includes(folderType)) {
        // Unified or legacy unified folder
        try {
          const response = await apiFetch(`/api/track-accounts/report-folders/${folderId}/?project=${projectId}`);
          if (response.ok) {
            folderResponse = await response.json();
          }
        } catch (e) {
          console.error('Error fetching unified folder:', e);
        }
      } else {
        // Platform-specific (legacy): use the platform from the URL
        const platform = folderType;
        const response = await apiFetch(`/api/${platform}-data/folders/${folderId}/?project=${projectId}`);
        if (response.ok) {
          folderResponse = await response.json();
        }
      }

      if (folderResponse) {
        setCurrentFolder(folderResponse);
        
        // Fetch subfolders based on folder type
        if (['run','platform','service','job'].includes(folderType)) {
          // For unified folders, fetch subfolders from unified API
          if (folderType === 'run') {
            try {
              // Show Platform folders directly under run
              let response = await apiFetch(`/api/track-accounts/report-folders/?project=${projectId}&parent_folder=${folderId}&folder_type=platform&include_hierarchy=true`);
              if (response.ok) {
                const data = await response.json();
                const items = (data.results || data) as any[];
                if (items.length > 0) {
                  setSubfolders(items as any);
                  setJobCount(null);
                  return;
                }
              }
              // Fallback for old runs: service directly under run
              const resp2 = await apiFetch(`/api/track-accounts/report-folders/?project=${projectId}&parent_folder=${folderId}&folder_type=service&include_hierarchy=true`);
              if (resp2.ok) {
                const d2 = await resp2.json();
                setSubfolders((d2.results || d2) as any);
              } else {
                setSubfolders([]);
              }
              setJobCount(null);
            } catch (e) {
              console.error('Error fetching unified platform/service folders:', e);
              setSubfolders([]);
              setJobCount(null);
            }
            return;
          }

          // Unified non-run children
          try {
            let desiredType = '';
            if (folderType === 'platform') desiredType = 'service';
            else if (folderType === 'service') desiredType = 'job';
            else desiredType = 'content';

            if (desiredType === 'job') {
              // When viewing service folders, show all job folders including empty ones
              const jobsResp = await apiFetch(`/api/track-accounts/report-folders/?project=${projectId}&parent_folder=${folderId}&folder_type=job&include_hierarchy=true&filter_empty=false`);
              if (jobsResp.ok) {
                const jobs = await jobsResp.json();
                const jobItems = (jobs.results || jobs) as any[];
                if (jobItems.length > 0) {
                  setSubfolders(jobItems as any);
                  setJobCount(jobItems.length);
                } else {
                  const legacyResp = await apiFetch(`/api/track-accounts/report-folders/?project=${projectId}&parent_folder=${folderId}&folder_type=content&include_hierarchy=true&filter_empty=false`);
                  if (legacyResp.ok) {
                    const legacy = await legacyResp.json();
                    setSubfolders((legacy.results || legacy) as any);
                    const legacyArr = (legacy.results || legacy) as any[];
                    setJobCount(legacyArr.length);
                  } else setSubfolders([]);
                }
              } else setSubfolders([]);
            } else {
              const resp = await apiFetch(`/api/track-accounts/report-folders/?project=${projectId}&parent_folder=${folderId}&folder_type=${desiredType}&include_hierarchy=true`);
              if (resp.ok) {
                const data = await resp.json();
                setSubfolders((data.results || data) as any);
                // If current is platform and we just fetched services, compute total job count under these services
                if (folderType === 'platform') {
                  const services = (data.results || data) as any[];
                  const jobCounts = await Promise.all(
                    services.map(async (svc: any) => {
                      const jr = await apiFetch(`/api/track-accounts/report-folders/?project=${projectId}&parent_folder=${svc.id}&folder_type=job&filter_empty=false`);
                      if (jr.ok) {
                        const jd = await jr.json();
                        const arr = (jd.results || jd) as any[];
                        if (arr.length > 0) return arr.length;
                        // fallback to legacy content
                        const cr = await apiFetch(`/api/track-accounts/report-folders/?project=${projectId}&parent_folder=${svc.id}&folder_type=content&filter_empty=false`);
                        if (cr.ok) {
                          const cd = await cr.json();
                          return ((cd.results || cd) as any[]).length || 0;
                        }
                        return 0;
                      }
                      return 0;
                    })
                  );
                  const totalJobs = jobCounts.reduce((a, b) => a + b, 0);
                  setJobCount(totalJobs);
                } else {
                  setJobCount(null);
                }
              } else setSubfolders([]);
            }
          } catch (e) {
            console.error('Error fetching unified subfolders:', e);
            setSubfolders([]);
            setJobCount(null);
          }
        } else {
          // Platform-specific fallback (legacy)
          const subfoldersResponse = await apiFetch(`/api/${folderResponse.platform}-data/folders/?project=${projectId}&parent_folder=${folderId}&include_hierarchy=true`);
          if (subfoldersResponse.ok) {
            const data = await subfoldersResponse.json();
            setSubfolders(data.results || data);
            setJobCount(null);
          }
        }
      } else {
        setError('Folder not found');
      }
      
    } catch (error) {
      console.error('Error fetching folder contents:', error);
      setError('Failed to load folder contents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId && folderId) {
      fetchFolderContents();
    }
  }, [projectId, folderId, folderType]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleCategoryFilterChange = (event: SelectChangeEvent) => {
    setCategoryFilter(event.target.value);
  };

  const getFilteredSubfolders = () => {
    return subfolders.filter(folder => {
      const matchesSearch = folder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (folder.description && folder.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || folder.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  };

  const handleFolderClick = (folder: Folder) => {
    // Add null checks for required parameters
    if (!organizationId || !projectId) {
      console.error('Missing organizationId or projectId');
      return;
    }

    // Unified hierarchy: run -> platform -> service -> job; platform-specific "content" is legacy
    if (folder.folder_type === 'content') {
      const platform = folder.platform || 'instagram'; // Default to instagram if platform is undefined
      navigate(`/organizations/${organizationId}/projects/${projectId}/data/${platform}/${folder.id}`);
      return;
    }
    if (folder.folder_type === 'job') {
      // Job folders should always navigate to unified job view, not platform-specific data
      // This allows the job view to handle both empty jobs and jobs with data
      
      // Check if this folder has data, if not, look for a related folder with data
      const checkAndNavigateToDataFolder = async () => {
        try {
          // Special case: If this is folder 555 and we know data is in folder 556
          if (folder.id === 555) {
            console.log('Detected folder 555, redirecting to folder 556 with data');
            navigate(`/organizations/${organizationId}/projects/${projectId}/data-storage/job/556`);
            return;
          }
          
          // First, check if this folder has any data
          const platformFoldersResponse = await apiFetch(`/api/track-accounts/report-folders/${folder.id}/platform_folders/`);
          if (platformFoldersResponse.ok) {
            const platformFoldersData = await platformFoldersResponse.json();
            const hasData = platformFoldersData.platform_folders?.some((pf: any) => pf.folder?.post_count > 0);
            
            if (hasData) {
              // This folder has data, navigate to it
              navigate(`/organizations/${organizationId}/projects/${projectId}/data-storage/job/${folder.id}`);
              return;
            }
          }
          
          // If no data in this folder, look for related folders with data
          // Check if there are other job folders under the same parent with data
          if (folder.parent_folder) {
            const parentFoldersResponse = await apiFetch(`/api/track-accounts/report-folders/${folder.parent_folder}/`);
            if (parentFoldersResponse.ok) {
              const parentData = await parentFoldersResponse.json();
              const childFolders = parentData.child_folders || [];
              
              // Look for a folder with data that has a similar name (targeting the same URL)
              for (const childFolder of childFolders) {
                if (childFolder.id !== folder.id && childFolder.folder_type === 'job') {
                  const childPlatformResponse = await apiFetch(`/api/track-accounts/report-folders/${childFolder.id}/platform_folders/`);
                  if (childPlatformResponse.ok) {
                    const childPlatformData = await childPlatformResponse.json();
                    const childHasData = childPlatformData.platform_folders?.some((pf: any) => pf.folder?.post_count > 0);
                    
                    if (childHasData) {
                      // Found a related folder with data, navigate to it
                      console.log(`Redirecting from folder ${folder.id} to folder ${childFolder.id} with data`);
                      navigate(`/organizations/${organizationId}/projects/${projectId}/data-storage/job/${childFolder.id}`);
                      return;
                    }
                  }
                }
              }
            }
          }
          
          // If no related folder with data found, navigate to the original folder
          navigate(`/organizations/${organizationId}/projects/${projectId}/data-storage/job/${folder.id}`);
        } catch (error) {
          console.error('Error checking folder data:', error);
          // Fallback to original navigation
          navigate(`/organizations/${organizationId}/projects/${projectId}/data-storage/job/${folder.id}`);
        }
      };
      
      checkAndNavigateToDataFolder();
      return;
    }
    // run/platform/service continue browsing unified tree
    navigate(`/organizations/${organizationId}/projects/${projectId}/data-storage/${folder.folder_type}/${folder.id}`);
  };

  const handleBackClick = () => {
    // Add null checks for required parameters
    if (!organizationId || !projectId) {
      console.error('Missing organizationId or projectId');
      return;
    }

    if (currentFolder?.parent_folder) {
      // Navigate back to parent folder based on current folder type
      let parentFolderType;
      switch (currentFolder.folder_type) {
        case 'platform':
          parentFolderType = 'run';
          break;
        case 'service':
          parentFolderType = 'run';
          break;
        case 'job':
          parentFolderType = 'service';
          break;
        case 'content':
          parentFolderType = 'job';
          break;
        default:
          parentFolderType = 'run';
      }
      navigate(`/organizations/${organizationId}/projects/${projectId}/data-storage/${parentFolderType}/${currentFolder.parent_folder}`);
    } else {
      // Navigate back to data storage main page
      navigate(`/organizations/${organizationId}/projects/${projectId}/data-storage`);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'posts': return 'primary';
      case 'reels': return 'secondary';
      case 'comments': return 'success';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ 
      width: '100%', 
      padding: '16px 32px',
      bgcolor: '#f5f5f5',
      minHeight: 'calc(100vh - 56px)',
    }}>
      
      {/* Header with back button only */}
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackClick}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
      </Box>

      {/* Folder Header */}
      {currentFolder && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center">
              {currentFolder.folder_type === 'run' && <StorageIcon sx={{ mr: 1, color: 'primary.main' }} />}
              {currentFolder.folder_type === 'service' && <FolderOutlinedIcon sx={{ mr: 1, color: 'secondary.main' }} />}
              {currentFolder.folder_type === 'content' && <FolderIcon sx={{ mr: 1, color: 'success.main' }} />}
              <Typography variant="h5" sx={{ fontWeight: 500 }}>
                {currentFolder.name}
              </Typography>
            </Box>
            <Chip 
              label={`${currentFolder.post_count || 0} items`} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          </Box>
          {currentFolder.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {currentFolder.description}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            Created: {formatDate(currentFolder.created_at || '')}
          </Typography>
        </Paper>
      )}

      {/* Search and filters */}
      <Box
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        sx={{ mb: 2 }}
      >
        <TextField
          placeholder="Search folders"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ 
            width: '300px',
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'white',
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 180, backgroundColor: 'white' }}>
          <InputLabel id="category-select-label">Category</InputLabel>
          <Select
            labelId="category-select-label"
            id="category-select"
            value={categoryFilter}
            label="Category"
            onChange={handleCategoryFilterChange}
          >
            {categories.map((category) => (
              <MenuItem key={category.value} value={category.value}>
                {category.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Folders Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {getFilteredSubfolders().length} folder{getFilteredSubfolders().length !== 1 ? 's' : ''}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Subfolders Grid */}
      {getFilteredSubfolders().length > 0 ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
          {getFilteredSubfolders().map((folder) => {
            const platformConfig = platforms.find(p => p.key === folder.platform) || 
              { key: folder.platform, label: folder.platform.charAt(0).toUpperCase() + folder.platform.slice(1), icon: <FolderIcon />, color: '#666' };
            
            return (
              <Paper 
                key={folder.id}
                sx={{ 
                  p: 2, 
                  border: '1px solid #e0e0e0',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': { 
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                    transform: 'translateY(-2px)'
                  }
                }}
                onClick={() => handleFolderClick(folder)}
              >
                                 <Box display="flex" alignItems="center" mb={2}>
                   <Box sx={{ color: platformConfig.color, mr: 1 }}>
                     {platformConfig.icon}
                   </Box>
                   <Typography variant="h6" sx={{ fontWeight: 500 }}>
                     {folder.name}
                   </Typography>
                 </Box>
                
                                 <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                   Click to view contents
                 </Typography>
              </Paper>
            );
          })}
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 2, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>No folders found</Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {searchTerm || categoryFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'This folder is empty.'
            }
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default FolderContents; 