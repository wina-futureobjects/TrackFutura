import { useState, useEffect, ChangeEvent, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Link,
  Chip,
  Divider,
  Card,
  CardContent,
  IconButton,
  TextField,
  Stack,
  Breadcrumbs,
  Tooltip,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  InputAdornment,
  Tabs,
  Tab,
  Avatar,
  LinearProgress,
  Menu,
  ListItemIcon,
  ListItemText,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  Badge,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupIcon from '@mui/icons-material/Group';
import VerifiedIcon from '@mui/icons-material/Verified';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import GetAppIcon from '@mui/icons-material/GetApp';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SortIcon from '@mui/icons-material/Sort';
import DateRangeIcon from '@mui/icons-material/DateRange';
import ChatIcon from '@mui/icons-material/Chat';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WebhookIcon from '@mui/icons-material/Webhook';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { apiFetch } from '../utils/api';

// Universal Data Interfaces
export interface UniversalDataItem {
  id: number;
  url: string;
  content: string | null;
  user: string;
  date: string;
  likes: number;
  comments: number;
  platform: string;
  content_type?: string;
  thumbnail?: string | null;
  is_verified?: boolean;
  metadata?: Record<string, any>;
  // Comment-specific fields
  comment_id?: string;
  post_id?: string;
  post_url?: string;
  post_user?: string;
  comment_user_url?: string;
  replies_number?: number;
  hashtag_comment?: string;
  // Profile-specific fields
  followers?: number;
  posts_count?: number;
  is_paid_partnership?: boolean;
  // Reel-specific fields
  views?: number;
  shares?: number;
  music?: string;
  duration?: number;
}

export interface UniversalFolder {
  id: number;
  name: string;
  description: string | null;
  category: 'posts' | 'reels' | 'comments' | 'profiles';
  category_display: string;
  platform: string;
  job_id?: number;
  created_at?: string;
  updated_at?: string;
  action_type?: 'collect_posts' | 'collect_reels' | 'collect_comments' | 'collect_profiles';
}

export interface UniversalFolderStats {
  totalItems: number;
  uniqueUsers: number;
  avgLikes: number;
  avgComments: number;
  verifiedAccounts: number;
  platform: string;
}

export interface UniversalWebhookStatus {
  isActive: boolean;
  lastUpdate: string | null;
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
}

export interface UniversalDataDisplayProps {
  folder: UniversalFolder;
  platform: string;
  onBackNavigation?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  customFields?: {
    [key: string]: {
      label: string;
      type: 'text' | 'number' | 'date' | 'boolean' | 'url';
      display?: boolean;
      sortable?: boolean;
    };
  };
  dataAdapter?: (rawData: any[], category?: string) => UniversalDataItem[];
  statsAdapter?: (rawStats: any, category?: string) => UniversalFolderStats;
  // New props for direct data display
  data?: UniversalDataItem[];
  stats?: UniversalFolderStats;
  disableApiFetch?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`universal-data-tabpanel-${index}`}
      aria-labelledby={`universal-data-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `universal-data-tab-${index}`,
    'aria-controls': `universal-data-tabpanel-${index}`,
  };
}

const UniversalDataDisplay: React.FC<UniversalDataDisplayProps> = ({
  folder,
  platform,
  onBackNavigation,
  onRefresh,
  onExport,
  customFields = {},
  dataAdapter,
  statsAdapter,
  data: propData,
  stats: propStats,
  disableApiFetch = false
}) => {
  // State management
  const [data, setData] = useState<UniversalDataItem[]>([]);
  const [stats, setStats] = useState<UniversalFolderStats>({
    totalItems: 0,
    uniqueUsers: 0,
    avgLikes: 0,
    avgComments: 0,
    verifiedAccounts: 0,
    platform
  });
  const [webhookStatus, setWebhookStatus] = useState<UniversalWebhookStatus>({
    isActive: false,
    lastUpdate: null,
    totalRequests: 0,
    successRate: 0,
    averageResponseTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minLikes, setMinLikes] = useState('');
  const [maxLikes, setMaxLikes] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch data from API based on folder category
  const fetchData = async (pageNumber = 0, pageSize = 10, searchTerm = '', useFilters = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Clear existing data immediately to show loading state
      setData([]);
      
      console.log(`📡 Fetching data for folder ${folder.id}, page ${pageNumber + 1}, search: "${searchTerm}"`);
      console.log(`📁 Current folder category: ${folder.category}`);
      
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
      const projectParam = `&project=${folder.id}`;
      
      // Add sorting parameters
      const sortParams = sortBy ? `&ordering=${sortOrder === 'desc' ? `-${sortBy}` : sortBy}` : '';
      
      // Add filter parameters if useFilters is true
      const filterParams = useFilters ? [
        startDate ? `&start_date=${startDate}` : '',
        endDate ? `&end_date=${endDate}` : '',
        minLikes ? `&min_likes=${minLikes}` : '',
        maxLikes ? `&max_likes=${maxLikes}` : ''
      ].join('') : '';
      
      // Define platform capabilities - which endpoints are available for each platform
      const platformCapabilities = {
        'instagram': {
          posts: true,
          comments: true,
          reels: false, // Instagram doesn't have separate reels endpoint
          profiles: false // Instagram doesn't have separate profiles endpoint
        },
        'facebook': {
          posts: true,
          comments: true,
          reels: false, // Facebook doesn't have separate reels endpoint
          profiles: false // Facebook doesn't have separate profiles endpoint
        },
        'linkedin': {
          posts: true,
          comments: false, // LinkedIn doesn't have comments endpoint
          reels: false, // LinkedIn doesn't have reels endpoint
          profiles: false // LinkedIn doesn't have profiles endpoint
        },
        'tiktok': {
          posts: true,
          comments: false, // TikTok doesn't have comments endpoint
          reels: false, // TikTok doesn't have separate reels endpoint
          profiles: false // TikTok doesn't have profiles endpoint
        }
      } as const;

      // Get platform capabilities
      const capabilities = (platformCapabilities as any)[platform] || platformCapabilities['instagram'];
      
      // Check folder category and determine the correct endpoint
      if (folder.category === 'comments') {
        console.log('🔄 Comments folder detected');
        
        if (capabilities.comments) {
          // Platform supports comments endpoint
          console.log('🔄 Platform supports comments endpoint - using comments API');
          // For comments, we don't need projectParam since we're filtering by folder_id
          const commentsApiUrl = `/api/${platform}-data/comments/?folder_id=${folder.id}&page=${pageNumber + 1}&page_size=${pageSize}${searchParam}${filterParams}${sortParams}`;
          console.log('🔄 Fetching comments from:', commentsApiUrl);
          
          const response = await apiFetch(commentsApiUrl);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Comments endpoint error:', response.status, errorText);
            throw new Error(`Failed to fetch comments: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('📝 Comments endpoint response:', data);
          console.log('📝 Comments response type:', typeof data);
          console.log('📝 Comments response keys:', Object.keys(data || {}));
          
          if (data && typeof data === 'object') {
            const results = data.results || data || [];
            console.log('✅ Setting comments data with', results.length, 'items');
            console.log('📋 First comment item:', results[0]);
            
            const items = dataAdapter ? dataAdapter(results, folder.category) : results;
            console.log('📋 First adapted item:', items[0]);
            setData(items);
            setTotalCount(data.count || results.length);
            
            console.log(`✅ Successfully loaded ${results.length} comments, total count: ${data.count || results.length}`);
          } else {
            console.error('❌ Comments endpoint returned unexpected data structure:', data);
            throw new Error('Comments endpoint returned unexpected data format');
          }
        } else {
          // Platform doesn't support comments - use folder contents as fallback
          console.log('🔄 Platform does not support comments endpoint - using folder contents fallback');
          // For folder contents, we don't need projectParam since we're accessing the folder directly
          const fallbackUrl = `/api/${platform}-data/folders/${folder.id}/contents/?page=${pageNumber + 1}&page_size=${pageSize}${searchParam}${filterParams}${sortParams}`;
          console.log('🔄 Fetching from fallback endpoint:', fallbackUrl);
          
          const response = await apiFetch(fallbackUrl);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Fallback endpoint error:', response.status, errorText);
            throw new Error(`Failed to fetch folder contents: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('📝 Fallback endpoint response:', data);
          console.log('📝 Fallback response type:', typeof data);
          console.log('📝 Fallback response keys:', Object.keys(data || {}));
          
          if (data && typeof data === 'object') {
            const results = data.results || data || [];
            console.log('✅ Setting fallback data with', results.length, 'items');
            console.log('📋 First fallback item:', results[0]);
            
            const items = dataAdapter ? dataAdapter(results, folder.category) : results;
            console.log('📋 First adapted fallback item:', items[0]);
            setData(items);
            setTotalCount(data.count || results.length);
            
            console.log(`✅ Successfully loaded ${results.length} items from fallback, total count: ${data.count || results.length}`);
          } else {
            console.error('❌ Fallback endpoint returned unexpected data structure:', data);
            throw new Error('Fallback endpoint returned unexpected data format');
          }
        }
        
      } else {
        // For posts/reels/profiles folders
        console.log(`📊 ${folder.category} folder detected`);
        
        // Map folder categories to available endpoints
        let endpoint = 'posts'; // Default to posts endpoint
        
        if (folder.category === 'reels') {
          if (capabilities.reels) {
            endpoint = 'reels';
          } else {
            console.log('🔄 Platform does not support reels endpoint - using posts endpoint');
            endpoint = 'posts';
          }
        } else if (folder.category === 'profiles') {
          if (capabilities.profiles) {
            endpoint = 'profiles';
          } else {
            console.log('🔄 Platform does not support profiles endpoint - using posts endpoint');
            endpoint = 'posts';
          }
        } else if (folder.category === 'posts') {
          endpoint = 'posts';
        }
        
        const folderParam = `folder_id=${folder.id}`;
        const postsApiUrl = `/api/${platform}-data/${endpoint}/?${folderParam}&page=${pageNumber + 1}&page_size=${pageSize}${searchParam}${projectParam}${filterParams}${sortParams}`;
        
        console.log(`🚀 Fetching ${folder.category} (using ${endpoint} endpoint) from:`, postsApiUrl);
        
        const response = await apiFetch(postsApiUrl);
        console.log(`📥 ${folder.category} API response status:`, response.status, 'OK:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ ${folder.category} endpoint error:`, response.status, errorText);
          throw new Error(`Failed to fetch ${folder.category}: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`📊 ${folder.category} endpoint response data:`, data);
        console.log(`📊 ${folder.category} endpoint response structure:`, {
          hasResults: 'results' in data,
          hasCount: 'count' in data,
          resultsLength: data.results?.length || 0,
          totalCount: data.count || 0,
          dataType: typeof data,
          dataKeys: Object.keys(data || {})
        });
        
        if (data && typeof data === 'object' && 'results' in data) {
          const results = data.results || [];
          console.log(`✅ Setting ${folder.category} data with`, results.length, 'items');
          console.log(`📋 First few ${folder.category}:`, results.slice(0, 2));
          
          const items = dataAdapter ? dataAdapter(results, folder.category) : results;
          setData(items);
          setTotalCount(data.count || results.length);
          
          console.log(`✅ Successfully loaded ${results.length} ${folder.category}, total count: ${data.count || results.length}`);
        } else {
          console.error(`❌ ${folder.category} endpoint returned data without results structure:`, data);
          throw new Error(`${folder.category} endpoint returned unexpected data format`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      // Keep the empty state but show an error to the user
      setData([]);
      setTotalCount(0);
      
      // Set error state for user feedback
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch folder statistics
  const fetchStats = async () => {
    // If we have direct stats props, use them
    if (propStats && disableApiFetch) {
      setStats(propStats);
      return;
    }
    
    try {
      const folderParam = `folder_id=${folder.id}`;
      const projectParam = folder.id ? `&project=${folder.id}` : '';
      
      // Define platform capabilities for stats endpoints
      const platformCapabilities = {
        'instagram': {
          posts: true,
          comments: true,
          reels: false,
          profiles: false
        },
        'facebook': {
          posts: true,
          comments: true,
          reels: false,
          profiles: false
        },
        'linkedin': {
          posts: true,
          comments: false,
          reels: false,
          profiles: false
        },
        'tiktok': {
          posts: true,
          comments: false,
          reels: false,
          profiles: false
        }
      } as const;

      const capabilities = (platformCapabilities as any)[platform] || platformCapabilities['instagram'];
      
      // Use different endpoint based on folder category
      if (folder.category === 'comments') {
        console.log('📈 Fetching comments folder stats...');
        
        if (capabilities.comments) {
          // Platform supports comments stats endpoint
          // For comments stats, we don't need projectParam since we're filtering by folder_id
          const statsApiUrl = `/api/${platform}-data/comments/stats/?${folderParam}`;
          console.log('📈 Fetching comments stats from:', statsApiUrl);
          
          const response = await apiFetch(statsApiUrl);
          console.log('📈 Comments stats API response status:', response.status, 'OK:', response.ok);
          
          if (!response.ok) {
            throw new Error('Failed to fetch comments folder statistics');
          }
          
          const data = await response.json();
          console.log('📈 Comments stats API response data:', data);
          
          const rawStatsData = {
            totalComments: data.totalComments || 0,
            uniqueCommenters: data.uniqueCommenters || 0,
            avgLikes: data.avgLikes || 0,
            avgReplies: data.avgReplies || 0,
            verifiedAccounts: 0,
            platform: platform
          };
          
          const statsData = statsAdapter ? statsAdapter(rawStatsData, folder.category) : {
            totalItems: rawStatsData.totalComments || 0,
            uniqueUsers: rawStatsData.uniqueCommenters || 0,
            avgLikes: Math.round(rawStatsData.avgLikes || 0),
            avgComments: Math.round(rawStatsData.avgReplies || 0),
            verifiedAccounts: rawStatsData.verifiedAccounts || 0,
            platform: platform
          };
          
          // Ensure all stats values are numbers
          const safeStatsData = {
            totalItems: Number(statsData.totalItems) || 0,
            uniqueUsers: Number(statsData.uniqueUsers) || 0,
            avgLikes: Number(statsData.avgLikes) || 0,
            avgComments: Number(statsData.avgComments) || 0,
            verifiedAccounts: Number(statsData.verifiedAccounts) || 0,
            platform: statsData.platform || platform
          };
          
          setStats(safeStatsData);
          console.log('📈 Set comments stats:', safeStatsData);
        } else {
          // Platform doesn't support comments stats - use posts stats as fallback
          console.log('📈 Platform does not support comments stats - using posts stats fallback');
          const fallbackUrl = `/api/${platform}-data/posts/stats/?${folderParam}${projectParam}`;
          console.log('📈 Fetching stats from fallback endpoint:', fallbackUrl);
          
          const response = await apiFetch(fallbackUrl);
          
          if (!response.ok) {
            throw new Error('Failed to fetch folder statistics');
          }
          
          const data = await response.json();
          console.log('📈 Fallback stats API response data:', data);
          
          const rawStatsData = {
            totalPosts: data.totalPosts || 0,
            uniqueUsers: data.uniqueUsers || 0,
            avgLikes: data.avgLikes || 0,
            avgComments: data.avgComments || 0,
            verifiedAccounts: data.verifiedAccounts || 0,
            platform: platform
          };
          
          const statsData = statsAdapter ? statsAdapter(rawStatsData, folder.category) : {
            totalItems: rawStatsData.totalPosts || 0,
            uniqueUsers: rawStatsData.uniqueUsers || 0,
            avgLikes: Math.round(rawStatsData.avgLikes || 0),
            avgComments: Math.round(rawStatsData.avgComments || 0),
            verifiedAccounts: rawStatsData.verifiedAccounts || 0,
            platform: platform
          };
          
          // Ensure all stats values are numbers
          const safeStatsData = {
            totalItems: Number(statsData.totalItems) || 0,
            uniqueUsers: Number(statsData.uniqueUsers) || 0,
            avgLikes: Number(statsData.avgLikes) || 0,
            avgComments: Number(statsData.avgComments) || 0,
            verifiedAccounts: Number(statsData.verifiedAccounts) || 0,
            platform: statsData.platform || platform
          };
          
          setStats(safeStatsData);
          console.log('📈 Set fallback stats:', safeStatsData);
        }
        
      } else {
        // For posts/reels/profiles folders, use the posts stats endpoint
        console.log('📈 Fetching posts folder stats...');
        const statsApiUrl = `/api/${platform}-data/posts/stats/?${folderParam}${projectParam}`;
        console.log('📈 Fetching posts stats from:', statsApiUrl);
        
        const response = await apiFetch(statsApiUrl);
        console.log('📈 Posts stats API response status:', response.status, 'OK:', response.ok);
        
        if (!response.ok) {
          throw new Error('Failed to fetch posts folder statistics');
        }
        
        const data = await response.json();
        console.log('📈 Posts stats API response data:', data);
        
        const rawStatsData = {
          totalPosts: data.totalPosts || 0,
          uniqueUsers: data.uniqueUsers || 0,
          avgLikes: data.avgLikes || 0,
          avgComments: data.avgComments || 0,
          verifiedAccounts: data.verifiedAccounts || 0,
          platform: platform
        };
        
        const statsData = statsAdapter ? statsAdapter(rawStatsData, folder.category) : {
          totalItems: rawStatsData.totalPosts || 0,
          uniqueUsers: rawStatsData.uniqueUsers || 0,
          avgLikes: Math.round(rawStatsData.avgLikes || 0),
          avgComments: Math.round(rawStatsData.avgComments || 0),
          verifiedAccounts: rawStatsData.verifiedAccounts || 0,
          platform: platform
        };
        
        // Ensure all stats values are numbers
        const safeStatsData = {
          totalItems: Number(statsData.totalItems) || 0,
          uniqueUsers: Number(statsData.uniqueUsers) || 0,
          avgLikes: Number(statsData.avgLikes) || 0,
          avgComments: Number(statsData.avgComments) || 0,
          verifiedAccounts: Number(statsData.verifiedAccounts) || 0,
          platform: statsData.platform || platform
        };
        
        setStats(safeStatsData);
        
        console.log('📈 Set posts stats:', safeStatsData);
      }
    } catch (error) {
      console.error('Error fetching folder statistics:', error);
    }
  };

  // Fetch webhook status
  const fetchWebhookStatus = async () => {
    try {
      const response = await apiFetch(`/api/${platform}-data/folders/${folder.id}/webhook-status/`);
      
      if (response.ok) {
        const result = await response.json();
        setWebhookStatus(result);
      }
    } catch (error) {
      console.error('Error fetching webhook status:', error);
    }
  };

  // Load data on component mount and when sorting/filtering changes
  useEffect(() => {
    // If we have direct data props, use them instead of fetching
    if (propData && disableApiFetch) {
      setData(propData);
      setTotalCount(propData.length);
      setLoading(false);
      return;
    }
    
    // Only fetch if we have a valid folder
    if (folder && folder.id) {
      if (!disableApiFetch) {
        // Check if there are actual filter values to apply
        const hasFilterValues = Boolean(startDate || endDate || minLikes || maxLikes);
        fetchData(page, rowsPerPage, searchTerm, hasFilterValues);
        fetchWebhookStatus();
      }
      // Always call fetchStats to handle propStats when disableApiFetch is true
      fetchStats();
    }
  }, [page, rowsPerPage, searchTerm, sortBy, sortOrder, startDate, endDate, minLikes, maxLikes, folder.id, platform, propData, disableApiFetch]);

  // Effect to handle propStats when they change
  useEffect(() => {
    if (propStats && disableApiFetch) {
      setStats(propStats);
    }
  }, [propStats, disableApiFetch]);

  // Event handlers
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
    // No need to call fetchData here, it will be triggered by the useEffect
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0); // Reset to first page
    // No need to call fetchData here, it will be triggered by the useEffect
  };

  const handleSort = (field: string) => {
    const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    
    setSortBy(field);
    setSortOrder(newOrder);
    // No need to call fetchData here, it will be triggered by the useEffect
  };

  const handleSortSelectChange = (event: SelectChangeEvent) => {
    const field = event.target.value;
    
    // Always set the new field, default to descending
    setSortBy(field);
    setSortOrder('desc');
    // No need to call fetchData here, it will be triggered by the useEffect
  };

  const handleSortItemClick = (field: string) => {
    // If clicking the same field, toggle the order
    if (sortBy === field) {
      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      setSortOrder(newOrder);
    } else {
      // If selecting a new field, set it with default descending order
      setSortBy(field);
      setSortOrder('desc');
    }
    // No need to call fetchData here, it will be triggered by the useEffect
  };

  const handleFilterToggle = () => {
    setShowFilters(!showFilters);
  };

  const handleApplyFilters = () => {
    // No need to call fetchData here, it will be triggered by the useEffect
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setMinLikes('');
    setMaxLikes('');
    // No need to call fetchData here, it will be triggered by the useEffect
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setSnackbarMessage('Link copied to clipboard');
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // Upload handlers
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
      setUploadSuccess(null);
    }
  };

  const validateCsvFile = async (file: File): Promise<{valid: boolean, message?: string}> => {
    if (!file) {
      return { valid: false, message: 'No file selected' };
    }
    
    // Check file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'csv') {
      return { valid: false, message: 'File must be a CSV' };
    }
    
    // Basic check on file size
    if (file.size === 0) {
      return { valid: false, message: 'File is empty' };
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB
      return { valid: false, message: 'File is too large (max 50MB)' };
    }
    
    // Basic check for CSV content
    try {
      const sample = await file.slice(0, 1000).text();
      const lines = sample.split('\n');
      
      if (lines.length < 2) {
        return { valid: false, message: 'CSV must contain at least a header row and one data row' };
      }
      
      const header = lines[0].toLowerCase();
      
      // Check for required columns in the header
      const requiredColumns = ['url']; // Only require URL field
      for (const column of requiredColumns) {
        if (!header.includes(column)) {
          return { 
            valid: false, 
            message: `CSV is missing required column: ${column}. Please check the file format.` 
          };
        }
      }
      
      return { valid: true };
    } catch (error) {
      console.error('Error validating file:', error);
      return { valid: false, message: 'Error validating file. Please check the format.' };
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a CSV file to upload');
      return;
    }

    if (!selectedFile.name.endsWith('.csv')) {
      setUploadError('Please upload a CSV file');
      return;
    }
    
    // Validate CSV before uploading
    try {
      const validationResult = await validateCsvFile(selectedFile);
      if (!validationResult.valid) {
        setUploadError(validationResult.message || 'CSV validation failed');
        return;
      }
    } catch (error) {
      console.error('Validation error:', error);
      // Continue with upload despite validation error
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    
    // Add folder_id to the form data
    formData.append('folder_id', folder.id.toString());

    try {
      setUploadLoading(true);
      setUploadError(null); // Clear previous errors
      
      // Define platform capabilities for upload endpoints
      const platformCapabilities = {
        'instagram': {
          posts: true,
          comments: true,
          reels: false,
          profiles: false
        },
        'facebook': {
          posts: true,
          comments: true,
          reels: false,
          profiles: false
        },
        'linkedin': {
          posts: true,
          comments: false,
          reels: false,
          profiles: false
        },
        'tiktok': {
          posts: true,
          comments: false,
          reels: false,
          profiles: false
        }
      } as const;

      const capabilities = (platformCapabilities as any)[platform] || platformCapabilities['instagram'];
      
      // Determine the correct upload endpoint based on folder category and platform capabilities
      let uploadEndpoint = `/api/${platform}-data/posts/upload_csv/`;
      
      // Enhanced debugging and validation
      console.log('🔧 Upload Debug Info:');
      console.log('🔧 Platform:', platform);
      console.log('🔧 Platform capabilities:', capabilities);
      console.log('🔧 Folder ID:', folder.id);
      console.log('🔧 Folder category:', folder.category);
      console.log('🔧 File being uploaded:', selectedFile?.name);
      console.log('🔧 File size:', selectedFile?.size);
      
      if (folder.category === 'comments') {
        if (capabilities.comments) {
          uploadEndpoint = `/api/${platform}-data/comments/upload_csv/`;
          console.log('🔧 DETECTED COMMENTS FOLDER - Platform supports comments endpoint');
        } else {
          console.log('🔧 DETECTED COMMENTS FOLDER - Platform does not support comments endpoint, using posts endpoint');
          uploadEndpoint = `/api/${platform}-data/posts/upload_csv/`;
        }
      } else if (folder.category === 'reels') {
        if (capabilities.reels) {
          uploadEndpoint = `/api/${platform}-data/reels/upload_csv/`;
          console.log('🔧 DETECTED REELS FOLDER - Platform supports reels endpoint');
        } else {
          console.log('🔧 DETECTED REELS FOLDER - Platform does not support reels endpoint, using posts endpoint');
          uploadEndpoint = `/api/${platform}-data/posts/upload_csv/`;
        }
      } else if (folder.category === 'profiles') {
        if (capabilities.profiles) {
          uploadEndpoint = `/api/${platform}-data/profiles/upload_csv/`;
          console.log('🔧 DETECTED PROFILES FOLDER - Platform supports profiles endpoint');
        } else {
          console.log('🔧 DETECTED PROFILES FOLDER - Platform does not support profiles endpoint, using posts endpoint');
          uploadEndpoint = `/api/${platform}-data/posts/upload_csv/`;
        }
      } else {
        console.log('🔧 Using posts endpoint (folder category is posts or fallback)');
      }
      
      console.log('🔧 Final upload endpoint:', uploadEndpoint);
      
      // Check if the backend server is running
      try {
        const response = await apiFetch(uploadEndpoint, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          },
        });

        console.log('🔧 Upload response status:', response.status);
        console.log('🔧 Upload response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.log('🔧 Upload error response text:', errorText);
          
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText };
          }
          
          // Check for specific error messages
          let errorMessage = errorData.error || 'Upload failed';
          
          // Format array error messages more nicely
          if (Array.isArray(errorMessage)) {
            errorMessage = errorMessage.join('\n');
          }
          
          // Show a more user-friendly message for date format errors
          if ((typeof errorMessage === 'string') && 
              (errorMessage.includes('invalid format') || errorMessage.includes('YYYY-MM-DD'))) {
            throw new Error('Your CSV file contains dates in an invalid format. Please check that dates use a standard format like YYYY-MM-DD.');
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('🔧 Upload success response:', data);
        
        let successMessage = `${data.message}`;
        
        if (data.detected_content_type) {
          successMessage += ` Content type detected: ${data.detected_content_type}`;
        }
        
        setUploadSuccess(successMessage);
        
        // Reset pagination to first page to see new data
        setPage(0);
        
        // Clear any existing search/filters to show all new data
        setSearchTerm('');
        
        // Clear any previous error states
        setUploadError(null);
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setUploadSuccess(null);
        }, 5000);
        
        // Reset file input
        setSelectedFile(null);
        
        // Reset file input element
        const fileInput = document.getElementById('csv-file-upload') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      } catch (networkError) {
        console.error('Network error:', networkError);
        console.log('🔧 Network error details:', {
          name: networkError instanceof Error ? networkError.name : 'Unknown',
          message: networkError instanceof Error ? networkError.message : String(networkError),
          stack: networkError instanceof Error ? networkError.stack : undefined
        });
        
        // Show more helpful error message
        if (networkError instanceof TypeError && networkError.message.includes('Failed to fetch')) {
          throw new Error('Failed to connect to the server. Please check if the backend server is running and try again.');
        } else {
          throw networkError;
        }
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'An error occurred during upload');
    } finally {
      setUploadLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Get sortable fields based on folder category
  const getSortableFields = () => {
    switch (folder.category) {
      case 'comments':
        return [
          { value: 'comment_date', label: 'Date' },
          { value: 'likes_number', label: 'Likes' },
          { value: 'comment_user', label: 'Comment User' },
          { value: 'post_user', label: 'Post User' },
          { value: 'replies_number', label: 'Replies' }
        ];
      
      case 'reels':
        return [
          { value: 'date_posted', label: 'Date' },
          { value: 'likes', label: 'Likes' },
          { value: 'num_comments', label: 'Comments' },
          { value: 'views', label: 'Views' },
          { value: 'shares', label: 'Shares' },
          { value: 'user_posted', label: 'User' }
        ];
      
      case 'profiles':
        return [
          { value: 'followers', label: 'Followers' },
          { value: 'posts_count', label: 'Posts Count' },
          { value: 'likes', label: 'Total Likes' },
          { value: 'num_comments', label: 'Total Comments' },
          { value: 'user_posted', label: 'Username' }
        ];
      
      case 'posts':
      default:
        return [
          { value: 'date_posted', label: 'Date' },
          { value: 'likes', label: 'Likes' },
          { value: 'user_posted', label: 'User' },
          { value: 'num_comments', label: 'Comments' }
        ];
    }
  };

  // Get display fields for table based on folder category
  const getDisplayFields = () => {
    switch (folder.category) {
      case 'comments':
        return [
          { key: 'content', label: 'Comment', width: '50%' },
          { key: 'user', label: 'Comment User', width: '15%' },
          { key: 'post_user', label: 'Post User', width: '15%' },
          { key: 'date', label: 'Date', width: '10%' },
          { key: 'likes', label: 'Likes', width: '5%', align: 'right' },
          { key: 'replies_number', label: 'Replies', width: '5%', align: 'right' }
        ];
      
      case 'reels':
        return [
          { key: 'content', label: 'Content', width: '45%' },
          { key: 'user', label: 'User', width: '15%' },
          { key: 'date', label: 'Date', width: '10%' },
          { key: 'likes', label: 'Likes', width: '8%', align: 'right' },
          { key: 'comments', label: 'Comments', width: '8%', align: 'right' },
          { key: 'views', label: 'Views', width: '8%', align: 'right' },
          { key: 'shares', label: 'Shares', width: '6%', align: 'right' }
        ];
      
      case 'profiles':
        return [
          { key: 'user', label: 'Username', width: '25%' },
          { key: 'followers', label: 'Followers', width: '15%', align: 'right' },
          { key: 'posts_count', label: 'Posts', width: '10%', align: 'right' },
          { key: 'likes', label: 'Total Likes', width: '15%', align: 'right' },
          { key: 'comments', label: 'Total Comments', width: '15%', align: 'right' },
          { key: 'is_verified', label: 'Verified', width: '10%', align: 'center' },
          { key: 'is_paid_partnership', label: 'Paid Partnership', width: '10%', align: 'center' }
        ];
      
      case 'posts':
      default:
        return [
          { key: 'content', label: 'Content', width: '55%' },
          { key: 'user', label: 'User', width: '18%' },
          { key: 'date', label: 'Date', width: '10%' },
          { key: 'likes', label: 'Likes', width: '5%', align: 'right' },
          { key: 'comments', label: 'Comments', width: '5%', align: 'right' }
        ];
    }
  };

  console.log('🔍 Component render state:', { loading, dataLength: data.length, error, folder: folder?.name, platform });
  
  if (loading && data.length === 0) {
    console.log('🔍 Showing loading spinner');
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Debug: Show message if no data and no error
  if (!loading && data.length === 0 && !error) {
    console.log('🔍 No data, no error, not loading - showing empty state');
  }
  
  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body1" fontWeight={500}>Error Loading Data</Typography>
          <Typography variant="body2">{error}</Typography>
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            Platform: {platform} | Category: {folder.category} | Folder ID: {folder.id}
          </Typography>
        </Alert>
      )}

      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {onBackNavigation && (
              <IconButton
                onClick={onBackNavigation}
                sx={{ 
                  color: 'primary.main',
                  '&:hover': { 
                    backgroundColor: 'primary.light',
                    color: 'white'
                  }
                }}
                size="small"
              >
                <ArrowBackIcon />
              </IconButton>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box>
                <Typography variant="h4" component="h1" fontWeight={600} sx={{ mb: 1 }}>
                  {folder.name}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {folder.description || `${folder.category_display || folder.category} data analysis`}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={onRefresh || (() => {
                // No need to call fetchData here, it will be triggered by the useEffect
                fetchStats();
              })}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<GetAppIcon />}
              onClick={onExport || (() => {})}
            >
              Export CSV
            </Button>
          </Box>
        </Box>

        {/* Status Chips */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <Chip 
            label={`${folder.category_display || folder.category} • ${platform}`} 
            color="success" 
            variant="outlined"
            size="small"
          />
        </Box>

        {/* Statistics Overview */}
        <Paper sx={{ px: 3, py: 2, mb: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Data Overview
            </Typography>
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr 1fr' }, gap: 4, py: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <AnalyticsIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h4" fontWeight={600}>
                  {(stats.totalItems || 0).toLocaleString()}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total {folder.category === 'comments'
                  ? 'Comments'
                  : folder.category === 'reels'
                  ? 'Reels'
                  : folder.category === 'profiles'
                  ? 'Profiles'
                  : 'Posts'}
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <GroupIcon sx={{ color: 'secondary.main', mr: 1 }} />
                <Typography variant="h4" fontWeight={600}>
                  {(stats.uniqueUsers || 0).toLocaleString()}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Unique Users
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <ThumbUpIcon sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h4" fontWeight={600}>
                  {(stats.avgLikes || 0).toLocaleString()}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Avg. Likes
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <ChatIcon sx={{ color: 'info.main', mr: 1 }} />
                <Typography variant="h4" fontWeight={600}>
                  {(stats.avgComments || 0).toLocaleString()}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Avg. {folder.category === 'comments' ? 'Replies' : 'Comments'}
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <VerifiedIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h4" fontWeight={600}>
                  {(stats.verifiedAccounts || 0).toLocaleString()}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Verified Accounts
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Tabs Section */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="universal data tabs">
            <Tab label="Data Overview" {...a11yProps(0)} />
          </Tabs>
        </Box>
        
        {/* Tab Panel 0: Data Overview */}
        <TabPanel value={tabValue} index={0}>
          {/* Search and Filter Controls */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
            <TextField
              placeholder="Search content, users, or keywords..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1, maxWidth: 400 }}
            />
            
            {/* Sort Dropdown */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              py: 0.75,
              px: 2,
              borderRadius: 2,
              bgcolor: 'rgba(0, 0, 0, 0.03)'
            }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                Sort by:
              </Typography>
              <Select
                value={sortBy}
                onChange={handleSortSelectChange}
                size="small"
                variant="standard"
                disableUnderline
                sx={{ 
                  minWidth: 140,
                  '& .MuiSelect-select': {
                    fontWeight: 500,
                    py: 0,
                    color: theme => theme.palette.primary.main
                  }
                }}
                renderValue={(value) => {
                  if (!value) {
                    return '[Select]';
                  }
                  const getDisplayName = (field: string) => {
                    const sortableFields = getSortableFields();
                    const fieldObj = sortableFields.find(f => f.value === field);
                    if (fieldObj) {
                      return `${fieldObj.label} (${sortOrder === 'asc' ? 'Asc' : 'Desc'})`;
                    }
                    return '[Select]';
                  };
                  return getDisplayName(value);
                }}
              >
                {getSortableFields().map((field) => (
                  <MenuItem 
                    key={field.value} 
                    value={field.value}
                    onClick={() => handleSortItemClick(field.value)}
                  >
                    {field.label}
                  </MenuItem>
                ))}
              </Select>
            </Box>
            
            <Tooltip title="Filter data">
              <IconButton onClick={handleFilterToggle}>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Filter Controls */}
          <Collapse in={showFilters}>
            <Paper sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <FilterListIcon sx={{ mr: 1 }} />
                Filter Options
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <DateRangeIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                
                <TextField
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <DateRangeIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                
                <TextField
                  label="Min Likes"
                  type="number"
                  value={minLikes}
                  onChange={(e) => setMinLikes(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ThumbUpIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                
                <TextField
                  label="Max Likes"
                  type="number"
                  value={maxLikes}
                  onChange={(e) => setMaxLikes(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ThumbUpIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleApplyFilters}
                  disabled={loading}
                  startIcon={<FilterListIcon />}
                >
                  Apply Filters
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleClearFilters}
                  disabled={loading}
                >
                  Clear Filters
                </Button>
              </Box>
            </Paper>
          </Collapse>

          {/* Data Table */}
          <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Table stickyHeader sx={{ tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  {getDisplayFields().map((field) => (
                    <TableCell 
                      key={field.key}
                      sx={{ 
                        fontWeight: 600, 
                        width: field.width,
                        textAlign: field.align || 'left'
                      }}
                    >
                      {field.label}
                    </TableCell>
                  ))}
                  <TableCell sx={{ fontWeight: 600, width: '8%', pl: 3 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={getDisplayFields().length + 1} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={40} />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Loading data...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={getDisplayFields().length + 1} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No data found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                                     data.map((item) => (
                     <TableRow key={item.id} hover sx={{ '&:hover': { backgroundColor: 'grey.50' } }}>
                       {getDisplayFields().map((field) => (
                         <TableCell 
                           key={field.key} 
                           sx={{ width: field.width, textAlign: field.align || 'left' }}
                         >
                           {(() => {
                             switch (field.key) {
                               case 'content':
                                 return (
                                   <Typography variant="body2" sx={{ 
                                     maxWidth: '100%',
                                     display: '-webkit-box',
                                     WebkitLineClamp: 3,
                                     WebkitBoxOrient: 'vertical',
                                     overflow: 'hidden',
                                     textOverflow: 'ellipsis',
                                     lineHeight: 1.4
                                   }}>
                                     {item.content || 'No content'}
                                   </Typography>
                                 );
                               
                               case 'user':
                                 return (
                                   <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                                     <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem', flexShrink: 0 }}>
                                       {(item.user || 'U').charAt(0).toUpperCase()}
                                     </Avatar>
                                     <Box sx={{ minWidth: 0, flex: 1 }}>
                                       <Typography variant="body2" fontWeight={500} sx={{ 
                                         overflow: 'hidden',
                                         textOverflow: 'ellipsis',
                                         whiteSpace: 'nowrap'
                                       }}>
                                         {item.user || 'Unknown User'}
                                       </Typography>
                                       {item.is_verified === true && (
                                         <Chip 
                                           size="small" 
                                           color="primary" 
                                           label="Verified" 
                                           sx={{ mt: 0.5, height: 16, fontSize: '0.75rem' }}
                                         />
                                       )}
                                     </Box>
                                   </Box>
                                 );
                               
                               case 'post_user':
                                 return (
                                   <Typography variant="body2" sx={{ 
                                     overflow: 'hidden',
                                     textOverflow: 'ellipsis',
                                     whiteSpace: 'nowrap'
                                   }}>
                                     {item.post_user || 'Unknown'}
                                   </Typography>
                                 );
                               
                               case 'date':
                                 return (
                                   <Typography variant="body2" noWrap>
                                     {item.date ? formatDate(item.date) : 'Unknown'}
                                   </Typography>
                                 );
                               
                               case 'likes':
                                 return (
                                   <Typography variant="body2" fontWeight={500}>
                                     {(item.likes || 0).toLocaleString()}
                                   </Typography>
                                 );
                               
                               case 'comments':
                                 return (
                                   <Typography variant="body2" fontWeight={500}>
                                     {(item.comments || 0).toLocaleString()}
                                   </Typography>
                                 );
                               
                               case 'replies_number':
                                 return (
                                   <Typography variant="body2" fontWeight={500}>
                                     {(item.replies_number || 0).toLocaleString()}
                                   </Typography>
                                 );
                               
                               case 'views':
                                 return (
                                   <Typography variant="body2" fontWeight={500}>
                                     {(item.views || 0).toLocaleString()}
                                   </Typography>
                                 );
                               
                               case 'shares':
                                 return (
                                   <Typography variant="body2" fontWeight={500}>
                                     {(item.shares || 0).toLocaleString()}
                                   </Typography>
                                 );
                               
                               case 'followers':
                                 return (
                                   <Typography variant="body2" fontWeight={500}>
                                     {(item.followers || 0).toLocaleString()}
                                   </Typography>
                                 );
                               
                               case 'posts_count':
                                 return (
                                   <Typography variant="body2" fontWeight={500}>
                                     {(item.posts_count || 0).toLocaleString()}
                                   </Typography>
                                 );
                               
                               case 'is_verified':
                                 return (
                                   <Box sx={{ textAlign: 'center' }}>
                                     {item.is_verified ? (
                                       <Chip size="small" color="success" label="Yes" />
                                     ) : (
                                       <Chip size="small" color="default" label="No" />
                                     )}
                                   </Box>
                                 );
                               
                               case 'is_paid_partnership':
                                 return (
                                   <Box sx={{ textAlign: 'center' }}>
                                     {item.is_paid_partnership ? (
                                       <Chip size="small" color="warning" label="Yes" />
                                     ) : (
                                       <Chip size="small" color="default" label="No" />
                                     )}
                                   </Box>
                                 );
                               
                               default:
                                 return (
                                   <Typography variant="body2">
                                     {String(item[field.key as keyof UniversalDataItem] || 'N/A')}
                                   </Typography>
                                 );
                             }
                           })()}
                         </TableCell>
                       ))}
                       <TableCell sx={{ width: '8%', pl: 3 }}>
                         <Box sx={{ display: 'flex', gap: 0.5 }}>
                           <Tooltip title="Open Content">
                             <IconButton 
                               size="small" 
                               onClick={() => window.open(item.url, '_blank')}
                             >
                               <OpenInNewIcon fontSize="small" />
                             </IconButton>
                           </Tooltip>
                           <Tooltip title="Copy Link">
                             <IconButton 
                               size="small" 
                               onClick={() => handleCopyLink(item.url)}
                             >
                               <ContentCopyIcon fontSize="small" />
                             </IconButton>
                           </Tooltip>
                         </Box>
                       </TableCell>
                     </TableRow>
                   ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TabPanel>

        {/* Tab Panel 1: Upload & Management */}
        <TabPanel value={tabValue} index={1}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
              <CloudUploadIcon sx={{ mr: 1 }} />
              Upload CSV Data
            </Typography>

            {/* Upload Status Messages */}
            {uploadError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {uploadError}
              </Alert>
            )}

            {uploadSuccess && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {uploadSuccess}
              </Alert>
            )}

            {/* File Upload Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Upload {platform} Data
              </Typography>
              
              <Box sx={{ 
                border: '2px dashed', 
                borderColor: 'grey.300', 
                borderRadius: 2, 
                p: 3, 
                textAlign: 'center',
                mb: 2,
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover'
                }
              }}>
                <input
                  accept=".csv"
                  style={{ display: 'none' }}
                  id="csv-file-upload"
                  type="file"
                  onChange={handleFileChange}
                  disabled={uploadLoading}
                />
                <label htmlFor="csv-file-upload">
                  <Button
                    component="span"
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    disabled={uploadLoading}
                    sx={{ mb: 2 }}
                  >
                    Select CSV File
                  </Button>
                </label>
                
                {selectedFile && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="primary">
                      Selected: {selectedFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </Box>
                )}
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Supported format: CSV with columns: url, user, date, likes, comments
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadLoading}
                  startIcon={uploadLoading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                >
                  {uploadLoading ? 'Uploading...' : 'Upload Data'}
                </Button>
                
                {selectedFile && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setSelectedFile(null);
                      setUploadError(null);
                      setUploadSuccess(null);
                    }}
                    disabled={uploadLoading}
                  >
                    Clear Selection
                  </Button>
                )}
              </Box>
            </Box>

            {/* Upload Guidelines */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">
                  CSV Upload Guidelines
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ pl: 2 }}>
                                   <Typography variant="body2" sx={{ mb: 2 }}>
                   <strong>Required CSV Format for {folder.category_display}:</strong>
                 </Typography>
                 <Typography variant="body2" component="div" sx={{ mb: 2 }}>
                   Your CSV file should include the following columns:
                 </Typography>
                 <List dense>
                   <ListItem>
                     <ListItemText 
                       primary="url" 
                       secondary="The URL of the content (required)"
                     />
                   </ListItem>
                   <ListItem>
                     <ListItemText 
                       primary="Additional columns" 
                       secondary="Any other columns will be automatically detected and processed based on the folder category"
                     />
                   </ListItem>
                 </List>
                  
                                     <Typography variant="body2" sx={{ mt: 2 }}>
                     <strong>Example CSV for {folder.category_display}:</strong>
                   </Typography>
                   <Box sx={{ 
                     backgroundColor: 'grey.100', 
                     p: 2, 
                     borderRadius: 1, 
                     fontFamily: 'monospace',
                     fontSize: '0.875rem'
                   }}>
                     {(() => {
                       switch (folder.category) {
                         case 'comments':
                           return (
                             <>
                               url,comment,comment_user,comment_date,post_user,likes_number,replies_number<br/>
                               https://example.com/comment1,Great post!,user1,2024-01-15,postauthor,15,3<br/>
                               https://example.com/comment2,Amazing content,user2,2024-01-16,postauthor,8,1
                             </>
                           );
                         
                         case 'reels':
                           return (
                             <>
                               url,user_posted,description,date_posted,likes,num_comments,views,shares<br/>
                               https://example.com/reel1,user1,Check out this amazing reel!,2024-01-15,150,25,1000,50<br/>
                               https://example.com/reel2,user2,Another great video,2024-01-16,200,30,1500,75
                             </>
                           );
                         
                         case 'profiles':
                           return (
                             <>
                               url,user_posted,followers,posts_count,is_verified,is_paid_partnership<br/>
                               https://example.com/profile1,user1,5000,150,true,false<br/>
                               https://example.com/profile2,user2,3000,100,false,true
                             </>
                           );
                         
                         case 'posts':
                         default:
                           return (
                             <>
                               url,user_posted,description,date_posted,likes,num_comments,hashtags<br/>
                               https://example.com/post1,user1,Check out this amazing post!,2024-01-15,150,25,#amazing #content<br/>
                               https://example.com/post2,user2,Another great post,2024-01-16,200,30,#great #post
                             </>
                           );
                       }
                     })()}
                   </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Paper>
        </TabPanel>

        {/* Tab Panel 2: Webhook Status */}
        <TabPanel value={tabValue} index={2}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
              <WebhookIcon sx={{ mr: 1 }} />
              Webhook Status
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="primary">
                    {webhookStatus.isActive ? 'Active' : 'Inactive'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent>
                  <Typography variant="h6">
                                            {(webhookStatus.totalRequests || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Requests
                  </Typography>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent>
                  <Typography variant="h6">
                    {webhookStatus.successRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Success Rate
                  </Typography>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent>
                  <Typography variant="h6">
                    {webhookStatus.averageResponseTime.toFixed(0)}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Response Time
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            
            {webhookStatus.lastUpdate && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Last Update: {formatDate(webhookStatus.lastUpdate)}
                </Typography>
              </Box>
            )}
          </Paper>
        </TabPanel>
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
      />
    </Container>
  );
};

export default UniversalDataDisplay; 