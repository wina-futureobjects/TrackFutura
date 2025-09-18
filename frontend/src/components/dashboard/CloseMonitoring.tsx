import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  useTheme,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from '@mui/material';
import { RemoveRedEye as MonitorIcon } from '@mui/icons-material';

// Mock data for close monitoring
const monitoringData = [
  { id: 1, name: 'Adam Li', aicCode: '1234567', entity: 'GELS', avatar: '/avatars/adam-li.jpg' },
  { id: 2, name: 'Ravi Shankar', aicCode: '1234567', entity: 'GELS', avatar: '/avatars/ravi.jpg' },
  { id: 3, name: 'Chen Wei', aicCode: '1234567', entity: 'GELS', avatar: '/avatars/chen.jpg' },
  { id: 4, name: 'Aisha Noor', aicCode: '1234567', entity: 'GELS', avatar: '/avatars/aisha.jpg' },
  { id: 5, name: 'Devi Priya', aicCode: '1234567', entity: 'GELS', avatar: '/avatars/devi.jpg' },
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

const CloseMonitoring: React.FC = () => {
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
        <MonitorIcon sx={{ color: theme.palette.warning.main, mr: 1 }} />
        <Typography variant="h6" fontWeight="bold">
          CLOSE MONITORING
        </Typography>
      </Box>

      <List sx={{ p: 0 }}>
        {monitoringData.map((person, index) => (
          <React.Fragment key={person.id}>
            <ListItem
              alignItems="center"
              sx={{
                py: 1.5,
                px: 0,
                cursor: 'pointer',
                '&:hover': { bgcolor: theme.palette.action.hover },
              }}
            >
              <ListItemAvatar>
                <Avatar
                  src={person.avatar}
                  alt={person.name}
                  sx={{ 
                    width: 48, 
                    height: 48,
                    border: `2px solid ${getEntityColor(person.entity)}`,
                  }}
                />
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography variant="body1" fontWeight="medium">
                    {person.name}
                  </Typography>
                }
                secondary={
                  <Box sx={{ display: 'flex', mt: 0.5 }}>
                    <Typography variant="caption" color="textSecondary" sx={{ mr: 1 }}>
                      {person.aicCode}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: getEntityColor(person.entity),
                        fontWeight: 'bold',
                      }}
                    >
                      {person.entity}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
            {index < monitoringData.length - 1 && (
              <Divider variant="inset" component="li" />
            )}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default CloseMonitoring; 