import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  Stack,
  Tooltip,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import MusicNoteIcon from '@mui/icons-material/MusicNote'; // For TikTok
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

import HelpIcon from '@mui/icons-material/Help';
import { useTheme } from '@mui/material/styles';
import { apiFetch } from '../../utils/api';

// Service-specific validation functions
const validateServiceUrl = (service: string | null | undefined, url: string | undefined | null): boolean => {
  if (!url || !url.trim()) return true; // Empty is valid
  
  switch (service) {
    case 'linkedin_posts':
      // LinkedIn posts: Accepts profile or company URLs with or without trailing slash and with optional query parameters
      return /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|company)\/[^/?#]+(?:\/)?(?:\?.*)?$/i.test(url);
    
    case 'tiktok_posts':
      // TikTok posts: Accepts TikTok profile URLs with @username format
      return /^(https?:\/\/)?(www\.)?tiktok\.com\/@[a-zA-Z0-9._-]+\/?$/i.test(url);
    
    case 'instagram_posts':
      // Instagram posts: Accepts only valid Instagram profile URLs (1-30 chars, alphanumeric, dot, underscore)
      return /^https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9._]{1,30})\/?$/i.test(url);

    case 'instagram_reels':
      // Instagram reels: Accepts only valid Instagram profile URLs (1-30 chars, alphanumeric, dot, underscore)
      return /^https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9._]{1,30})\/?$/i.test(url);
    case 'instagram_comments':
      // Instagram comments: specific post URL (p, reel, or tv)
      return /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[a-zA-Z0-9_-]{5,}\/?$/i.test(url);
    
    case 'facebook_comments':
      // Facebook comments: post URL (strict match for post URLs)
      return /^https?:\/\/(www\.)?facebook\.com\/(?:(?:[a-zA-Z0-9.-]+\/posts\/[a-zA-Z0-9]+)|(?:groups\/\d+\/posts\/[a-zA-Z0-9]+)|(?:permalink\.php\?story_fbid=\d+&id=\d+)|(?:profile\.php\?id=\d+&[^ ]*story_fbid=\d+)|(?:share\/p\/[a-zA-Z0-9]+))\/?$/i.test(url);
    
    case 'facebook_reels_profile':
      // Facebook reels: profile URL, profile.php?id=, or group URL
      return /^https?:\/\/(www\.)?facebook\.com\/(profile\.php\?id=\d+|[a-zA-Z0-9.-]+|groups\/[a-zA-Z0-9.-]+)\/?$/i.test(url);

    case 'facebook_pages_posts':
      // Facebook pages posts: page, group, or open profile URL
      return /^https?:\/\/(www\.)?facebook\.com\/(profile\.php\?id=\d+|[a-zA-Z0-9.-]+|groups\/[a-zA-Z0-9.-]+)\/?$/i.test(url);
    
    default:
      return true;
  }
};

const getServiceValidationMessage = (service: string | null | undefined, url: string | undefined | null): string => {
  if (!url || !url.trim()) return '';
  
  const isValid = validateServiceUrl(service, url);
  if (isValid) return '';
  
  switch (service) {
    case 'linkedin_posts':
      return 'Please enter a valid LinkedIn profile URL';
    
    case 'tiktok_posts':
      return 'Please enter a valid TikTok profile URL (e.g., https://tiktok.com/@username)';
    
    case 'instagram_posts':
      return 'Please enter a valid Instagram profile URL';
    
    case 'instagram_reels':
      return 'Please enter a valid Instagram profile URL';
    
    case 'instagram_comments':
      return 'Please enter a valid Instagram post URL to collect comments';
    
    case 'facebook_comments':
      return 'Please enter a valid Facebook post URL to collect comments';
    
    case 'facebook_reels_profile':
      return 'Please enter a valid Facebook profile URL';
    
    case 'facebook_pages_posts':
      return 'Please enter a valid Facebook page, group or profile URL';
    
    default:
      return 'Please enter a valid URL';
  }
};

// Helper functions for the step-by-step flow
const getServicesForPlatform = (platform: string | null | undefined) => {
  switch (platform) {
    case 'linkedin':
      return [
        { key: 'linkedin_posts', label: 'Posts' },
      ];
    case 'tiktok':
      return [
        { key: 'tiktok_posts', label: 'Posts' },
      ];
    case 'instagram':
      return [
        { key: 'instagram_posts', label: 'Posts' },
        { key: 'instagram_reels', label: 'Reels' },
        { key: 'instagram_comments', label: 'Comments' },
      ];
    case 'facebook':
      return [
        { key: 'facebook_pages_posts', label: 'Posts' },
        { key: 'facebook_reels_profile', label: 'Reels' },
        { key: 'facebook_comments', label: 'Comments' },
      ];
    default:
      return [];
  }
};

