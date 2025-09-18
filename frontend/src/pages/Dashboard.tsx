import React from 'react';
import { Box, Typography, Grid as MuiGrid, Container, Paper } from '@mui/material';
import TopPerformers from '../components/dashboard/TopPerformers';
import ActiveRepPercentage from '../components/dashboard/ActiveRepPercentage';
import LeastActiveRep from '../components/dashboard/LeastActiveRep';
import CloseMonitoring from '../components/dashboard/CloseMonitoring';
import PostDistribution from '../components/dashboard/PostDistribution';

// Create a Grid component that inherits from MuiGrid to fix type issues
const Grid = (props: any) => <MuiGrid {...props} />;

// For the KeywordsCloud component, we'll create a simpler version that doesn't depend on external libraries
const KeywordsCloud = () => {
  const keywords = [
    { text: 'Great Wealth Advantage', size: 30 },
    { text: 'Investment', size: 25 },
    { text: 'Careshield', size: 22 },
    { text: 'Prestige Life Rewards', size: 20 },
    { text: 'LPA', size: 18 },
    { text: 'Cashback', size: 18 },
    { text: 'Great Life Advantage', size: 24 },
    { text: 'Wealth', size: 16 },
    { text: 'Gift', size: 15 },
    { text: 'Savings', size: 14 },
    { text: 'Passive Income', size: 14 },
    { text: 'Will', size: 13 },
    { text: 'Great Cancer Guard', size: 20 },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 2,
        border: '1px solid #e0e0e0',
        height: '100%',
        mb: 4,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          KEYWORDS CLOUD
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          gap: 1.5,
        }}
      >
        {keywords.map((keyword, index) => (
          <Typography
            key={index}
            variant="body1"
            component="span"
            sx={{
              fontSize: `${keyword.size / 2 + 10}px`,
              color: getRandomColor(),
              fontWeight: keyword.size > 20 ? 'bold' : 'normal',
              display: 'inline-block',
              cursor: 'pointer',
              transition: 'transform 0.3s ease',
              '&:hover': {
                transform: 'scale(1.1)',
              },
            }}
          >
            {keyword.text}
          </Typography>
        ))}
      </Box>
    </Paper>
  );
};

// Helper function to generate random colors for the keyword cloud
const getRandomColor = () => {
  const colors = [
    '#f44336', // red
    '#e91e63', // pink
    '#9c27b0', // purple
    '#673ab7', // deep purple
    '#3f51b5', // indigo
    '#2196f3', // blue
    '#03a9f4', // light blue
    '#00bcd4', // cyan
    '#009688', // teal
    '#4caf50', // green
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const Dashboard: React.FC = () => {
  return (
    <Box sx={{ 
      width: '100%', 
      px: { xs: 2, md: 3 }, 
      py: 4,
      backgroundColor: '#f8f9fd' 
    }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
          Activity Performance
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          1 September 2024-30 September 2024
        </Typography>
      </Box>

      {/* Top Performers Section */}
      <Box sx={{ mb: 3 }}>
        <TopPerformers />
      </Box>

      {/* Middle Section - Active Rep % and Least Active */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <ActiveRepPercentage />
        </Grid>
        <Grid item xs={12} md={4}>
          <LeastActiveRep />
        </Grid>
      </Grid>

      {/* Close Monitoring Section */}
      <Box sx={{ mb: 3 }}>
        <CloseMonitoring />
      </Box>

      {/* Post Distribution Section */}
      <Box sx={{ mb: 3 }}>
        <PostDistribution />
      </Box>

      {/* Keywords Cloud Section */}
      <KeywordsCloud />
    </Box>
  );
};

export default Dashboard; 