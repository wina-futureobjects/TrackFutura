import React from 'react';
import { Typography, Container, Paper, Box } from '@mui/material';

const AdminDashboard: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Dashboard
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography variant="body1">
            Welcome to the admin dashboard. This is a placeholder component.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminDashboard; 