import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import { Star as StarIcon } from '@mui/icons-material';

// Mock data for top performers
const topPerformers = [
  { id: 1, name: 'Ali Abu', dept: 'GEFA', posts: 30, avatar: '/avatars/ali.jpg', initial: 'A' },
  { id: 2, name: 'Tania Tan', dept: 'GELS', posts: 28, avatar: '/avatars/tania.jpg', initial: 'T' },
  { id: 3, name: 'David', dept: 'GEFA', posts: 26, avatar: '', initial: 'D' },
  { id: 4, name: 'Melissa Lee', dept: 'GELS', posts: 25, avatar: '/avatars/melissa.jpg', initial: 'M' },
  { id: 5, name: 'Lim Jie', dept: 'GELS', posts: 24, avatar: '/avatars/lim.jpg', initial: 'L' },
  { id: 6, name: 'Ahmad', dept: 'GEFA', posts: 22, avatar: '', initial: 'A' },
  { id: 7, name: 'Ravi', dept: 'GEFA', posts: 20, avatar: '', initial: 'R' },
  { id: 8, name: 'Joan Priyanka', dept: 'GELS', posts: 18, avatar: '/avatars/joan.jpg', initial: 'J' },
  { id: 9, name: 'Tanusha Dewi', dept: 'GELS', posts: 17, avatar: '', initial: 'T' },
  { id: 10, name: 'Adam Wong', dept: 'GEFA', posts: 16, avatar: '/avatars/adam.jpg', initial: 'A' },
];

// Function to get department color
const getDeptColor = (dept: string) => {
  switch (dept) {
    case 'GEFA':
      return '#f44336'; // red
    case 'GELS':
      return '#2196f3'; // blue
    case 'ALL':
      return '#4caf50'; // green
    default:
      return '#9e9e9e'; // grey
  }
};

const TopPerformers: React.FC = () => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        mb: 4,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <StarIcon sx={{ color: '#FF5722', mr: 1 }} />
        <Typography variant="h6" fontWeight="bold">
          TOP 10 ACTIVE REP
        </Typography>
        
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
          <Chip 
            label="Filter" 
            variant="outlined" 
            size="small" 
            sx={{ 
              borderRadius: '16px',
              '& .MuiChip-label': {
                px: 2
              }
            }} 
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 1, overflowX: 'auto', pb: 2 }}>
        {topPerformers.map((performer) => (
          <Card 
            key={performer.id}
            elevation={0}
            sx={{ 
              minWidth: 95, 
              textAlign: 'center',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              transition: 'all 0.3s',
              '&:hover': {
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                transform: 'translateY(-5px)'
              }
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ position: 'relative', mb: 1 }}>
                {performer.avatar ? (
                  <Avatar
                    src={performer.avatar}
                    alt={performer.name}
                    sx={{ 
                      width: 56, 
                      height: 56, 
                      mx: 'auto',
                      border: `2px solid ${getDeptColor(performer.dept)}` 
                    }}
                  />
                ) : (
                  <Avatar
                    sx={{ 
                      width: 56, 
                      height: 56, 
                      mx: 'auto',
                      bgcolor: getDeptColor(performer.dept),
                      color: '#fff',
                      fontSize: '1.5rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {performer.initial}
                  </Avatar>
                )}
              </Box>
              
              <Typography variant="body2" noWrap>
                {performer.name}
              </Typography>
              
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                {performer.dept}
              </Typography>
              
              <Typography variant="h5" fontWeight="bold" sx={{ mt: 1, color: getDeptColor(performer.dept) }}>
                {performer.posts}
              </Typography>
              
              <Typography variant="caption" color="textSecondary">
                Post
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Paper>
  );
};

export default TopPerformers; 