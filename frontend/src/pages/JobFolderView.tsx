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
  Breadcrumbs,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  Work as WorkIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { apiFetch } from '../utils/api';
import UniversalDataDisplay, { UniversalFolder, UniversalDataItem } from '../components/UniversalDataDisplay';

interface JobFolder {
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
  platform_code?: string;
  service_code?: string;
}

interface ScraperRequest {
  id: number;
  status: string;
  target_url: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  batch_job?: number;
}

interface Post {
  id: number;
  post_id: string;
  url: string;
  user_posted: string;
  content: string;
  description: string;
  likes: number;
  num_comments: number;
  date_posted: string;
  created_at: string;
  is_verified?: boolean;
}

// Data adapter to convert posts to UniversalDataItem format
const postToUniversalData = (posts: Post[]): UniversalDataItem[] => {
  return posts.map(post => ({
    id: post.id,
    url: post.url,
    content: post.content,
    user: post.user_posted,
    date: post.date_posted,
    likes: post.likes,
    comments: post.num_comments,
    platform: 'instagram',
    content_type: 'post',
    created_at: post.created_at,
    post_id: post.post_id,
  }));
};

const JobFolderView = () => {
  const { organizationId, projectId, folderId } = useParams<{ 
    organizationId: string; 
    projectId: string; 
    folderId: string;
  }>();
  const navigate = useNavigate();
  
  const [jobFolder, setJobFolder] = useState<JobFolder | null>(null);
  const [scraperRequests, setScraperRequests] = useState<ScraperRequest[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [universalFolder, setUniversalFolder] = useState<UniversalFolder | null>(null);
  const [calculatedStats, setCalculatedStats] = useState<any>(null);
  const [jobStatus, setJobStatus] = useState<{status: string, message: string} | null>(null);

  const fetchJobData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch job folder details
      const folderResponse = await apiFetch(`/api/track-accounts/report-folders/${folderId}/?project=${projectId}`);
      if (!folderResponse.ok) {
        throw new Error('Failed to fetch job folder details');
      }
             const folderData = await folderResponse.json();
       setJobFolder(folderData);

       // Create UniversalFolder object for UniversalDataDisplay
       const universalFolderData: UniversalFolder = {
         id: folderData.id,
         name: folderData.name,
         description: folderData.description,
         category: 'posts', // Job folders are always posts
         category_display: 'Posts',
         platform: folderData.platform_code || folderData.platform || 'instagram',
         job_id: folderData.id,
         created_at: folderData.created_at,
         updated_at: folderData.created_at,
         action_type: 'collect_posts'
       };
       setUniversalFolder(universalFolderData);

       // Fetch associated scraper requests - we'll get all requests and filter by track_source_id
      const requestsResponse = await apiFetch(`/api/brightdata/requests/`);
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        const allRequests = requestsData.results || requestsData || [];
        
        // Filter requests that are associated with this job folder
        // Since we know the job folder is for track_source_id 49, we'll filter by that
        const filteredRequests = allRequests.filter((req: any) => {
          if (req.batch_job && req.batch_job.platform_params) {
            try {
              const params = typeof req.batch_job.platform_params === 'string' 
                ? JSON.parse(req.batch_job.platform_params) 
                : req.batch_job.platform_params;
              return params.track_source_id === 49; // The track source for this job
            } catch {
              return false;
            }
          }
          return false;
        });
        
        setScraperRequests(filteredRequests);
      }

         // Fetch platform folders and data for this job folder
         const platformFoldersResponse = await apiFetch(`/api/track-accounts/report-folders/${folderId}/platform_folders/`);
         if (platformFoldersResponse.ok) {
           const platformFoldersData = await platformFoldersResponse.json();
           console.log('Platform folders data:', platformFoldersData);
           
           // Check if we have platform folders with posts
           const platformFolders = platformFoldersData.platform_folders || [];
           let fetchedPosts: Post[] = [];
           
           // If we have platform folders, try to get posts from the first one with posts
           for (const pf of platformFolders) {
             if (pf.folder && pf.folder.post_count > 0) {
               // Fetch posts from this platform folder
               const platformDataResponse = await apiFetch(`/api/track-accounts/report-folders/${folderId}/platform_data/`);
               if (platformDataResponse.ok) {
                 const platformData = await platformDataResponse.json();
                 fetchedPosts = platformData.posts || [];
                 console.log('Fetched posts from platform folder:', fetchedPosts.length, fetchedPosts);
                 break;
               }
             }
           }
           
           setPosts(fetchedPosts);
           
           // Update universal folder with platform info
           setUniversalFolder(prevFolder => {
             if (prevFolder) {
               return {
                 ...prevFolder,
                 platform: platformFoldersData.platform_folders?.[0]?.platform || prevFolder.platform
               };
             }
             return prevFolder;
           });
           
           // If no platform folders or no posts, show appropriate message
           if (platformFoldersData.status && platformFoldersData.message) {
             console.log('Job status:', platformFoldersData.status, 'Message:', platformFoldersData.message);
             setJobStatus({
               status: platformFoldersData.status,
               message: platformFoldersData.message
             });
           }
         } else {
           console.error('Failed to fetch platform folders:', platformFoldersResponse.status);
         }

    } catch (error) {
      console.error('Error fetching job data:', error);
      setError('Failed to load job data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId && folderId) {
      fetchJobData();
    }
  }, [projectId, folderId]);

  // Debug effect to log when posts change
  useEffect(() => {
    console.log('Posts changed:', posts.length, posts);
  }, [posts]);

  // Calculate stats when posts change
  useEffect(() => {
    console.log('Stats calculation triggered - posts length:', posts.length, 'universalFolder:', !!universalFolder);
    if (posts.length > 0 && universalFolder) {
      console.log('Posts data for stats:', posts.map(p => ({ 
        user: p.user_posted, 
        likes: p.likes, 
        comments: p.num_comments, 
        verified: p.is_verified 
      })));
      
      const stats = {
        totalItems: posts.length,
        uniqueUsers: new Set(posts.map(p => p.user_posted)).size,
        avgLikes: Math.round(posts.reduce((sum, p) => sum + p.likes, 0) / posts.length),
        avgComments: Math.round(posts.reduce((sum, p) => sum + p.num_comments, 0) / posts.length),
        verifiedAccounts: posts.filter(p => p.is_verified).length,
        platform: universalFolder.platform
      };
      console.log('Calculated stats:', stats);
      setCalculatedStats(stats);
    } else {
      console.log('Setting stats to null - posts length:', posts.length, 'universalFolder:', !!universalFolder);
      setCalculatedStats(null);
    }
  }, [posts, universalFolder]);

  const handleBackClick = () => {
    if (jobFolder?.parent_folder) {
      // Navigate back to parent service folder
      navigate(`/organizations/${organizationId}/projects/${projectId}/data-storage/service/${jobFolder.parent_folder}`);
    } else {
      // Navigate back to data storage main page
      navigate(`/organizations/${organizationId}/projects/${projectId}/data-storage`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'pending':
        return <PendingIcon color="warning" />;
      case 'processing':
        return <CircularProgress size={20} />;
      case 'failed':
        return <ErrorIcon color="error" />;
      default:
        return <PendingIcon color="action" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'processing':
        return 'info';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
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

  // If we have the universal folder data, render the UniversalDataDisplay
  if (universalFolder) {
    return (
      <Box sx={{ 
        width: '100%', 
        padding: '16px 32px',
        bgcolor: '#f5f5f5',
        minHeight: 'calc(100vh - 56px)',
      }}>
        
                 {error && (
           <Alert severity="error" sx={{ mb: 3 }}>
             {error}
           </Alert>
         )}

        

         {/* Universal Data Display */}
         {calculatedStats ? (
           <UniversalDataDisplay
             folder={universalFolder}
             platform={universalFolder.platform}
             onBackNavigation={handleBackClick}
             onRefresh={fetchJobData}
             data={postToUniversalData(posts)}
             stats={calculatedStats}
             disableApiFetch={true}
           />
         ) : jobStatus ? (
           <Box sx={{ p: 3, textAlign: 'center' }}>
             <Typography variant="h6" color="text.secondary" gutterBottom>
               {jobStatus.status === 'completed' ? 'No Data Available' : 'Job in Progress'}
             </Typography>
             <Typography color="text.secondary">
               {jobStatus.message}
             </Typography>
           </Box>
         ) : (
           <Box sx={{ p: 3, textAlign: 'center' }}>
             <Typography>Loading data...</Typography>
           </Box>
         )}

        {/* Job Details (Collapsible) */}
        {scraperRequests.length > 0 && (
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">
                Job Details ({scraperRequests.length} requests)
              </Typography>
            </Box>
            
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {scraperRequests.map((request) => (
                <Box key={request.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                  <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getStatusIcon(request.status)}
                      <Chip 
                        label={request.status} 
                        color={getStatusColor(request.status) as any}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      ID: {request.id}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Target URL:</strong> {request.target_url}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Created: {formatDate(request.created_at)} | 
                    Completed: {request.completed_at ? formatDate(request.completed_at) : 'N/A'}
                    {request.error_message && (
                      <span> | Error: {request.error_message}</span>
                    )}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        )}
      </Box>
    );
  }

    // Fallback: Show loading or error state
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    </Container>
  );
};

export default JobFolderView;
