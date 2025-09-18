import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { styled } from '@mui/material/styles';

const DemoBarContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.secondary.main,
  color: theme.palette.text.primary,
  padding: theme.spacing(0.4, 1.5),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1.5),
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: theme.zIndex.drawer + 2,
  borderBottom: `1px solid ${theme.palette.primary.main}`,
  minHeight: '28px',
  [theme.breakpoints.down('md')]: {
    gap: theme.spacing(1),
    padding: theme.spacing(0.3, 1.2),
  },
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'row',
    gap: theme.spacing(0.8),
    padding: theme.spacing(0.25, 0.8),
    justifyContent: 'space-between',
  },
}));

const DemoText = styled(Typography)(({ theme }) => ({
  fontSize: '12px',
  fontWeight: 500,
  color: theme.palette.text.primary,
  textAlign: 'center',
  [theme.breakpoints.down('md')]: {
    fontSize: '11px',
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '9px',
    flex: 1,
    textAlign: 'left',
  },
}));

const ScheduleButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.text.primary,
  border: `1px solid ${theme.palette.primary.dark}`,
  borderRadius: '4px',
  padding: theme.spacing(0.25, 1),
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'none',
  minWidth: 'auto',
  minHeight: '24px',
  transition: 'all 0.2s ease-in-out',
  backdropFilter: 'blur(10px)',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
    border: `1px solid ${theme.palette.primary.dark}`,
    transform: 'translateY(-1px)',
    boxShadow: `0 4px 12px rgba(98, 239, 131, 0.3)`,
  },
  '&:active': {
    transform: 'translateY(0)',
  },
  [theme.breakpoints.down('md')]: {
    fontSize: '11px',
    padding: theme.spacing(0.2, 0.8),
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '9px',
    padding: theme.spacing(0.2, 0.6),
    flexShrink: 0,
  },
}));

const DemoBar: React.FC = () => {
  const handleScheduleCall = () => {
    // You can replace this with your actual scheduling logic
    window.open('https://calendly.com/track-futura', '_blank');
  };

  return (
    <DemoBarContainer>
      <DemoText>
        You are currently in the Track Futura Demo.
      </DemoText>
      <ScheduleButton
        onClick={handleScheduleCall}
        variant="contained"
      >
        Schedule a call
      </ScheduleButton>
    </DemoBarContainer>
  );
};

export default DemoBar; 