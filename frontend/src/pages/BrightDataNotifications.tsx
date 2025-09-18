import {
    CheckCircle as CheckCircleIcon,
    Download as DownloadIcon,
    Error as ErrorIcon,
    ExpandMore as ExpandMoreIcon,
    Notifications as NotificationsIcon,
    Refresh as RefreshIcon,
    Schedule as ScheduleIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography
} from '@mui/material';
import axios from 'axios';
import React, { useEffect, useState } from 'react';

interface BrightDataNotification {
  id: number;
  snapshot_id: string;
  status: string;
  message: string;
  event_type?: string;
  raw_data: any;
  scraper_request?: {
    id: number;
    platform: string;
    target_url: string;
    folder_id?: number;
  };
  request_ip?: string;
  request_headers?: any;
  created_at: string;
  processed_at: string;
}

interface NotificationMetrics {
  total_notifications: number;
  pending_count: number;
  completed_count: number;
  failed_count: number;
  recent_count: number;
}

const BrightDataNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<BrightDataNotification[]>([]);
  const [metrics, setMetrics] = useState<NotificationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<BrightDataNotification | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/api/brightdata/notifications/');
      setNotifications(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await axios.get('/api/brightdata/webhook-metrics/');
      setMetrics(response.data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchNotifications(), fetchMetrics()]);
      setLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchNotifications();
        fetchMetrics();
      }, 5000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh]);

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchNotifications(), fetchMetrics()]);
    setLoading(false);
  };

  const handleViewDetails = (notification: BrightDataNotification) => {
    setSelectedNotification(notification);
    setDetailsOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'finished':
      case 'success':
        return 'success';
      case 'failed':
      case 'error':
        return 'error';
      case 'processing':
      case 'running':
        return 'warning';
      case 'pending':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'finished':
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'failed':
      case 'error':
        return <ErrorIcon color="error" />;
      case 'processing':
      case 'running':
        return <ScheduleIcon color="warning" />;
      default:
        return <NotificationsIcon />;
    }
  };

  const exportNotifications = () => {
    const dataStr = JSON.stringify(notifications, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `brightdata-notifications-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading notifications...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          <NotificationsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          BrightData Notifications Monitor
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant={autoRefresh ? "contained" : "outlined"}
            startIcon={<RefreshIcon />}
            onClick={() => setAutoRefresh(!autoRefresh)}
            color={autoRefresh ? "success" : "primary"}
          >
            {autoRefresh ? "Auto Refreshing" : "Auto Refresh"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportNotifications}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Metrics Cards */}
      {metrics && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Notifications
                </Typography>
                <Typography variant="h4">
                  {metrics.total_notifications}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Completed
                </Typography>
                <Typography variant="h4" color="success.main">
                  {metrics.completed_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Failed
                </Typography>
                <Typography variant="h4" color="error.main">
                  {metrics.failed_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Recent (24h)
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {metrics.recent_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Notifications Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Notifications
          </Typography>

          {notifications.length === 0 ? (
            <Alert severity="info">
              No notifications received yet. Make sure your BrightData webhook is configured with the notify URL.
            </Alert>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Snapshot ID</TableCell>
                    <TableCell>Event Type</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Scraper Request</TableCell>
                    <TableCell>Received At</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getStatusIcon(notification.status)}
                          <Chip
                            label={notification.status}
                            color={getStatusColor(notification.status) as any}
                            size="small"
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {notification.snapshot_id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {notification.event_type || 'webhook'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {notification.message || 'No message'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {notification.scraper_request ? (
                          <Box>
                            <Typography variant="body2">
                              ID: {notification.scraper_request.id}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {notification.scraper_request.platform}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No request found
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(notification.created_at).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(notification)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Notification Details - {selectedNotification?.snapshot_id}
        </DialogTitle>
        <DialogContent>
          {selectedNotification && (
            <Box>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Status:</Typography>
                  <Chip
                    label={selectedNotification.status}
                    color={getStatusColor(selectedNotification.status) as any}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Event Type:</Typography>
                  <Typography>{selectedNotification.event_type || 'webhook'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Request IP:</Typography>
                  <Typography fontFamily="monospace">
                    {selectedNotification.request_ip || 'Unknown'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Processed At:</Typography>
                  <Typography>
                    {new Date(selectedNotification.processed_at).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Raw Data</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(selectedNotification.raw_data, null, 2)}
                    </pre>
                  </Paper>
                </AccordionDetails>
              </Accordion>

              {selectedNotification.request_headers && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Request Headers</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                      <pre style={{ margin: 0, fontSize: '12px' }}>
                        {JSON.stringify(selectedNotification.request_headers, null, 2)}
                      </pre>
                    </Paper>
                  </AccordionDetails>
                </Accordion>
              )}

              {selectedNotification.scraper_request && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Associated Scraper Request</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">Request ID:</Typography>
                        <Typography>{selectedNotification.scraper_request.id}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">Platform:</Typography>
                        <Typography>{selectedNotification.scraper_request.platform}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2">Target URL:</Typography>
                        <Typography fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                          {selectedNotification.scraper_request.target_url}
                        </Typography>
                      </Grid>
                      {selectedNotification.scraper_request.folder_id && (
                        <Grid item xs={6}>
                          <Typography variant="subtitle2">Folder ID:</Typography>
                          <Typography>{selectedNotification.scraper_request.folder_id}</Typography>
                        </Grid>
                      )}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BrightDataNotifications;
