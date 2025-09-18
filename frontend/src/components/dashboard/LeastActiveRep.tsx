import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { TrendingDown as TrendingDownIcon } from '@mui/icons-material';

// Mock data for least active reps
const leastActiveReps = [
  { id: 1, name: 'Abu Ahmad', aicCode: '1234567', entity: 'GELS', lastActive: '2 weeks ago', avatar: '/avatars/abu.jpg' },
  { id: 2, name: 'Alissa Teoh', aicCode: '1234567', entity: 'GELS', lastActive: '2 weeks ago', avatar: '/avatars/alissa.jpg' },
  { id: 3, name: 'George', aicCode: '1234567', entity: 'GELS', lastActive: '2 weeks ago', avatar: '/avatars/george.jpg' },
  { id: 4, name: 'Akmal Hilmi', aicCode: '1234567', entity: 'GELS', lastActive: '2 weeks ago', avatar: '/avatars/akmal.jpg' },
  { id: 5, name: 'Jenny Yap', aicCode: '1234567', entity: 'GELS', lastActive: '1 week ago', avatar: '/avatars/jenny.jpg' },
  { id: 6, name: 'Herman', aicCode: '1234567', entity: 'GELS', lastActive: '1 week ago', avatar: '/avatars/herman.jpg' },
  { id: 7, name: 'Andy', aicCode: '1234567', entity: 'GELS', lastActive: '1 week ago', avatar: '/avatars/andy.jpg' },
  { id: 8, name: 'Shiela', aicCode: '1234567', entity: 'GELS', lastActive: '1 week ago', avatar: '/avatars/shiela.jpg' },
  { id: 9, name: 'Jonathan', aicCode: '1234567', entity: 'GELS', lastActive: '5 days ago', avatar: '/avatars/jonathan.jpg' },
  { id: 10, name: 'Muniandy', aicCode: '1234567', entity: 'GELS', lastActive: '5 days ago', avatar: '/avatars/muniandy.jpg' },
];

// Function to get entity color
const getEntityColor = (entity: string) => {
  switch (entity) {
    case 'GEFA':
      return '#f44336'; // red
    case 'GELS':
      return '#2196f3'; // blue
    default:
      return '#9e9e9e'; // grey
  }
};

// Function to get background color based on activity status
const getActivityColor = (lastActive: string) => {
  if (lastActive.includes('weeks')) {
    return '#FFEBEE'; // light red
  } else if (lastActive.includes('week')) {
    return '#E3F2FD'; // light blue
  } else {
    return '#E8F5E9'; // light green
  }
};

const LeastActiveRep: React.FC = () => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        height: '100%',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TrendingDownIcon sx={{ color: theme.palette.error.main, mr: 1 }} />
        <Typography variant="h6" fontWeight="bold">
          LEAST ACTIVE REP
        </Typography>
      </Box>

      <TableContainer sx={{ maxHeight: 320 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>AIC code</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Entity</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Last active</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leastActiveReps.map((rep) => (
              <TableRow 
                key={rep.id}
                sx={{ 
                  '&:hover': { bgcolor: theme.palette.action.hover },
                  cursor: 'pointer'
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar
                      src={rep.avatar}
                      alt={rep.name}
                      sx={{ width: 30, height: 30, mr: 1.5 }}
                    />
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {rep.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {rep.aicCode}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      color: getEntityColor(rep.entity),
                      fontWeight: 'medium',
                    }}
                  >
                    {rep.entity}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography 
                    variant="body2"
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      display: 'inline-block',
                      bgcolor: getActivityColor(rep.lastActive),
                      fontWeight: 'medium',
                    }}
                  >
                    {rep.lastActive}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default LeastActiveRep; 