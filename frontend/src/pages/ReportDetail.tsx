import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Breadcrumbs,
  Link,
  Snackbar,
  Alert,
  LinearProgress,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import DescriptionIcon from '@mui/icons-material/Description';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import { format } from 'date-fns';
import { apiFetch } from '../utils/api';

interface ReportFolder {
  id: number;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  total_posts: number;
  matched_posts: number;
  match_percentage: number;
  entry_count: number;
  source_folders: string;
  created_at: string;
  updated_at: string;
  entries: ReportEntry[];
}

interface ReportEntry {
  id: number;
  name: string | null;
  iac_no: string | null;
  entity: string | null;
  close_monitoring: string | null;
  posting_date: string | null;
  platform_type: string | null;
  post_url: string | null;
  username: string | null;
  account_type: string | null;
  keywords: string | null;
  content: string | null;
  post_id: string | null;
  track_account_id: number | null;
  created_at: string;
}

const ReportDetail = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportFolder | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEntries, setFilteredEntries] = useState<ReportEntry[]>([]);

  useEffect(() => {
    if (reportId) {
      fetchReport(reportId);
    }
  }, [reportId]);

  // Filter entries when search term or report changes
  useEffect(() => {
    if (!report) {
      setFilteredEntries([]);
      return;
    }

    if (!searchTerm.trim()) {
      setFilteredEntries(report.entries);
      return;
    }

    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    const filtered = report.entries.filter(entry => {
      return (
        (entry.username?.toLowerCase().includes(normalizedSearchTerm) || false) ||
        (entry.name?.toLowerCase().includes(normalizedSearchTerm) || false) ||
        (entry.iac_no?.toLowerCase().includes(normalizedSearchTerm) || false) ||
        (entry.content?.toLowerCase().includes(normalizedSearchTerm) || false) ||
        (entry.keywords?.toLowerCase().includes(normalizedSearchTerm) || false)
      );
    });

    setFilteredEntries(filtered);
    setPage(0); // Reset to first page when searching
  }, [searchTerm, report]);

  const fetchReport = async (id: string) => {
    try {
      setLoading(true);
      const response = await apiFetch(`/track-accounts/reports/${id}/`);
      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }
      const data = await response.json();
      setReport(data);
      setFilteredEntries(data.entries || []);
    } catch (error) {
      console.error('Error fetching report:', error);
      showSnackbar('Failed to load report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleBackToReports = () => {
    navigate('/report-folders');
  };

  const handleDownloadCSV = () => {
    if (!reportId) return;
    window.open(`/api/track-accounts/reports/${reportId}/download_csv/`, '_blank');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };

  // Calculate displayed rows based on pagination and filtering
  const displayedEntries = filteredEntries
    ? filteredEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : [];

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header with back button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          {report ? report.name : 'Report Details'}
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToReports}
            sx={{ mr: 2 }}
          >
            Back to Reports
          </Button>
          {/* <Button
            variant="contained"
            color="secondary"
            startIcon={<AssessmentIcon />}
            onClick={() => navigate(`/report-folders/${reportId}/instagram-data`)}
          >
            Add Instagram Data
          </Button> */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/report-folders/${reportId}/edit-multi-platform`)}
          >
            Edit Multi-Platform
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadCSV}
          >
            Download CSV
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : report ? (
        <>
          {/* Report Header */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h5" gutterBottom>
                  {report.name}
                </Typography>
                {report.description && (
                  <Typography variant="body1" color="text.secondary" paragraph>
                    {report.description}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                  <Chip 
                    label={`Date Range: ${formatDate(report.start_date)} - ${formatDate(report.end_date)}`} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                  <Chip 
                    label={`Entries: ${report.entry_count}`} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                </Box>
              </Box>
            </Box>

            {/* Matching stats */}
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">
                  Posts matched with track accounts: {report.matched_posts} of {report.total_posts}
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {report.match_percentage}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={report.match_percentage} 
                color={
                  report.match_percentage > 70 ? "success" : 
                  report.match_percentage > 40 ? "warning" : "error"
                }
                sx={{ height: 8, borderRadius: 1 }}
              />
            </Box>
          </Paper>

          {/* Search field */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search entries by username, name, content or keywords..."
              value={searchTerm}
              onChange={handleSearchChange}
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

          {/* Report Table */}
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>IAC No.</TableCell>
                  <TableCell>Posting Date</TableCell>
                  <TableCell>Post Content</TableCell>
                  <TableCell>Monitoring</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      {searchTerm ? 'No matching entries found.' : 'No entries found in this report.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.username || '-'}</TableCell>
                      <TableCell>
                        {entry.name ? (
                          <Typography variant="body2">{entry.name}</Typography>
                        ) : (
                          <Typography variant="body2" color="error">
                            No match
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{entry.iac_no || '-'}</TableCell>
                      <TableCell>{formatDate(entry.posting_date)}</TableCell>
                      <TableCell sx={{ maxWidth: 250 }}>
                        <Typography noWrap variant="body2">
                          {entry.content || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {entry.close_monitoring && (
                          <Chip 
                            label={entry.close_monitoring} 
                            size="small"
                            color={entry.close_monitoring === 'Yes' ? 'primary' : 'default'}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.post_url && (
                          <Tooltip title="View post">
                            <Button
                              size="small"
                              href={entry.post_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Post
                            </Button>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredEntries.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </TableContainer>
        </>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Report not found or could not be loaded.
          </Typography>
          <Button
            variant="contained"
            onClick={handleBackToReports}
          >
            Back to Reports
          </Button>
        </Paper>
      )}

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

export default ReportDetail; 