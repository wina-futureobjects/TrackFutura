import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import { Box, CssBaseline } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';
import DemoBar from '../DemoBar';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

const drawerWidth = 260;
const miniDrawerWidth = 64;
const demoBarHeight = 28;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' && prop !== 'isMobile' })<{
  open?: boolean;
  isMobile?: boolean;
}>(({ theme, open, isMobile }) => ({
  flexGrow: 1,
  padding: 0,
  marginTop: '84px',
  marginLeft: '0 !important',
  transition: theme.transitions.create(['width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(isMobile && {
    width: '100%',
  }),
  ...(!isMobile && {
    width: `calc(100% - ${open ? drawerWidth : miniDrawerWidth}px)`,
    transition: theme.transitions.create(['width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
  '&.css-1riye17, &[class*="css-"]': {
    marginLeft: '0 !important',
  },
}));

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isLarge = useMediaQuery(theme.breakpoints.up('lg'));
  const [open, setOpen] = useState(isLarge);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const toggleDrawer = () => {
    setOpen(!open);
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        minHeight: '100vh', 
        bgcolor: 'background.default', 
        overflow: 'hidden',
        position: 'relative',
        margin: 0,
        padding: 0,
        width: '100%',
      }}
    >
      <CssBaseline />
      <DemoBar />
      <Header open={open} onToggle={toggleDrawer} showSidebarToggle={true} />
      <Sidebar open={open} onClose={handleDrawerClose} onToggle={toggleDrawer} />
      <Main open={open} isMobile={isMobile}>
        <Box
          sx={{
            height: 'calc(100vh - 84px)',
            overflow: 'auto',
            width: '100%',
            p: 0.5,
            margin: 0,
          }}
        >
          {children}
        </Box>
      </Main>
    </Box>
  );
};

export default Layout; 