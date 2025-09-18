import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import UniversalDataDisplay, { 
  UniversalFolder, 
  UniversalDataItem, 
  UniversalFolderStats 
} from '../components/UniversalDataDisplay';
import { apiFetch } from '../utils/api';

// Data adapters for different platforms
const instagramDataAdapter = (rawData: any[], category?: string): UniversalDataItem[] => {
  if (category === 'comments') {
    return rawData.map(item => ({
      id: item.id,
      url: item.url,
      content: item.comment,
      user: item.comment_user,
      date: item.comment_date,
      likes: item.likes_number,
      comments: item.replies_number,
      platform: 'Instagram',
      comment_id: item.comment_id,
      post_url: item.post_url,
      post_user: item.post_user,
      comment_user_url: item.comment_user_url,
      hashtag_comment: item.hashtag_comment,
      metadata: {
        post_id: item.post_id,
        comment_id: item.comment_id
      }
    }));
  }

  return rawData.map(item => ({
    id: item.id,
    url: item.url,
    content: item.description,
    user: item.user_posted,
    date: item.date_posted,
    likes: item.likes,
    comments: item.num_comments,
    platform: 'Instagram',
    content_type: item.content_type,
    thumbnail: item.thumbnail,
    is_verified: item.is_verified,
    followers: item.followers,
    posts_count: item.posts_count,
    is_paid_partnership: item.is_paid_partnership,
    metadata: {
      post_id: item.post_id,
      hashtags: item.hashtags
    }
  }));
};

const facebookDataAdapter = (rawData: any[], category?: string): UniversalDataItem[] => {
  return rawData.map(item => ({
    id: item.id,
    url: item.url,
    content: item.description,
    user: item.user_posted,
    date: item.date_posted,
    likes: item.likes,
    comments: item.num_comments,
    platform: 'Facebook',
    content_type: item.content_type,
    thumbnail: item.thumbnail,
    is_verified: item.is_verified,
    metadata: {
      post_id: item.post_id,
      hashtags: item.hashtags
    }
  }));
};

const linkedinDataAdapter = (rawData: any[], category?: string): UniversalDataItem[] => {
  return rawData.map(item => ({
    id: item.id,
    url: item.url,
    content: item.description,
    user: item.user_posted,
    date: item.date_posted,
    likes: item.likes,
    comments: item.num_comments,
    platform: 'LinkedIn',
    content_type: item.content_type,
    thumbnail: item.thumbnail,
    is_verified: item.is_verified,
    metadata: {
      post_id: item.post_id,
      hashtags: item.hashtags
    }
  }));
};

const tiktokDataAdapter = (rawData: any[], category?: string): UniversalDataItem[] => {
  return rawData.map(item => ({
    id: item.id,
    url: item.url,
    content: item.description,
    user: item.user_posted,
    date: item.date_posted,
    likes: item.likes,
    comments: item.num_comments,
    platform: 'TikTok',
    content_type: item.content_type,
    thumbnail: item.thumbnail,
    views: item.views,
    shares: item.shares,
    music: item.music,
    duration: item.duration,
    metadata: {
      post_id: item.post_id,
      hashtags: item.hashtags
    }
  }));
};

// Stats adapters
const instagramStatsAdapter = (rawStats: any, category?: string): UniversalFolderStats => {
  // Handle comments data differently from posts data
  if (category === 'comments') {
    return {
      totalItems: rawStats.totalComments || rawStats.totalItems || 0,
      uniqueUsers: rawStats.uniqueCommenters || rawStats.uniqueUsers || 0,
      avgLikes: rawStats.avgLikes || 0,
      avgComments: rawStats.avgReplies || rawStats.avgComments || 0,
      verifiedAccounts: rawStats.verifiedAccounts || 0,
      platform: 'Instagram'
    };
  }
  
  // Default handling for posts/reels/profiles
  return {
    totalItems: rawStats.totalPosts || rawStats.totalItems || 0,
    uniqueUsers: rawStats.uniqueUsers || 0,
    avgLikes: rawStats.avgLikes || 0,
    avgComments: rawStats.avgComments || 0,
    verifiedAccounts: rawStats.verifiedAccounts || 0,
    platform: 'Instagram'
  };
};

const facebookStatsAdapter = (rawStats: any, category?: string): UniversalFolderStats => {
  // Handle comments data differently from posts data
  if (category === 'comments') {
    return {
      totalItems: rawStats.totalComments || rawStats.totalItems || 0,
      uniqueUsers: rawStats.uniqueCommenters || rawStats.uniqueUsers || 0,
      avgLikes: rawStats.avgLikes || 0,
      avgComments: rawStats.avgReplies || rawStats.avgComments || 0,
      verifiedAccounts: rawStats.verifiedAccounts || 0,
      platform: 'Facebook'
    };
  }
  
  // Default handling for posts/reels/profiles
  return {
    totalItems: rawStats.totalPosts || rawStats.totalItems || 0,
    uniqueUsers: rawStats.uniqueUsers || 0,
    avgLikes: rawStats.avgLikes || 0,
    avgComments: rawStats.avgComments || 0,
    verifiedAccounts: rawStats.verifiedAccounts || 0,
    platform: 'Facebook'
  };
};

