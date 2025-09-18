import React from 'react';
import { Box, Paper, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderIcon from '@mui/icons-material/Folder';

const FacebookSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const navigationItems = [
    { text: 'Facebook Data', icon: <CloudUploadIcon />, path: '/facebook-data' },
    { text: 'Data Folders', icon: <FolderIcon />, path: '/facebook-folders' },
  ];

  return (
    <Paper sx={{ mb: 3, borderRadius: 2 }}>
      <List component="nav" aria-label="facebook navigation">
        {navigationItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                },
                '&.Mui-selected:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.12)',
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default FacebookSidebar; 