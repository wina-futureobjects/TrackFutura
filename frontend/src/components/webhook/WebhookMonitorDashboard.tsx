import {
    CheckCircle,
    DataUsage,
    Download,
    Error,
    MonitorHeart,
    PlaylistAddCheck,
    Refresh,
    Timer,
    TrendingDown,
    TrendingUp,
    Visibility,
    Warning
} from '@mui/icons-material';
import {
    Alert,
    AlertTitle,
    Avatar,
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
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Switch,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tooltip,
    Typography
} from '@mui/material';
import { format, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Line,
    LineChart,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    XAxis,
    YAxis
} from 'recharts';
import {
    WebhookAlert,
    WebhookAnalytics,
    WebhookEvent,
    WebhookHealth,
    WebhookMetrics,
    webhookService,
    WebhookTestResult
} from '../../services/webhookService';

const WebhookMonitorDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [metrics, setMetrics] = useState<WebhookMetrics | null>(null);
  const [health, setHealth] = useState<WebhookHealth | null>(null);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [alerts, setAlerts] = useState<WebhookAlert[]>([]);
  const [analytics, setAnalytics] = useState<WebhookAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState(24);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null);

  // Fetch webhook data using the service
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [metricsData, healthData, eventsData, alertsData, analyticsData] = await Promise.all([
        webhookService.getMetrics(),
        webhookService.getHealth(),
        webhookService.getEvents({ limit: 100 }),
        webhookService.getAlerts(),
        webhookService.getAnalytics(selectedTimeRange)
      ]);

      setMetrics(metricsData);
      setHealth(healthData);
      setEvents(eventsData);
      setAlerts(alertsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to fetch webhook data:', error);

      let errorMessage = 'Failed to fetch webhook data';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }

      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange]);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchData]);

  const handleTestWebhook = async () => {
    try {
      const result = await webhookService.testWebhookSecurity();
      setTestResult(result);
      setSnackbarMessage(`Security test completed: ${result.success ? 'PASSED' : 'FAILED'}`);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Webhook test failed:', error);
      setSnackbarMessage('Webhook test failed');
      setSnackbarOpen(true);
    }
  };

  const handleExportEvents = async (format: 'csv' | 'json') => {
    try {
      const blob = await webhookService.exportEvents(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `webhook-events.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setSnackbarMessage(`Events exported as ${format.toUpperCase()}`);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Export failed:', error);
      setSnackbarMessage('Export failed');
      setSnackbarOpen(true);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#4caf50';
      case 'degraded': return '#ff9800';
      case 'unhealthy': return '#f44336';
      case 'critical': return '#d32f2f';
      default: return '#9e9e9e';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle sx={{ color: '#4caf50' }} />;
      case 'error':
      case 'security_error':
      case 'processing_error': return <Error sx={{ color: '#f44336' }} />;
      case 'warning': return <Warning sx={{ color: '#ff9800' }} />;
      default: return <MonitorHeart sx={{ color: '#9e9e9e' }} />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const MetricsCard = ({ title, value, unit, icon, trend, color = 'primary' }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                {title}
              </Typography>
              <Typography variant="h3" sx={{ color: 'white', fontWeight: 700, mt: 1 }}>
                {value}
                <Typography component="span" variant="h6" sx={{ color: 'rgba(255,255,255,0.8)', ml: 0.5 }}>
                  {unit}
                </Typography>
              </Typography>
              {trend && (
                <Box display="flex" alignItems="center" mt={1}>
                  {trend > 0 ?
                    <TrendingUp sx={{ color: '#4caf50', mr: 0.5 }} /> :
                    <TrendingDown sx={{ color: '#f44336', mr: 0.5 }} />
                  }
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    {Math.abs(trend)}% from last hour
                  </Typography>
                </Box>
              )}
            </Box>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 60, height: 60 }}>
              {icon}
            </Avatar>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );

  const HealthStatusCard = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" display="flex" alignItems="center">
            <MonitorHeart sx={{ mr: 1 }} />
            Webhook Health Status
          </Typography>
          <Chip
            label={health?.status?.toUpperCase() || 'UNKNOWN'}
            sx={{
              bgcolor: getHealthColor(health?.status || 'unknown'),
              color: 'white',
              fontWeight: 600
            }}
          />
        </Box>

        {health?.issues && health.issues.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <AlertTitle>Issues Detected</AlertTitle>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {health.issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const EventsTable = () => (
    <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Status</TableCell>
            <TableCell>Timestamp</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Response Time</TableCell>
            <TableCell>Client IP</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.event_id} hover>
              <TableCell>
                <Box display="flex" alignItems="center">
                  {getStatusIcon(event.status)}
                  <Typography variant="body2" sx={{ ml: 1, textTransform: 'capitalize' }}>
                    {event.status.replace('_', ' ')}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {format(parseISO(event.timestamp), 'MMM dd, HH:mm:ss')}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={event.event_type}
                  size="small"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {formatDuration(event.response_time * 1000)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  {event.client_ip}
                </Typography>
              </TableCell>
              <TableCell>
                <Tooltip title="View Details">
                  <IconButton size="small">
                    <Visibility />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const AnalyticsCharts = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Hourly Request Volume
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics?.hourly_breakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <RechartsTooltip />
                  <Area type="monotone" dataKey="total" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  <Area type="monotone" dataKey="success" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                  <Area type="monotone" dataKey="errors" stackId="1" stroke="#ffc658" fill="#ffc658" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Response Time Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics?.hourly_breakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="avg_response_time" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Webhook Monitor Dashboard
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small">
            <InputLabel>Time Range</InputLabel>
            <Select
              value={selectedTimeRange}
              label="Time Range"
              onChange={(e) => setSelectedTimeRange(e.target.value as number)}
            >
              <MenuItem value={1}>Last Hour</MenuItem>
              <MenuItem value={24}>Last 24 Hours</MenuItem>
              <MenuItem value={168}>Last Week</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto Refresh"
          />

          <Button
            variant="outlined"
            startIcon={<PlaylistAddCheck />}
            onClick={handleTestWebhook}
          >
            Test Security
          </Button>

          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => handleExportEvents('csv')}
          >
            Export CSV
          </Button>

          <IconButton onClick={fetchData} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Health Status */}
      <HealthStatusCard />

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Total Requests"
            value={metrics?.total_requests || 0}
            unit=""
            icon={<DataUsage sx={{ color: 'white', fontSize: 30 }} />}
            trend={5}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Success Rate"
            value={((metrics?.success_rate || 0) * 100).toFixed(1)}
            unit="%"
            icon={<CheckCircle sx={{ color: 'white', fontSize: 30 }} />}
            trend={-2}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Avg Response"
            value={formatDuration((metrics?.avg_response_time || 0) * 1000)}
            unit=""
            icon={<Timer sx={{ color: 'white', fontSize: 30 }} />}
            trend={-5}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Error Rate"
            value={((metrics?.error_rate || 0) * 100).toFixed(1)}
            unit="%"
            icon={<Error sx={{ color: 'white', fontSize: 30 }} />}
            trend={-8}
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
          <Tab label="Recent Events" />
          <Tab label="Analytics" />
          <Tab label="Alerts" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 0 && <EventsTable />}
          {activeTab === 1 && <AnalyticsCharts />}
          {activeTab === 2 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Active Alerts
                </Typography>
                {alerts.length === 0 ? (
                  <Typography color="text.secondary">
                    No active alerts
                  </Typography>
                ) : (
                  alerts.map((alert, index) => (
                    <Alert key={index} severity={alert.severity} sx={{ mb: 1 }}>
                      {alert.message}
                    </Alert>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Test Result Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Webhook Security Test Results</DialogTitle>
        <DialogContent>
          {testResult && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Overall Result: {testResult.success ? '✅ PASSED' : '❌ FAILED'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Security Score: {testResult.security_score}/100
              </Typography>
              <Grid container spacing={2} sx={{ mt: 2 }}>
                {Object.entries(testResult.validation_results).map(([key, value]) => (
                  <Grid xs={12} sm={6} key={key}>
                    <Box display="flex" alignItems="center">
                      {value ? <CheckCircle color="success" /> : <Error color="error" />}
                      <Typography sx={{ ml: 1, textTransform: 'capitalize' }}>
                        {key.replace('_', ' ')}: {value ? 'PASS' : 'FAIL'}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default WebhookMonitorDashboard;
