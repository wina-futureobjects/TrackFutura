import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { Box, Paper, Typography, Link, Stack, Menu, MenuItem, Chip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ChartProps {
  type: 'line' | 'bar';
  data: ChartData<'line' | 'bar'>;
  title?: string;
  description?: React.ReactNode;
  onOpenChart?: () => void;
}

const defaultOptions: ChartOptions<'line' | 'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        font: {
          size: 14,
          weight: 500
        },
        usePointStyle: true,
        padding: 20
      }
    },
    title: {
      display: false,
    },
    tooltip: {
      titleFont: {
        size: 14
      },
      bodyFont: {
        size: 13
      },
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) label += ': ';
          if (context.parsed.y !== null) label += context.parsed.y.toLocaleString();
          return label;
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.1)'
      },
      ticks: {
        font: {
          size: 13
        }
      }
    },
    x: {
      grid: {
        display: false
      },
      ticks: {
        font: {
          size: 13
        }
      }
    }
  }
};

// Social media analytics specific filter options
const filterOptions = {
  metric: [
    { value: 'followers', label: 'Followers' },
    { value: 'engagement_rate', label: 'Engagement Rate' },
    { value: 'reach', label: 'Reach' },
    { value: 'impressions', label: 'Impressions' }
  ],
  platform: [
    { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'tiktok', label: 'TikTok' }
  ],
  content_type: [
    { value: 'all_content', label: 'All Content' },
    { value: 'posts', label: 'Posts' },
    { value: 'stories', label: 'Stories' },
    { value: 'reels', label: 'Reels/Videos' }
  ],
  demographics: [
    { value: 'all_users', label: 'All Demographics' },
    { value: 'age_18_24', label: 'Age 18-24' },
    { value: 'age_25_34', label: 'Age 25-34' },
    { value: 'age_35_plus', label: 'Age 35+' }
  ],
  timeframe: [
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'last_90_days', label: 'Last 90 days' },
    { value: 'last_6_months', label: 'Last 6 months' },
    { value: 'last_year', label: 'Last year' }
  ]
};

