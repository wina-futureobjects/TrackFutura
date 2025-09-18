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
  Checkbox,
  FormControlLabel,
  FormGroup,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Collapse,
  Badge
} from '@mui/material';
import {
  Facebook,
  Instagram,
  LinkedIn,
  MusicVideo as TikTokIcon,
  ExpandMore,
  ExpandLess,
  Search as SearchIcon,
  FilterList as FilterIcon,
  AccountBox,
  Folder,
  SelectAll,
  Clear,
  CheckCircle,
  Info,
  Dataset,
  Analytics,
  Assessment
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';

interface DataSource {
  id: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'tiktok';
  name: string;
  type: 'account' | 'folder' | 'dataset';
  posts_count: number;
  comments_count: number;
  last_updated: string;
  selected: boolean;
  metrics?: {
    engagement_rate?: number;
    followers?: number;
    impressions?: number;
  };
}

interface PlatformSection {
  platform: 'facebook' | 'instagram' | 'linkedin' | 'tiktok';
  name: string;
  icon: React.ReactNode;
  color: string;
  expanded: boolean;
  sources: DataSource[];
}

const mockDataSources: PlatformSection[] = [
  {
    platform: 'facebook',
    name: 'Facebook',
    icon: <Facebook />,
    color: '#1877F2',
    expanded: true,
    sources: [
      {
        id: 'fb_1',
        platform: 'facebook',
        name: 'Brand Official Page',
        type: 'account',
        posts_count: 245,
        comments_count: 1834,
        last_updated: '2024-12-15T10:30:00Z',
        selected: false,
        metrics: { engagement_rate: 4.2, followers: 15420 }
      },
      {
        id: 'fb_2',
        platform: 'facebook',
        name: 'Q4 Campaign Data',
        type: 'folder',
        posts_count: 89,
        comments_count: 567,
        last_updated: '2024-12-14T16:45:00Z',
        selected: false
      },
      {
        id: 'fb_3',
        platform: 'facebook',
        name: 'Customer Reviews Dataset',
        type: 'dataset',
        posts_count: 0,
        comments_count: 3421,
        last_updated: '2024-12-13T09:15:00Z',
        selected: false
      }
    ]
  },
  {
    platform: 'instagram',
    name: 'Instagram',
    icon: <Instagram />,
    color: '#E4405F',
    expanded: false,
    sources: [
      {
        id: 'ig_1',
        platform: 'instagram',
        name: '@brandofficial',
        type: 'account',
        posts_count: 324,
        comments_count: 2156,
        last_updated: '2024-12-15T12:20:00Z',
        selected: false,
        metrics: { engagement_rate: 6.8, followers: 28340 }
      },
      {
        id: 'ig_2',
        platform: 'instagram',
        name: 'Holiday Campaign',
        type: 'folder',
        posts_count: 56,
        comments_count: 789,
        last_updated: '2024-12-14T18:30:00Z',
        selected: false
      }
    ]
  },
  {
    platform: 'linkedin',
    name: 'LinkedIn',
    icon: <LinkedIn />,
    color: '#0A66C2',
    expanded: false,
    sources: [
      {
        id: 'li_1',
        platform: 'linkedin',
        name: 'Company Page',
        type: 'account',
        posts_count: 156,
        comments_count: 892,
        last_updated: '2024-12-15T08:45:00Z',
        selected: false,
        metrics: { engagement_rate: 3.2, followers: 8940 }
      }
    ]
  },
  {
    platform: 'tiktok',
    name: 'TikTok',
    icon: <TikTokIcon />,
    color: '#000000',
    expanded: false,
    sources: [
      {
        id: 'tt_1',
        platform: 'tiktok',
        name: '@brandtiktok',
        type: 'account',
        posts_count: 89,
        comments_count: 4567,
        last_updated: '2024-12-15T14:10:00Z',
        selected: false,
        metrics: { engagement_rate: 12.4, followers: 45230 }
      }
    ]
  }
];

const InputSelection: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId, projectId } = useParams();
  
  const [platforms, setPlatforms] = useState<PlatformSection[]>(mockDataSources);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('info');

  // Calculate selection statistics
  const totalSources = platforms.reduce((sum, platform) => sum + platform.sources.length, 0);
  const selectedSources = platforms.reduce((sum, platform) => 
    sum + platform.sources.filter(source => source.selected).length, 0
  );

  const handlePlatformToggle = useCallback((platformName: string) => {
    setPlatforms(prev => prev.map(platform => 
      platform.platform === platformName 
        ? { ...platform, expanded: !platform.expanded }
        : platform
    ));
  }, []);

  const handleSourceToggle = useCallback((sourceId: string) => {
    setPlatforms(prev => prev.map(platform => ({
      ...platform,
      sources: platform.sources.map(source => 
        source.id === sourceId 
          ? { ...source, selected: !source.selected }
          : source
      )
    })));
  }, []);

  const handleSelectAll = useCallback(() => {
    setPlatforms(prev => prev.map(platform => ({
      ...platform,
      sources: platform.sources.map(source => ({ ...source, selected: true }))
    })));
    
    setSnackbarMessage('All data sources selected');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);
  }, []);

  const handleClearAll = useCallback(() => {
    setPlatforms(prev => prev.map(platform => ({
      ...platform,
      sources: platform.sources.map(source => ({ ...source, selected: false }))
    })));
    
    setSnackbarMessage('All selections cleared');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);
  }, []);

  const handleProceedToReports = useCallback(() => {
    if (selectedSources === 0) {
      setSnackbarMessage('Please select at least one data source');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setLoading(true);
    
    // Simulate processing
    setTimeout(() => {
      setLoading(false);
      // Navigate to Report Marketplace with selected sources
      const selectedData = platforms
        .flatMap(platform => platform.sources.filter(source => source.selected))
        .map(source => ({ id: source.id, platform: source.platform, name: source.name }));
      
      // Store selection in session storage for the Report Marketplace
      sessionStorage.setItem('selectedDataSources', JSON.stringify(selectedData));
      
      const basePath = organizationId && projectId 
        ? `/organizations/${organizationId}/projects/${projectId}` 
        : '';
      navigate(`${basePath}/report`);
    }, 1500);
  }, [selectedSources, platforms, organizationId, projectId, navigate]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'account': return <AccountBox fontSize="small" />;
      case 'folder': return <Folder fontSize="small" />;
      case 'dataset': return <Dataset fontSize="small" />;
      default: return <Info fontSize="small" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'account': return 'primary';
      case 'folder': return 'secondary';
      case 'dataset': return 'success';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredPlatforms = platforms.map(platform => ({
    ...platform,
    sources: platform.sources.filter(source => 
      source.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }));

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Input Selection
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Select the data sources you want to analyze. Choose from your tracked accounts, 
          folders, and datasets across different social media platforms.
        </Typography>
      </Box>

      {/* Selection Summary */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Selection Summary</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              size="small" 
              onClick={handleSelectAll}
              startIcon={<SelectAll />}
              variant="outlined"
            >
              Select All
            </Button>
            <Button 
              size="small" 
              onClick={handleClearAll}
              startIcon={<Clear />}
              variant="outlined"
              color="secondary"
            >
              Clear All
            </Button>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
          <Chip 
            label={`${selectedSources} of ${totalSources} sources selected`}
            color={selectedSources > 0 ? 'primary' : 'default'}
            icon={<CheckCircle />}
          />
          {selectedSources > 0 && (
            <Button 
              variant="contained" 
              size="large"
              onClick={handleProceedToReports}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Assessment />}
              sx={{ minWidth: 200 }}
            >
              {loading ? 'Processing...' : 'Proceed to Reports'}
            </Button>
          )}
        </Box>
      </Paper>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search data sources..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          size="small"
        />
      </Paper>

      {/* Data Sources by Platform */}
      <Box sx={{ mb: 4 }}>
        {filteredPlatforms.map((platform) => (
          <Paper key={platform.platform} sx={{ mb: 2, overflow: 'hidden' }}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'grey.50',
                borderLeft: `4px solid ${platform.color}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                '&:hover': { bgcolor: 'grey.100' }
              }}
              onClick={() => handlePlatformToggle(platform.platform)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: platform.color, color: 'white', width: 32, height: 32 }}>
                  {platform.icon}
                </Avatar>
                <Typography variant="h6">{platform.name}</Typography>
                <Badge badgeContent={platform.sources.filter(s => s.selected).length} color="primary">
                  <Chip 
                    label={`${platform.sources.length} sources`}
                    size="small"
                    variant="outlined"
                  />
                </Badge>
              </Box>
              <IconButton>
                {platform.expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
            
            <Collapse in={platform.expanded}>
              <List>
                {platform.sources.map((source, index) => (
                  <ListItem
                    key={source.id}
                    sx={{
                      borderBottom: index < platform.sources.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider'
                    }}
                  >
                    <ListItemIcon>
                      <Checkbox
                        checked={source.selected}
                        onChange={() => handleSourceToggle(source.id)}
                        sx={{ '&.Mui-checked': { color: platform.color } }}
                      />
                    </ListItemIcon>
                    
                    <ListItemIcon>
                      <Tooltip title={source.type}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: 'transparent', color: platform.color }}>
                          {getTypeIcon(source.type)}
                        </Avatar>
                      </Tooltip>
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                            {source.name}
                          </Typography>
                          <Chip 
                            label={source.type} 
                            size="small" 
                            variant="outlined"
                            color={getTypeColor(source.type) as any}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Posts: {source.posts_count.toLocaleString()} • 
                            Comments: {source.comments_count.toLocaleString()} • 
                            Updated: {formatDate(source.last_updated)}
                          </Typography>
                          {source.metrics && (
                            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                Engagement: {source.metrics.engagement_rate}%
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Followers: {source.metrics.followers?.toLocaleString()}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
                
                {platform.sources.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography variant="body2" color="text.secondary" align="center">
                          No data sources available for {platform.name}
                        </Typography>
                      }
                    />
                  </ListItem>
                )}
              </List>
            </Collapse>
          </Paper>
        ))}
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default InputSelection;