import React, { ReactElement } from 'react';
import { Box, Card, CardContent, Typography, SvgIconProps, CircularProgress } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactElement<SvgIconProps>;
  change?: {
    value: number;
    positive: boolean;
  };
  color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  change, 
  color = 'primary',
  loading = false 
}) => {
  const theme = useTheme();
  
  // Get the correct color from theme
  const getColorFromTheme = (colorName: string) => {
    switch(colorName) {
      case 'primary':
        return theme.palette.primary.main;
      case 'secondary':
        return theme.palette.secondary.main;
      case 'success':
        return theme.palette.success.main;
      case 'error':
        return theme.palette.error.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'info':
        return theme.palette.info.main;
      default:
        return theme.palette.primary.main;
    }
  };
  
  const colorValue = getColorFromTheme(color);

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <CardContent sx={{ position: 'relative', zIndex: 1, flexGrow: 1 }}>
        <Box 
          sx={{ 
            position: 'absolute',
            top: -25,
            right: -25,
            width: 100,
            height: 100,
            borderRadius: '50%',
            bgcolor: alpha(colorValue, 0.1),
            zIndex: 0,
          }}
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.secondary', fontSize: '0.875rem' }}>
            {title}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(colorValue, 0.1),
              color: colorValue,
              borderRadius: '50%',
              p: 1,
              width: 40,
              height: 40,
            }}
          >
            {icon}
          </Box>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <CircularProgress size={24} color={color} />
          </Box>
        ) : (
          <>
            <Typography variant="h4" component="div" sx={{ fontWeight: 600, mb: 1 }}>
              {value}
            </Typography>
            
            {change && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    bgcolor: change.positive ? 'success.light' : 'error.light',
                    color: change.positive ? 'success.dark' : 'error.dark',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  {change.positive ? '↑' : '↓'} {Math.abs(change.value)}%
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  vs last period
                </Typography>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard; 