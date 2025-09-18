import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import BusinessIcon from '@mui/icons-material/Business';

/**
 * Page shown when users try to access invalid routes or routes without proper organization/project context
 */
const InvalidRoutePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoHome = () => {
    navigate('/organizations');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Paper
        sx={{
          p: 4,
          maxWidth: 600,
          textAlign: 'center',
          borderRadius: 3,
          boxShadow: 3,
        }}
      >
        <BusinessIcon
          sx={{
            fontSize: 80,
            color: 'primary.main',
            mb: 2,
          }}
        />
        
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Invalid Route
        </Typography>
        
        <Typography variant="h6" color="text.secondary" paragraph>
          The page you're trying to access requires organization and project context.
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
          <Typography variant="body2">
            <strong>Why am I seeing this?</strong><br />
            Track-Futura requires you to first select an organization, then a project, 
            before accessing any features. This ensures your data is properly organized 
            and secure.
          </Typography>
        </Alert>

        <Typography variant="body2" color="text.secondary" paragraph>
          Attempted to access: <code>{location.pathname}</code>
        </Typography>
        
        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={handleGoHome}
            sx={{
              borderRadius: 2,
              bgcolor: '#62EF83',
              color: '#000000',
              textTransform: 'none',
              fontWeight: 500,
              boxShadow: 'none',
              px: 3,
              py: 1,
              '&:hover': {
                bgcolor: '#4FD16C',
                boxShadow: '0 2px 8px rgba(98, 239, 131, 0.3)',
              },
            }}
          >
            Select Organization
          </Button>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          You'll be redirected to this page after selecting your project.
        </Typography>
      </Paper>
    </Box>
  );
};

export default InvalidRoutePage; 