const getServiceLabel = (service: string | null | undefined) => {
  switch (service) {
    case 'linkedin_posts': return 'LinkedIn Profile';
    case 'tiktok_posts': return 'TikTok Profile';
    case 'instagram_posts': return 'Instagram Profile';
    case 'instagram_reels': return 'Instagram Profile';
    case 'instagram_comments': return 'Instagram Post';
    case 'facebook_comments': return 'Facebook Post';
    case 'facebook_reels_profile': return 'Facebook Profile';
    case 'facebook_pages_posts': return 'Facebook Page/Profile';
    default: return 'Social Media';
  }
};

const getUrlPlaceholder = (platform: string | null | undefined, service: string | null | undefined) => {
  switch (service) {
    case 'linkedin_posts': return 'https://linkedin.com/in/username';
    case 'tiktok_posts': return 'https://tiktok.com/@username';
    case 'instagram_posts': return 'https://instagram.com/username';
    case 'instagram_reels': return 'https://instagram.com/username/';
    case 'instagram_comments': return 'https://instagram.com/p/ABC123xyz/';
    case 'facebook_comments': return 'https://facebook.com/username/posts/pfbid...';
    case 'facebook_reels_profile': return 'https://facebook.com/profile-username';
    case 'facebook_pages_posts': return 'https://facebook.com/page-username';
    default: return 'Enter URL...';
  }
};

const getUrlFieldForService = (service: string | null | undefined) => {
  switch (service) {
    case 'linkedin_posts':
      return 'linkedin_link';
    case 'tiktok_posts':
      return 'tiktok_link';
    case 'instagram_posts':
    case 'instagram_reels':
    case 'instagram_comments':
      return 'instagram_link';
    case 'facebook_comments':
    case 'facebook_reels_profile':
    case 'facebook_pages_posts':
      return 'facebook_link';
    default:
      return 'other_social_media';
  }
};

// Types
interface TrackSourceFormProps {
  sourceId?: string; // Optional - if provided, we're editing an existing source
  organizationId?: string; // Optional - for navigation with organization context
  projectId?: string; // Optional - for navigation with project context
  onSuccess?: (source: TrackSource) => void;
}

interface TrackSource {
  id: number;
  name: string;
  facebook_link: string | null;
  instagram_link: string | null;
  linkedin_link: string | null;
  tiktok_link: string | null;
  other_social_media: string | null;
  project?: number | null;
  created_at?: string;
  updated_at?: string;
  selectedPlatform?: string | null;
  selectedService?: string | null;
}