const ChatChart: React.FC<ChartProps> = ({ type, data, title, description, onOpenChart }) => {
  const [filters, setFilters] = useState<Record<string, string>>({
    metric: 'followers',
    platform: 'instagram',
    content_type: 'all_content',
    demographics: 'all_users',
    timeframe: 'last_30_days'
  });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [chartData, setChartData] = useState(data);

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>, filterId: string) => {
    setAnchorEl(event.currentTarget);
    setActiveFilter(filterId);
  };

  const handleFilterChange = (filterId: string, value: string) => {
    const newFilters = { ...filters, [filterId]: value };
    setFilters(newFilters);
    setAnchorEl(null);
    setActiveFilter(null);
    updateChartData(newFilters);
  };

  const updateChartData = (newFilters: Record<string, string>) => {
    // Base data representing social media metrics
    const baseData = [1200, 1900, 1500, 2100, 1800, 2400];
    
    // Realistic multipliers for social media analytics
    const multipliers: Record<string, number> = {
      // Metrics
      followers: 1,
      engagement_rate: 0.05, // Engagement rates are typically 2-5%
      reach: 2.5,
      impressions: 4.2,
      
      // Platforms (relative to Instagram baseline)
      instagram: 1,
      facebook: 0.7,
      linkedin: 0.4,
      tiktok: 1.3,
      
      // Content types
      all_content: 1,
      posts: 0.8,
      stories: 1.2,
      reels: 1.6, // Reels typically get higher engagement
      
      // Demographics
      all_users: 1,
      age_18_24: 1.4, // Younger users more active
      age_25_34: 1.1,
      age_35_plus: 0.6
    };

    const metricMultiplier = multipliers[newFilters.metric] || 1;
    const platformMultiplier = multipliers[newFilters.platform] || 1;
    const contentMultiplier = multipliers[newFilters.content_type] || 1;
    const demoMultiplier = multipliers[newFilters.demographics] || 1;
    
    const finalMultiplier = metricMultiplier * platformMultiplier * contentMultiplier * demoMultiplier;

    const newData = {
      ...chartData,
      datasets: chartData.datasets.map((dataset, index) => ({
        ...dataset,
        data: baseData.map(value => Math.round(value * finalMultiplier * (index === 0 ? 1 : 0.6)))
      }))
    };

    setChartData(newData as ChartData<'line' | 'bar'>);
  };

  const getFilterLabel = (filterId: string) => {
    const option = filterOptions[filterId as keyof typeof filterOptions]?.find(
      opt => opt.value === filters[filterId]
    );
    return option?.label || filters[filterId];
  };

  const renderInteractiveDescription = () => (
    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
      <Typography component="span" sx={{ fontSize: '0.9rem', mr: 1, color: '#64748b' }}>
        Measuring
      </Typography>
      <Chip
        label={getFilterLabel('metric')}
        onClick={(e) => handleFilterClick(e, 'metric')}
        sx={{ 
          fontSize: '0.85rem', 
          bgcolor: '#e0f2fe', 
          color: '#0277bd',
          fontWeight: 600,
          cursor: 'pointer',
          '&:hover': { bgcolor: '#b3e5fc' }
        }}
        deleteIcon={<ExpandMoreIcon />}
        onDelete={(e) => handleFilterClick(e, 'metric')}
      />

      <Typography component="span" sx={{ fontSize: '0.9rem', mr: 1, ml: 1, color: '#64748b' }}>
        on
      </Typography>
      <Chip
        label={getFilterLabel('platform')}
        onClick={(e) => handleFilterClick(e, 'platform')}
        sx={{ 
          fontSize: '0.85rem', 
          bgcolor: '#f3e5f5', 
          color: '#7b1fa2',
          fontWeight: 600,
          cursor: 'pointer',
          '&:hover': { bgcolor: '#e1bee7' }
        }}
        deleteIcon={<ExpandMoreIcon />}
        onDelete={(e) => handleFilterClick(e, 'platform')}
      />

      <Typography component="span" sx={{ fontSize: '0.9rem', mr: 1, ml: 1, color: '#64748b' }}>
        for
      </Typography>
      <Chip
        label={getFilterLabel('content_type')}
        onClick={(e) => handleFilterClick(e, 'content_type')}
        sx={{ 
          fontSize: '0.85rem', 
          bgcolor: '#e8f5e8', 
          color: '#2e7d32',
          fontWeight: 600,
          cursor: 'pointer',
          '&:hover': { bgcolor: '#c8e6c9' }
        }}
        deleteIcon={<ExpandMoreIcon />}
        onDelete={(e) => handleFilterClick(e, 'content_type')}
      />

      <Typography component="span" sx={{ fontSize: '0.9rem', mr: 1, ml: 1, color: '#64748b' }}>
        among
      </Typography>
      <Chip
        label={getFilterLabel('demographics')}
        onClick={(e) => handleFilterClick(e, 'demographics')}
        sx={{ 
          fontSize: '0.85rem', 
          bgcolor: '#fff3e0', 
          color: '#f57c00',
          fontWeight: 600,
          cursor: 'pointer',
          '&:hover': { bgcolor: '#ffe0b2' }
        }}
        deleteIcon={<ExpandMoreIcon />}
        onDelete={(e) => handleFilterClick(e, 'demographics')}
      />

      <Typography component="span" sx={{ fontSize: '0.9rem', mr: 1, ml: 1, color: '#64748b' }}>
        over the
      </Typography>
      <Chip
        label={getFilterLabel('timeframe')}
        onClick={(e) => handleFilterClick(e, 'timeframe')}
        sx={{ 
          fontSize: '0.85rem', 
          bgcolor: '#fce4ec', 
          color: '#c2185b',
          fontWeight: 600,
          cursor: 'pointer',
          '&:hover': { bgcolor: '#f8bbd9' }
        }}
        deleteIcon={<ExpandMoreIcon />}
        onDelete={(e) => handleFilterClick(e, 'timeframe')}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl) && Boolean(activeFilter)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: { mt: 1, minWidth: 200 }
        }}
      >
        {activeFilter && filterOptions[activeFilter as keyof typeof filterOptions]?.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => handleFilterChange(activeFilter, option.value)}
            selected={filters[activeFilter] === option.value}
            sx={{ fontSize: '0.9rem' }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  );

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 0, 
        borderRadius: 3, 
        bgcolor: '#fff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        width: '100%',
        maxWidth: '100%',
        mx: 'auto',
        my: 3
      }}
    >
      <Box sx={{ p: 4, pb: 2, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1.3rem' }}>{title}</Typography>
        <Link
          href="#"
          underline="hover"
          sx={{ fontSize: '0.95rem', color: '#2563eb', fontWeight: 500 }}
          onClick={onOpenChart}
        >
          Open Chart
        </Link>
      </Box>
      <Box sx={{ px: 4, pt: 3, pb: 2, minHeight: 480 }}>
        {type === 'line' ? (
          <Line data={chartData as ChartData<'line'>} options={defaultOptions} />
        ) : (
          <Bar data={chartData as ChartData<'bar'>} options={defaultOptions} />
        )}
      </Box>
      <Box sx={{ px: 4, pb: 4, pt: 2 }}>
        {renderInteractiveDescription()}
      </Box>
    </Paper>
  );
};

export default ChatChart; 