const linkedinStatsAdapter = (rawStats: any, category?: string): UniversalFolderStats => {
  // Handle comments data differently from posts data
  if (category === 'comments') {
    return {
      totalItems: rawStats.totalComments || rawStats.totalItems || 0,
      uniqueUsers: rawStats.uniqueCommenters || rawStats.uniqueUsers || 0,
      avgLikes: rawStats.avgLikes || 0,
      avgComments: rawStats.avgReplies || rawStats.avgComments || 0,
      verifiedAccounts: rawStats.verifiedAccounts || 0,
      platform: 'LinkedIn'
    };
  }
  
  // Default handling for posts/reels/profiles
  return {
    totalItems: rawStats.totalPosts || rawStats.totalItems || 0,
    uniqueUsers: rawStats.uniqueUsers || 0,
    avgLikes: rawStats.avgLikes || 0,
    avgComments: rawStats.avgComments || 0,
    verifiedAccounts: rawStats.verifiedAccounts || 0,
    platform: 'LinkedIn'
  };
};

const tiktokStatsAdapter = (rawStats: any, category?: string): UniversalFolderStats => {
  // Handle comments data differently from posts data
  if (category === 'comments') {
    return {
      totalItems: rawStats.totalComments || rawStats.totalItems || 0,
      uniqueUsers: rawStats.uniqueCommenters || rawStats.uniqueUsers || 0,
      avgLikes: rawStats.avgLikes || 0,
      avgComments: rawStats.avgReplies || rawStats.avgComments || 0,
      verifiedAccounts: rawStats.verifiedAccounts || 0,
      platform: 'TikTok'
    };
  }
  
  // Default handling for posts/reels/profiles
  return {
    totalItems: rawStats.totalPosts || rawStats.totalItems || 0,
    uniqueUsers: rawStats.uniqueUsers || 0,
    avgLikes: rawStats.avgLikes || 0,
    avgComments: rawStats.avgComments || 0,
    verifiedAccounts: rawStats.verifiedAccounts || 0,
    platform: 'TikTok'
  };
};

const UniversalDataPage: React.FC = () => {
  const { folderId, platform } = useParams<{ folderId: string; platform: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [folder, setFolder] = useState<UniversalFolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract organization and project IDs from URL
  const match = location.pathname.match(/\/organizations\/(\d+)\/projects\/(\d+)/);
  const organizationId = match ? match[1] : null;
  const projectId = match ? match[2] : null;

  useEffect(() => {
    const fetchFolderDetails = async () => {
      if (!folderId || !platform) {
        setError('Missing folder ID or platform');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch folder details from the appropriate platform endpoint
        // Map platform names to correct API endpoints
        const platformEndpoints: { [key: string]: string } = {
          'instagram': 'instagram-data',
          'facebook': 'facebook-data',
          'linkedin': 'linkedin-data',
          'tiktok': 'tiktok-data'
        };
        
        const endpoint = platformEndpoints[platform.toLowerCase()] || platform;
        const response = await apiFetch(`/api/${endpoint}/folders/${folderId}/`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch folder details: ${response.statusText}`);
        }

        const folderData = await response.json();
        
        // Transform to UniversalFolder format
        const universalFolder: UniversalFolder = {
          id: folderData.id,
          name: folderData.name,
          description: folderData.description,
          category: folderData.category,
          category_display: folderData.category_display,
          platform: platform.charAt(0).toUpperCase() + platform.slice(1), // Capitalize platform name
          created_at: folderData.created_at,
          updated_at: folderData.updated_at
        };

        setFolder(universalFolder);
      } catch (err) {
        console.error('Error fetching folder details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch folder details');
      } finally {
        setLoading(false);
      }
    };

    fetchFolderDetails();
  }, [folderId, platform]);

  const handleBackNavigation = () => {
    if (organizationId && projectId) {
      navigate(`/organizations/${organizationId}/projects/${projectId}/data-storage`);
    } else {
      navigate('/data-storage');
    }
  };

  const getDataAdapter = () => {
    switch (platform?.toLowerCase()) {
      case 'instagram':
        return instagramDataAdapter;
      case 'facebook':
        return facebookDataAdapter;
      case 'linkedin':
        return linkedinDataAdapter;
      case 'tiktok':
        return tiktokDataAdapter;
      default:
        return instagramDataAdapter; // Default fallback
    }
  };

  const getStatsAdapter = () => {
    switch (platform?.toLowerCase()) {
      case 'instagram':
        return instagramStatsAdapter;
      case 'facebook':
        return facebookStatsAdapter;
      case 'linkedin':
        return linkedinStatsAdapter;
      case 'tiktok':
        return tiktokStatsAdapter;
      default:
        return instagramStatsAdapter; // Default fallback
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!folder) {
    return (
      <Container maxWidth="xl">
        <Alert severity="warning" sx={{ mt: 2 }}>
          Folder not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <UniversalDataDisplay
        folder={folder}
        platform={platform?.toLowerCase() || 'instagram'} // Pass lowercase platform for API endpoints
        onBackNavigation={handleBackNavigation}
        dataAdapter={getDataAdapter()}
        statsAdapter={getStatsAdapter()}
      />
    </Container>
  );
};

export default UniversalDataPage; 