const TrackSourceForm: React.FC<TrackSourceFormProps> = ({ 
  sourceId, 
  organizationId,
  projectId,
  onSuccess 
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [loadingSource, setLoadingSource] = useState(!!sourceId);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });
  
  // Form state
  const [formData, setFormData] = useState<TrackSource>({
    id: 0,
    name: '',
    facebook_link: '',
    instagram_link: '',
    linkedin_link: '',
    tiktok_link: '',
    other_social_media: '',
    project: projectId ? parseInt(projectId) : null,
    selectedPlatform: null,
    selectedService: null
  });

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

  // Load source data if editing
  useEffect(() => {
    if (sourceId) {
      const fetchSourceData = async () => {
        try {
          setLoadingSource(true);
          const response = await apiFetch(`/track-accounts/sources/${sourceId}/`);
          
          if (!response.ok) {
            throw new Error('Failed to load source data');
          }
          
          const sourceData = await response.json();
          console.log('Loaded source data:', sourceData);
          
          // Use the stored platform and service_name from the database
          const selectedPlatform = sourceData.platform || null;
          const selectedService = sourceData.service_name || null;
          
          console.log('Using stored platform:', selectedPlatform, 'service:', selectedService);
          
          // Set the form data with the stored values
          setFormData({
            ...sourceData,
            project: sourceData.project || (projectId ? parseInt(projectId, 10) : null),
            selectedPlatform,
            selectedService
          });
        } catch (error) {
          console.error('Error loading source:', error);
          showSnackbar('Failed to load source data. Please try again.', 'error');
        } finally {
          setLoadingSource(false);
        }
      };
      
      fetchSourceData();
    }
  }, [sourceId, projectId]);

  // Handle form field changes
  const handleFieldChange = (field: keyof TrackSource, value: string | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };



  // Helper functions for validation
  const getCurrentUrlValue = () => {
    if (!formData.selectedService) return '';
    const field = getUrlFieldForService(formData.selectedService);
    return formData[field as keyof TrackSource] as string || '';
  };

  const hasUrlValidationError = () => {
    if (!formData.selectedService) return false;
    const field = getUrlFieldForService(formData.selectedService);
    const value = formData[field as keyof TrackSource] as string;
    if (!value) return false;
    
    return !validateServiceUrl(formData.selectedService, value);
  };

  const getUrlValidationMessage = () => {
    if (!formData.selectedService) return '';
    const field = getUrlFieldForService(formData.selectedService);
    const value = formData[field as keyof TrackSource] as string;
    if (!value) return '';
    
    return getServiceValidationMessage(formData.selectedService, value);
  };

  // Check if there are any validation errors
  const hasValidationErrors = (): boolean => {
    // Check for missing name
    if (!formData.name.trim()) return true;
    
    // Check for invalid URL if service is selected and URL is provided
    if (formData.selectedService && getCurrentUrlValue()) {
      return hasUrlValidationError();
    }
    
    return false;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for validation errors
    if (hasValidationErrors()) {
      showSnackbar('Please correct the errors before saving.', 'error');
      return;
    }

    // Validate required fields
    if (!formData.name.trim()) {
      showSnackbar('Source name is required', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      const url = sourceId 
        ? `/track-accounts/sources/${sourceId}/`
        : '/track-accounts/sources/';
      
      const method = sourceId ? 'PUT' : 'POST';
      
      // Prepare the main social media links
      const socialMediaLinks: {
        facebook_link: string | null;
        instagram_link: string | null;
        linkedin_link: string | null;
        tiktok_link: string | null;
        other_social_media: string | null;
      } = {
        facebook_link: null,
        instagram_link: null,
        linkedin_link: null,
        tiktok_link: null,
        other_social_media: null,
      };

      // Get the main URL for the selected platform
      const mainUrl = getCurrentUrlValue();
      
      if (mainUrl && mainUrl.trim()) {
        // Store in the appropriate platform field based on selected service
        if (formData.selectedService) {
          const field = getUrlFieldForService(formData.selectedService);
          if (field === 'facebook_link') {
            socialMediaLinks.facebook_link = mainUrl.trim();
          } else if (field === 'instagram_link') {
            socialMediaLinks.instagram_link = mainUrl.trim();
          } else if (field === 'linkedin_link') {
            socialMediaLinks.linkedin_link = mainUrl.trim();
          } else if (field === 'tiktok_link') {
            socialMediaLinks.tiktok_link = mainUrl.trim();
          }
        }
      }
      
      const requestData = { 
        name: formData.name.trim(),
        project: projectId ? parseInt(projectId, 10) : formData.project,
        platform: formData.selectedPlatform,
        service_name: formData.selectedService,
        ...socialMediaLinks
      };
      
      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.message || 'Failed to save source');
      }
      
      const savedSource = await response.json();
      
      showSnackbar(`Source ${sourceId ? 'updated' : 'created'} successfully!`, 'success');
      
      // Callback if provided
      if (onSuccess) {
        onSuccess(savedSource);
      } else {
        // Otherwise, navigate back after a short delay
        setTimeout(() => {
          if (organizationId && projectId) {
            navigate(`/organizations/${organizationId}/projects/${projectId}/source-tracking/sources`);
          } else {
            navigate('/');
          }
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving source:', error);
      showSnackbar(error instanceof Error ? error.message : 'An unknown error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Function to navigate back based on context
  const handleCancel = () => {
    if (organizationId && projectId) {
      navigate(`/organizations/${organizationId}/projects/${projectId}/source-tracking/sources`);
    } else {
      navigate('/');
    }
  };

  if (loadingSource) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 700, color: '#1e293b', mb: 3 }}>
        {sourceId ? 'Edit Track Source' : 'Create New Track Source'}
      </Typography>
      

      
      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          {/* Step 1: Source Name */}
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>
              Step 1: Source Name
            </Typography>
            <TextField
              fullWidth
              label="Source Name"
              placeholder="Enter source name"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              required
              error={!formData.name.trim()}
              helperText={!formData.name.trim() ? 'Name is required' : ''}
              sx={{
                '& .MuiFormHelperText-root': {
                  color: !formData.name.trim() ? theme.palette.error.main + ' !important' : 'inherit'
                },
                '& .MuiOutlinedInput-root': {
                  '&.Mui-error': {
                    '& fieldset': {
                      borderColor: theme.palette.error.main + ' !important'
                    }
                  },
                  '&:not(.Mui-error)': {
                    '& fieldset': {
                      borderColor: '#d0d7de !important'
                    }
                  }
                }
              }}
            />
          </Box>

          {/* Step 2: Platform Selection */}
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>
              Step 2: Select Platform
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {[
                { key: 'facebook', label: 'Facebook', icon: <FacebookIcon />, color: '#4267B2' },
                { key: 'instagram', label: 'Instagram', icon: <InstagramIcon />, color: '#E1306C' },
                { key: 'linkedin', label: 'LinkedIn', icon: <LinkedInIcon />, color: '#0077B5' },
                { key: 'tiktok', label: 'TikTok', icon: <MusicNoteIcon />, color: '#000' }
              ].map((platform) => (
                <Button
                  key={platform.key}
                  variant={formData.selectedPlatform === platform.key ? "contained" : "outlined"}
                  startIcon={platform.icon}
                  onClick={() => {
                    handleFieldChange('selectedPlatform', platform.key);
                    handleFieldChange('selectedService', null);
                  }}
                  sx={{
                    minWidth: 140,
                    height: 48,
                    textTransform: 'none',
                    fontWeight: 500,
                    ...(formData.selectedPlatform === platform.key ? {
                      bgcolor: platform.color,
                      color: 'white',
                      border: 'none',
                      '&:hover': { bgcolor: platform.color, opacity: 0.9 }
                    } : {
                      borderColor: platform.color,
                      color: platform.color,
                      '&:hover': { 
                        bgcolor: platform.color,
                        color: 'white'
                      }
                    })
                  }}
                >
                  {platform.label}
                </Button>
              ))}
            </Box>
          </Box>

          {/* Step 3: Service Selection (only show if platform is selected) */}
          {formData.selectedPlatform && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>
                Step 3: Select Service Type
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {getServicesForPlatform(formData.selectedPlatform).map((service) => (
                  <Button
                    key={service.key}
                    variant={formData.selectedService === service.key ? "contained" : "outlined"}
                    onClick={() => {
                      // Clear the URL field when service changes to prevent confusion
                      const currentField = getUrlFieldForService(formData.selectedService);
                      if (currentField) {
                        handleFieldChange(currentField as keyof TrackSource, null);
                      }
                      handleFieldChange('selectedService', service.key);
                    }}
                    sx={{
                      minWidth: 120,
                      height: 40,
                      textTransform: 'none',
                      fontWeight: 500,
                      ...(formData.selectedService === service.key ? {
                        bgcolor: theme.palette.primary.main,
                        color: 'white',
                        '&:hover': { bgcolor: theme.palette.primary.dark }
                      } : {
                        borderColor: theme.palette.primary.main,
                        color: theme.palette.primary.main,
                        '&:hover': { 
                          bgcolor: theme.palette.primary.main,
                          color: 'white'
                        }
                      })
                    }}
                  >
                    {service.label}
                  </Button>
                ))}
              </Box>
            </Box>
          )}

          {/* Step 4: URL Input (only show if service is selected) */}
          {formData.selectedPlatform && formData.selectedService && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#374151' }}>
                  Step 4: Enter URL
                </Typography>
                <Tooltip title="Provide actual URL instead of share/app links" arrow>
                  <IconButton size="small" sx={{ ml: 0.5, color: '#6b7280', p: 0.5 }}>
                    <HelpIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <TextField
                fullWidth
                label={`${getServiceLabel(formData.selectedService)} URL`}
                placeholder={getUrlPlaceholder(formData.selectedPlatform, formData.selectedService)}
                value={getCurrentUrlValue() || ''}
                onChange={(e) => {
                  const value = e.target.value || null;
                  const field = getUrlFieldForService(formData.selectedService);
                  handleFieldChange(field as keyof TrackSource, value);
                }}
                error={hasUrlValidationError()}
                helperText={getUrlValidationMessage()}
                sx={{
                                  '& .MuiFormHelperText-root': {
                  color: hasUrlValidationError() ? theme.palette.error.main + ' !important' : 'inherit'
                },
                '& .MuiOutlinedInput-root': {
                  '&.Mui-error': {
                    '& fieldset': {
                      borderColor: theme.palette.error.main + ' !important'
                    }
                  },
                  '&:not(.Mui-error)': {
                    '& fieldset': {
                      borderColor: '#d0d7de !important'
                    }
                  }
                }
                }}
              />
            </Box>
          )}


          
          {/* Form Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <Button 
              variant="outlined"
              color="secondary"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Tooltip 
              title={
                !formData.name?.trim() ? "Source name is required" :
                !formData.selectedPlatform ? "Please select a platform" :
                !formData.selectedService ? "Please select a service type" :
                hasUrlValidationError() ? "Please correct the URL errors" :
                ""
              }
              open={!formData.name?.trim() || !formData.selectedPlatform || !formData.selectedService || hasUrlValidationError() ? undefined : false}
            >
              <span>
                <Button 
                  type="submit"
                  variant="contained" 
                  color="primary"
                  startIcon={<SaveIcon />}
                  disabled={loading || hasValidationErrors()}
                >
                  {loading ? 
                    <CircularProgress size={20} color="inherit" /> : 
                    (sourceId ? 'Update Source' : 'Create Source')
                  }
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Stack>
      </form>

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
    </Paper>
  );
};

export default TrackSourceForm;