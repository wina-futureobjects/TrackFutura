import { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
  IconButton,
  TextField,
  Stack,
  Breadcrumbs,
  Tooltip,
  Snackbar,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import HomeIcon from '@mui/icons-material/Home';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import { apiFetch } from '../utils/api';

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
  created_at: string;
  updated_at: string;
}

const TrackAccountUpload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<TrackAccount[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // Fetch track accounts with pagination
  const fetchAccounts = async (pageNumber = 0, pageSize = 10, searchTerm = '') => {
    try {
      setIsLoading(true);
      // Add search param if search term exists
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
      
      const response = await apiFetch(`/api/track-accounts/accounts/?page=${pageNumber + 1}&page_size=${pageSize}${searchParam}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      const data = await response.json();
      
      if (data && typeof data === 'object' && 'results' in data) {
        setAccounts(data.results || []);
        setTotalCount(data.count || 0);
      } else {
        console.error('API returned unexpected data format:', data);
        setAccounts([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setAccounts([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchAccounts(page, rowsPerPage, searchTerm);
  }, [page, rowsPerPage, searchTerm]);

  // Handle file selection
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setUploadError(null);
      setUploadSuccess(null);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadSuccess(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await apiFetch('/api/track-accounts/accounts/upload_csv/', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadSuccess(data.message);
      setFile(null);
      // Refresh the accounts list
      fetchAccounts(page, rowsPerPage, searchTerm);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle CSV download
  const handleDownloadCSV = async () => {
    try {
      const response = await apiFetch('/api/track-accounts/accounts/download_csv/');
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Create a blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'track_accounts.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      setSnackbarMessage('Failed to download CSV');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Handle pagination
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
    fetchAccounts(newPage, rowsPerPage, searchTerm);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    fetchAccounts(0, newRowsPerPage, searchTerm);
  };

  // Handle search
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);
    setPage(0);
    fetchAccounts(0, rowsPerPage, newSearchTerm);
  };

  // Handle copying links
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setSnackbarMessage('Link copied to clipboard');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link 
          underline="hover" 
          color="inherit" 
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Home
        </Link>
        <Link
          underline="hover"
          color="inherit"
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate('/track-accounts/accounts')}
        >
          <TrackChangesIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Input Collection
        </Link>
        <Typography color="text.primary">
          Upload
        </Typography>
      </Breadcrumbs>

      {/* Header section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Upload Track Accounts
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload a CSV file to bulk import track accounts or download the current accounts as CSV.
        </Typography>
      </Box>

      {/* Upload section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            component="label"
            startIcon={<CloudUploadIcon />}
            disabled={isUploading}
          >
            Select CSV File
            <input
              type="file"
              hidden
              accept=".csv"
              onChange={handleFileChange}
            />
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={!file || isUploading}
            startIcon={isUploading ? <CircularProgress size={20} /> : undefined}
          >
            Upload
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadCSV}
          >
            Download CSV
          </Button>
        </Box>
        {file && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Selected file: {file.name}
          </Typography>
        )}
        {uploadSuccess && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {uploadSuccess}
          </Alert>
        )}
        {uploadError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {uploadError}
          </Alert>
        )}
      </Paper>

      {/* Search and filter section */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search accounts..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
          }}
        />
      </Box>

      {/* Accounts table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>IAC No</TableCell>
              <TableCell>Usernames</TableCell>
              <TableCell>Profile Links</TableCell>
              <TableCell>Risk Classification</TableCell>
              <TableCell>Monitoring</TableCell>
              <TableCell>Posting Frequency</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No accounts found. Upload a CSV file to get started.
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>{account.iac_no}</TableCell>
                  {/* Usernames */}
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {account.facebook_link && (
                        <Chip 
                          label={`FB: ${account.facebook_link}`} 
                          size="small" 
                          onClick={() => handleCopyLink(account.facebook_link!)} 
                        />
                      )}
                      {account.instagram_link && (
                        <Chip 
                          label={`IG: ${account.instagram_link}`} 
                          size="small" 
                          onClick={() => handleCopyLink(account.instagram_link!)} 
                        />
                      )}
                      {account.linkedin_link && (
                        <Chip 
                          label={`LK: ${account.linkedin_link}`} 
                          size="small" 
                          onClick={() => handleCopyLink(account.linkedin_link!)} 
                        />
                      )}
                      {account.tiktok_link && (
                        <Chip 
                          label={`TK: ${account.tiktok_link}`} 
                          size="small" 
                          onClick={() => handleCopyLink(account.tiktok_link!)} 
                        />
                      )}
                    </Stack>
                  </TableCell>
                  {/* Social Media Links */}
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {account.facebook_link && (
                        <Tooltip title="Copy Facebook URL">
                          <IconButton size="small" onClick={() => handleCopyLink(account.facebook_link!)}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {account.instagram_link && (
                        <Tooltip title="Copy Instagram URL">
                          <IconButton size="small" onClick={() => handleCopyLink(account.instagram_link!)}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {account.linkedin_link && (
                        <Tooltip title="Copy LinkedIn URL">
                          <IconButton size="small" onClick={() => handleCopyLink(account.linkedin_link!)}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {account.tiktok_link && (
                        <Tooltip title="Copy TikTok URL">
                          <IconButton size="small" onClick={() => handleCopyLink(account.tiktok_link!)}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={account.risk_classification || 'N/A'}
                      color={account.risk_classification === 'High' ? 'error' : 
                             account.risk_classification === 'Medium' ? 'warning' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={account.close_monitoring ? 'Yes' : 'No'}
                      color={account.close_monitoring ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={account.posting_frequency || 'N/A'}
                      color={account.posting_frequency === 'High' ? 'error' :
                             account.posting_frequency === 'Medium' ? 'warning' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {account.facebook_link && (
                        <Tooltip title="Open Facebook">
                          <IconButton 
                            size="small" 
                            component="a" 
                            href={account.facebook_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {account.instagram_link && (
                        <Tooltip title="Open Instagram">
                          <IconButton 
                            size="small" 
                            component="a" 
                            href={account.instagram_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </TableContainer>

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

export default TrackAccountUpload;
