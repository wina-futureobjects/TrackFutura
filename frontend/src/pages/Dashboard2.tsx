import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid as MuiGrid,
  Card,
  CardContent,
  Divider,
  Stack,
  Button,
  useTheme,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconUsers,
  IconEye,
  IconTarget,
  IconArrowUpRight,
  IconArrowDownRight,
  IconDots,
  IconRefresh,
  IconDownload,
  IconFilter,
} from '@tabler/icons-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { apiFetch } from '../utils/api';

// Create a Grid component that inherits from MuiGrid to fix type issues
const Grid = (props: any) => <MuiGrid {...props} />;

interface Project {
  id: number;
  name: string;
  description: string | null;
  owner: number;
  owner_name: string;
  created_at: string;
  updated_at: string;
  organization?: {
    id: number;
    name: string;
  };
}

// Enterprise dashboard data structure
interface DashboardMetrics {
  revenue: number;
  users: number;
  conversion: number;
  growth: number;
  revenueChange: number;
  usersChange: number;
  conversionChange: number;
  growthChange: number;
}

// Sample enterprise data
const performanceData = [
  { period: 'Jan', revenue: 245000, users: 12400, conversion: 3.2 },
  { period: 'Feb', revenue: 267000, users: 13200, conversion: 3.8 },
  { period: 'Mar', revenue: 289000, users: 14100, conversion: 4.1 },
  { period: 'Apr', revenue: 312000, users: 15600, conversion: 4.3 },
  { period: 'May', revenue: 334000, users: 16800, conversion: 4.6 },
  { period: 'Jun', revenue: 356000, users: 18200, conversion: 4.9 },
];

const departmentData = [
  { department: 'Engineering', budget: 1200000, spent: 980000, efficiency: 92 },
  { department: 'Marketing', budget: 800000, spent: 720000, efficiency: 88 },
  { department: 'Sales', budget: 600000, spent: 540000, efficiency: 95 },
  { department: 'Operations', budget: 400000, spent: 380000, efficiency: 90 },
];

const recentActivity = [
  { action: 'New user registration spike', time: '2 hours ago', status: 'positive' },
  { action: 'Server response time improvement', time: '4 hours ago', status: 'positive' },
  { action: 'Conversion rate target met', time: '6 hours ago', status: 'positive' },
  { action: 'Security scan completed', time: '8 hours ago', status: 'neutral' },
  { action: 'Monthly backup completed', time: '1 day ago', status: 'neutral' },
];

