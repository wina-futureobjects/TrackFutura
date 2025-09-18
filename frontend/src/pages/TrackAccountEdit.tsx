import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Breadcrumbs,
  Link,
  CircularProgress
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import EditIcon from '@mui/icons-material/Edit';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import TrackSourceForm from '../components/track-accounts/TrackSourceForm';
import { apiFetch } from '../utils/api';

interface TrackAccount {
  id: number;
  name: string;
}

const TrackAccountEdit = () => {
  const { accountId, organizationId, projectId } = useParams<{ 
    accountId?: string; 
    organizationId?: string;
    projectId?: string;
  }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<TrackAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add state for organization and project names
  const [organizationName, setOrganizationName] = useState('Organization');
  const [projectName, setProjectName] = useState('Project');

  // Fetch organization name
  useEffect(() => {
    if (!organizationId) return;
    
    apiFetch(`/api/users/organizations/${organizationId}/`)
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Failed to fetch organization');
      })
      .then(data => {
        setOrganizationName(data.name || 'Organization');
      })
      .catch(err => {
        console.error('Error fetching organization name:', err);
        setOrganizationName('Organization');
      });
  }, [organizationId]);

  // Fetch project name
  useEffect(() => {
    if (!projectId) return;
    
    apiFetch(`/api/users/projects/${projectId}/`)
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Failed to fetch project');
      })
      .then(data => {
        setProjectName(data.name || 'Project');
      })
      .catch(err => {
        console.error('Error fetching project name:', err);
        setProjectName('Project');
      });
  }, [projectId]);

  // Fetch source data
  useEffect(() => {
    if (!accountId) return;
    
    setLoading(true);
    
    apiFetch(`/track-accounts/sources/${accountId}/`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to load source');
        return response.json();
      })
      .then(sourceData => {
        setAccount(sourceData);
      })
      .catch(err => {
        console.error('Error loading data:', err);
        setError('Failed to load source data. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accountId]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !accountId) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h5" color="error" align="center">
          {error || 'Source ID is missing'}
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Edit Track Source
        </Typography>
        
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link 
            underline="hover" 
            color="inherit" 
            sx={{ display: 'flex', alignItems: 'center' }}
            onClick={() => navigate('/')}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </Link>
          {organizationId && (
            <Link
              underline="hover"
              color="inherit"
              sx={{ display: 'flex', alignItems: 'center' }}
              onClick={() => navigate(`/organizations/${organizationId}/projects`)}
            >
              {organizationName}
            </Link>
          )}
          {projectId && (
            <Link
              underline="hover"
              color="inherit"
              sx={{ display: 'flex', alignItems: 'center' }}
              onClick={() => navigate(`/organizations/${organizationId}/projects/${projectId}`)}
            >
              {projectName}
            </Link>
          )}
          <Link
            underline="hover"
            color="inherit"
            sx={{ display: 'flex', alignItems: 'center' }}
            onClick={() => {
              if (organizationId && projectId) {
                navigate(`/organizations/${organizationId}/projects/${projectId}/source-tracking/sources`);
              } else {
                navigate('/');
              }
            }}
          >
            <TrackChangesIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Input Source Tracking
          </Link>
          <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
            <EditIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Edit {account?.name || 'Source'}
          </Typography>
        </Breadcrumbs>
      </Box>
      
      <TrackSourceForm sourceId={accountId} organizationId={organizationId} projectId={projectId} />
    </Container>
  );
};

export default TrackAccountEdit; 