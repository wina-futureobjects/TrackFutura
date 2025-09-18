import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  FormControl,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';

interface Folder {
  id: number;
  name: string;
  description: string | null;
  post_count: number;
  created_at: string;
  updated_at: string;
}

interface InstagramPost {
  id: number;
  url: string;
  user_posted: string;
  description: string | null;
  hashtags: string | null;
  num_comments: number;
  date_posted: string;
  likes: number;
  post_id: string;
  content_type: string | null;
  platform_type: string | null;
  thumbnail: string | null;
  followers: number | null;
  posts_count: number | null;
  is_verified: boolean;
  is_paid_partnership: boolean;
  discovery_input: string;
}

interface TrackAccount {
  id: number;
  name: string;
  iac_no: string;
  facebook_link: string | null;
  instagram_link: string | null;
  linkedin_link: string | null;
  tiktok_link: string | null;
  other_social_media: string | null;
  risk_classification: string | null;
  close_monitoring: boolean;
  posting_frequency: string | null;
  folder: number | null;
  created_at: string;
  updated_at: string;
}

const ReportGeneration = () => {
  const navigate = useNavigate();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [matchPreview, setMatchPreview] = useState<{
    total: number;
    matched: number;
    unmatched: number;
    percentage: number;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // Fetch folders
  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      console.log('Fetching Instagram folders...');
      const response = await apiFetch('/instagram-data/folders/');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }
      
      const data = await response.json();
      console.log('Folders data:', data);
      
      // Handle paginated response
      setFolders(data.results || []);
      console.log('Folders set to:', data.results || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
      showSnackbar('Failed to load folders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleFolderSelect = (folderId: number) => {
    setSelectedFolders(prev => {
      if (prev.includes(folderId)) {
        return prev.filter(id => id !== folderId);
      } else {
        return [...prev, folderId];
      }
    });
  };

  const extractUsernameFromURL = (url: string | null): string => {
    if (!url) return '';
    
    try {
      // Handle URLs like https://www.instagram.com/Sivalicious
      const matches = url.match(/instagram\.com\/([^\/\?]+)/);
      return matches ? matches[1] : '';
    } catch (error) {
      console.error('Error extracting username from URL:', error);
      return '';
    }
  };

  const extractUsernameFromDiscoveryInput = (discoveryInput: string): string => {
    try {
      const data = JSON.parse(discoveryInput);
      if (data.url) {
        // Handle different URL formats
        const urlPattern = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^\/\?]+)/i;
        const matches = data.url.match(urlPattern);
        return matches ? matches[1].trim() : '';
      }
    } catch (error) {
      // If JSON parsing fails, try to extract directly if it's a URL
      if (typeof discoveryInput === 'string' && discoveryInput.includes('instagram.com')) {
        const urlPattern = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^\/\?]+)/i;
        const matches = discoveryInput.match(urlPattern);
        return matches ? matches[1].trim() : '';
      }
      console.error('Error parsing discovery input:', error);
    }
    return '';
  };

  // Find matching account by comparing extracted username with instagram_link
  const findMatchingAccount = (username: string, accounts: TrackAccount[]): TrackAccount | undefined => {
    if (!username) return undefined;
    
    const normalizedUsername = username.toLowerCase().trim();
    
    // Try direct match with instagram_link first (prioritize this)
    let account = accounts.find(acc => 
      acc.instagram_link && acc.instagram_link.toLowerCase().trim() === normalizedUsername
    );
    
    // If no match found, try to extract username from instagram_link URL
    if (!account) {
      account = accounts.find(acc => {
        if (!acc.instagram_link) return false;
        
        // Extract username from URL
        // Handle different URL formats: 
        // - https://www.instagram.com/username
        // - https://instagram.com/username/
        // - www.instagram.com/username
        const urlPattern = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^\/\?]+)/i;
        const matches = acc.instagram_link.match(urlPattern);
        const extractedUsername = matches ? matches[1].toLowerCase().trim() : '';
        
        // Compare normalized usernames
        return extractedUsername === normalizedUsername;
      });
    }

    // If still no match, try advanced matching techniques:
    if (!account) {
      account = accounts.find(acc => {
        // Check for partial username matches
        if (acc.instagram_link) {
          // Remove special characters and compare
          const cleanUsername = acc.instagram_link.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanSearchUsername = normalizedUsername.replace(/[^a-z0-9]/g, '');
          return cleanUsername === cleanSearchUsername;
        }
        return false;
      });
    }
    
    return account;
  };

  const generateReport = async () => {
    if (!startDate || !endDate) {
      showSnackbar('Please select both start and end dates', 'error');
      return;
    }

    if (selectedFolders.length === 0) {
      showSnackbar('Please select at least one folder', 'error');
      return;
    }

    try {
      setGenerating(true);

      // Save the report to the database first
      const reportName = `Social Media Report ${new Date().toLocaleDateString()}`;
      try {
        const saveReportResponse = await apiFetch('/track-accounts/reports/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: reportName,
            description: `Generated report for date range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            source_folders: JSON.stringify(selectedFolders)
          })
        });
        
        if (!saveReportResponse.ok) {
          console.warn('Failed to save report to database, but will continue with CSV generation');
        } else {
          const reportData = await saveReportResponse.json();
          console.log('Report saved to database:', reportData);
        }
      } catch (error) {
        console.error('Error saving report:', error);
        // Continue with CSV generation even if saving fails
      }

      // Fetch ALL track accounts (without pagination limits) - Do this first
      const allAccounts: TrackAccount[] = [];
      let hasMoreAccounts = true;
      let accountPage = 1;
      
      while (hasMoreAccounts) {
        const response = await apiFetch(`/track-accounts/accounts/?page=${accountPage}&page_size=100`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch track accounts');
        }
        
        const data = await response.json();
        const accounts = data.results || [];
        allAccounts.push(...accounts);
        
        // Check if there are more pages
        hasMoreAccounts = data.next !== null;
        accountPage++;
        
        // Safety check to prevent infinite loops
        if (accountPage > 100) {
          console.warn('Reached maximum number of pages (100). Some accounts might be missing.');
          break;
        }
      }
      
      console.log(`Total accounts fetched: ${allAccounts.length}`);
      
      // Debug account usernames to help troubleshoot matching issues
      console.log('Available Instagram usernames in track accounts:');
      allAccounts.forEach(acc => {
        if (acc.instagram_link) {
          console.log(`Account ${acc.name} (${acc.iac_no}): username=${acc.instagram_link}`);
        }
      });

      // Fetch ALL posts for selected folders (without pagination limits)
      const allPosts: InstagramPost[] = [];
      for (const folderId of selectedFolders) {
        let hasMorePosts = true;
        let page = 1;
        
        while (hasMorePosts) {
          const response = await apiFetch(
            `/instagram/posts/?folder_id=${folderId}&start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&page=${page}&page_size=100`
          );
          
          if (!response.ok) {
            throw new Error(`Failed to fetch posts for folder ${folderId}`);
          }
          
          const data = await response.json();
          const posts = data.results || [];
          allPosts.push(...posts);
          
          // Check if there are more pages
          hasMorePosts = data.next !== null;
          page++;
          
          // Safety check to prevent infinite loops
          if (page > 100) {
            console.warn('Reached maximum number of pages (100). Some data might be missing.');
            break;
          }
        }
      }
      
      console.log(`Total posts fetched: ${allPosts.length}`);

      // Generate CSV content
      const csvRows = ['S/N,Name,IAC No.,Entity,Under Close Monitoring? (Yes / No),Posting Date,Platform Type,Post URL,Username,Personal/Business,Keywords,Content'];

      // Track match statistics for debugging
      let matchedPosts = 0;
      let unmatchedPosts = 0;
      
      allPosts.forEach((post, index) => {
        // Extract username from post data
        const username = extractUsernameFromDiscoveryInput(post.discovery_input);
        console.log(`Post #${index+1}: Extracted username: ${username}`);
        
        // Find matching account using the improved matching function
        const account = findMatchingAccount(username, allAccounts);
        
        if (account) {
          matchedPosts++;
          console.log(`  ✓ Matched with account: ${account.name} (${account.iac_no}), IG username: ${account.instagram_link}`);
        } else {
          unmatchedPosts++;
          console.log(`  ✗ No match found for username: ${username}`);
        }

        const row = [
          '', // S/N - leave empty
          account?.name || '', // Name
          account?.iac_no || '', // IAC No
          '', // Entity
          account?.close_monitoring ? 'Yes' : 'No', // Under Close Monitoring
          post.date_posted, // Posting Date
          post.platform_type || (post.content_type === 'post' ? 'IG Post' : 'IG Reel'), // Platform Type
          post.url, // Post URL
          username, // Username
          '', // Personal/Business
          post.hashtags || '', // Keywords
          post.description || '' // Content
        ].map(field => `"${String(field).replace(/"/g, '""')}"`);

        csvRows.push(row.join(','));
      });
      
      console.log(`Matching statistics: ${matchedPosts} posts matched, ${unmatchedPosts} posts unmatched (${Math.round(matchedPosts/allPosts.length*100)}% match rate)`);

      // Create and download CSV file
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `social_media_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // At the end of the generateReport function, modify the success message to include a report link
      
      // Add a button to navigate to the report folders page after successful generation
      showSnackbar('Report generated successfully', 'success');
      
      // Add a button to view all reports
      const viewButton = document.createElement('button');
      viewButton.textContent = 'View All Reports';
      viewButton.className = 'MuiButton-root MuiButton-contained MuiButton-containedPrimary MuiButton-sizeMedium MuiButton-containedSizeMedium MuiButtonBase-root';
      viewButton.style.position = 'fixed';
      viewButton.style.bottom = '40px';
      viewButton.style.right = '40px';
      viewButton.style.zIndex = '1000';
      viewButton.onclick = () => {
        // Remove the button
        document.body.removeChild(viewButton);
        // Navigate to the reports page
        window.location.href = '/report-folders';
      };
      document.body.appendChild(viewButton);
      
      // Auto-remove the button after 10 seconds
      setTimeout(() => {
        if (document.body.contains(viewButton)) {
          document.body.removeChild(viewButton);
        }
      }, 10000);

    } catch (error) {
      console.error('Error generating report:', error);
      showSnackbar('Failed to generate report', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Preview the matching results without generating the report
  const previewMatches = async () => {
    if (!startDate || !endDate) {
      showSnackbar('Please select both start and end dates', 'error');
      return;
    }

    if (selectedFolders.length === 0) {
      showSnackbar('Please select at least one folder', 'error');
      return;
    }

    try {
      setPreviewLoading(true);

      // Fetch track accounts (limit to 1000 for preview speed)
      const response1 = await apiFetch(`/track-accounts/accounts/?page_size=1000`);
      if (!response1.ok) throw new Error('Failed to fetch track accounts');
      const accountsData = await response1.json();
      const accounts = accountsData.results || [];

      // Fetch sample of posts from selected folders (limit to 500 for preview speed)
      const postSamples: InstagramPost[] = [];
      for (const folderId of selectedFolders) {
        const response2 = await apiFetch(
          `/instagram/posts/?folder_id=${folderId}&start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&page_size=500`
        );
        if (!response2.ok) throw new Error(`Failed to fetch posts for folder ${folderId}`);
        const data = await response2.json();
        const posts = data.results || [];
        postSamples.push(...posts);
      }

      // Calculate match statistics
      let matched = 0;
      let unmatched = 0;

      for (const post of postSamples) {
        const username = extractUsernameFromDiscoveryInput(post.discovery_input);
        const account = findMatchingAccount(username, accounts);
        if (account) {
          matched++;
        } else {
          unmatched++;
        }
      }

      const total = matched + unmatched;
      const percentage = total > 0 ? Math.round((matched / total) * 100) : 0;

      setMatchPreview({
        total,
        matched,
        unmatched,
        percentage
      });

      showSnackbar(`Preview: ${matched} of ${total} posts (${percentage}%) matched with track accounts`, 'success');
    } catch (error) {
      console.error('Preview error:', error);
      showSnackbar('Failed to preview matches', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (folder.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Generate Social Media Report
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Select folders and date range to generate a comprehensive social media activity report.
        </Typography>
      </Box>

      {/* Date Range Selection */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Select Date Range
        </Typography>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
            />
          </Stack>
        </LocalizationProvider>
      </Paper>

      {/* Folder Selection */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Select Folders
          </Typography>
          <TextField
            size="small"
            placeholder="Search folders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredFolders.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                No Instagram folders found. Please create folders in the Instagram Data section first.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {filteredFolders.map((folder) => (
                  <Chip
                    key={folder.id}
                    label={`${folder.name} (${folder.post_count || 0} posts)`}
                    icon={<FolderIcon />}
                    onClick={() => handleFolderSelect(folder.id)}
                    color={selectedFolders.includes(folder.id) ? 'primary' : 'default'}
                    sx={{ m: 0.5 }}
                  />
                ))}
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Preview Results (if available) */}
      {matchPreview && (
        <Paper sx={{ p: 3, mb: 4, bgcolor: 'background.default' }}>
          <Typography variant="h6" gutterBottom>
            Matching Preview
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Posts matched with track accounts:
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {matchPreview.matched} of {matchPreview.total} ({matchPreview.percentage}%)
                </Typography>
              </Box>
              <Box sx={{ width: '100%', bgcolor: 'grey.300', borderRadius: 1, height: 8 }}>
                <Box 
                  sx={{ 
                    width: `${matchPreview.percentage}%`, 
                    bgcolor: matchPreview.percentage > 70 ? 'success.main' : 
                             matchPreview.percentage > 40 ? 'warning.main' : 'error.main',
                    height: 8,
                    borderRadius: 1
                  }}
                />
              </Box>
            </Box>
            {matchPreview.unmatched > 0 && matchPreview.percentage < 90 && (
              <Tooltip title="Some posts don't have matching track accounts. This may affect your report's completeness.">
                <Chip 
                  label={`${matchPreview.unmatched} unmatched posts`} 
                  color="warning" 
                  size="small" 
                />
              </Tooltip>
            )}
          </Box>
        </Paper>
      )}

      {/* Generate Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          size="large"
          startIcon={previewLoading ? <CircularProgress size={20} color="inherit" /> : null}
          onClick={previewMatches}
          disabled={previewLoading || generating || selectedFolders.length === 0}
        >
          {previewLoading ? 'Analyzing...' : 'Preview Matches'}
        </Button>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
          onClick={generateReport}
          disabled={generating || selectedFolders.length === 0}
        >
          {generating ? 'Generating Report...' : 'Generate Report'}
        </Button>
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ReportGeneration; 