const Dashboard2 = () => {
  const theme = useTheme();
  const { projectId, organizationId } = useParams<{ 
    projectId: string;
    organizationId?: string;
  }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Enterprise metrics
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    revenue: 2847000,
    users: 94800,
    conversion: 4.2,
    growth: 23.5,
    revenueChange: 12.4,
    usersChange: 8.7,
    conversionChange: 15.3,
    growthChange: 6.8,
  });

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      
      try {
        setLoading(true);
        const response = await apiFetch(`/api/users/projects/${projectId}/`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch project details');
        }
        
        const data = await response.json();
        setProject(data);
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProject();
  }, [projectId]);

  const MetricCard = ({ 
    icon, 
    title, 
    value, 
    change, 
    isPositive = true,
    suffix = '',
    prefix = ''
  }: {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    change: number;
    isPositive?: boolean;
    suffix?: string;
    prefix?: string;
  }) => (
    <Card 
      elevation={0} 
      sx={{ 
        p: 3, 
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ color: 'text.secondary' }}>
          {icon}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {isPositive ? (
            <IconArrowUpRight size={16} color={theme.palette.success.main} />
          ) : (
            <IconArrowDownRight size={16} color={theme.palette.error.main} />
          )}
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 600,
              color: isPositive ? 'success.main' : 'error.main'
            }}
          >
            {change}%
          </Typography>
        </Box>
      </Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5, color: 'text.primary' }}>
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <Typography variant="h6" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 4, 
      bgcolor: 'background.default',
      minHeight: '100vh',
      maxWidth: '100%',
      width: '100%'
    }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography 
              variant="h4" 
              fontWeight={700} 
              sx={{ mb: 0.5, color: 'text.primary' }}
            >
              Analytics Overview
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {project?.name || 'Enterprise Dashboard'} • Real-time business intelligence
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<IconFilter size={16} />}
              sx={{ 
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': { borderColor: 'primary.main' }
              }}
            >
              Filter
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<IconRefresh size={16} />}
              sx={{ 
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': { borderColor: 'primary.main' }
              }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<IconDownload size={16} />}
              sx={{ 
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                boxShadow: 'none',
                '&:hover': { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)' }
              }}
            >
              Export
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            icon={<IconTrendingUp size={20} />}
            title="Total Revenue"
            value={metrics.revenue}
            change={metrics.revenueChange}
            prefix="$"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            icon={<IconUsers size={20} />}
            title="Active Users"
            value={metrics.users}
            change={metrics.usersChange}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            icon={<IconTarget size={20} />}
            title="Conversion Rate"
            value={metrics.conversion}
            change={metrics.conversionChange}
            suffix="%"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            icon={<IconEye size={20} />}
            title="Growth Rate"
            value={metrics.growth}
            change={metrics.growthChange}
            suffix="%"
          />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Performance Chart */}
        <Grid item xs={12} lg={8}>
          <Card 
            elevation={0} 
            sx={{ 
              p: 3, 
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              height: '100%'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>
                Performance Trends
              </Typography>
              <Button 
                size="small"
                variant="text"
                sx={{ color: 'text.secondary', minWidth: 'auto', p: 1 }}
              >
                <IconDots size={16} />
              </Button>
            </Box>
            <Box sx={{ height: 350, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fill: '#666', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#666', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: 8, 
                      border: '1px solid #e0e0e0',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      background: '#fff'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#1976d2" 
                    fill="rgba(25, 118, 210, 0.1)" 
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} lg={4}>
          <Card 
            elevation={0} 
            sx={{ 
              p: 3, 
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              height: '100%'
            }}
          >
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              Recent Activity
            </Typography>
            <Stack spacing={2}>
              {recentActivity.map((activity, index) => (
                <Box 
                  key={index}
                  sx={{ 
                    p: 2,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: alpha(theme.palette.primary.main, 0.02)
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
                      {activity.action}
                    </Typography>
                    <Box 
                      sx={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        bgcolor: activity.status === 'positive' ? 'success.main' : 'grey.400',
                        ml: 1,
                        mt: 0.5
                      }} 
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {activity.time}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Department Performance Table */}
      <Card 
        elevation={0} 
        sx={{ 
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Box sx={{ p: 3, pb: 0 }}>
          <Typography variant="h6" fontWeight={600}>
            Department Performance
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Department</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Budget</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Spent</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Efficiency</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {departmentData.map((dept, index) => (
                <TableRow 
                  key={dept.department}
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) }
                  }}
                >
                  <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                    {dept.department}
                  </TableCell>
                  <TableCell align="right">${dept.budget.toLocaleString()}</TableCell>
                  <TableCell align="right">${dept.spent.toLocaleString()}</TableCell>
                  <TableCell align="right">{dept.efficiency}%</TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={dept.efficiency >= 90 ? 'Excellent' : dept.efficiency >= 85 ? 'Good' : 'Needs Attention'}
                      size="small"
                      sx={{ 
                        bgcolor: dept.efficiency >= 90 ? alpha(theme.palette.success.main, 0.1) :
                                 dept.efficiency >= 85 ? alpha(theme.palette.warning.main, 0.1) :
                                 alpha(theme.palette.error.main, 0.1),
                        color: dept.efficiency >= 90 ? 'success.main' :
                               dept.efficiency >= 85 ? 'warning.main' :
                               'error.main',
                        fontWeight: 500,
                        border: 'none'
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default Dashboard2; 