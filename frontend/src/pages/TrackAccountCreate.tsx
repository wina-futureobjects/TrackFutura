import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  IconButton,
  Typography
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import BulkSourceCreate from '../components/track-accounts/BulkSourceCreate';

const TrackAccountCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { organizationId, projectId } = useParams<{ 
    organizationId?: string;
    projectId?: string;
  }>();

  // Handle going back to previous page
  const handleGoBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else if (organizationId && projectId) {
      navigate(`/organizations/${organizationId}/projects/${projectId}/source-tracking/sources`);
    } else {
      navigate(-1); // Go back one step in browser history
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Back Button Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <IconButton 
          onClick={handleGoBack}
          sx={{ mr: 2, color: 'primary.main' }}
          aria-label="go back"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#1e293b' }}>
          Add New Source
        </Typography>
      </Box>

      <BulkSourceCreate 
        organizationId={organizationId} 
        projectId={projectId}
        onSuccess={() => {
          // Navigate back to the sources list after successful creation
          if (organizationId && projectId) {
            navigate(`/organizations/${organizationId}/projects/${projectId}/source-tracking/sources`);
          } else {
            navigate('/');
          }
        }}
      />
    </Container>
  );
};

export default TrackAccountCreate; 