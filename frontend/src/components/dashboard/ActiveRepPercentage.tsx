import React from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Mock data for active rep percentage
const monthlyData = [
  { month: 'Jan', gefa: 78, gels: 22 },
  { month: 'Feb', gefa: 66, gels: 34 },
  { month: 'Mar', gefa: 47, gels: 53 },
  { month: 'Apr', gefa: 58, gels: 42 },
  { month: 'May', gefa: 37, gels: 63 },
  { month: 'Jun', gefa: 78, gels: 22 },
  { month: 'Jul', gefa: 47, gels: 53 },
  { month: 'Aug', gefa: 60, gels: 40 },
  { month: 'Sep', gefa: 37, gels: 63 },
  { month: 'Oct', gefa: 80, gels: 20 },
  { month: 'Nov', gefa: 47, gels: 53 },
  { month: 'Dec', gefa: 60, gels: 40 },
];

const ActiveRepPercentage: React.FC = () => {
  const theme = useTheme();

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 1.5,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          }}
        >
          <Typography variant="subtitle2">{`${label}`}</Typography>
          {payload.map((item: any, index: number) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: item.color,
                  mr: 1,
                }}
              />
              <Typography variant="body2">
                {`${item.name.toUpperCase()}: ${item.value}%`}
              </Typography>
            </Box>
          ))}
        </Box>
      );
    }
    return null;
  };

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
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        ACTIVE REP PERCENTAGE
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mr: 3,
          }}
        >
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: 1,
              bgcolor: '#f44336',
              mr: 1,
            }}
          />
          <Typography variant="body2">GEFA</Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: 1,
              bgcolor: '#2196f3',
              mr: 1,
            }}
          />
          <Typography variant="body2">GELS</Typography>
        </Box>
      </Box>
      <Box sx={{ height: 300, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={monthlyData}
            margin={{
              top: 5,
              right: 30,
              left: 5,
              bottom: 5,
            }}
            barGap={0}
            barCategoryGap="30%"
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              domain={[0, 100]}
              unit="%"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="gefa"
              name="gefa"
              stackId="a"
              fill="#f44336"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="gels"
              name="gels"
              stackId="a"
              fill="#2196f3"
              radius={[0, 0, 4, 4]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default ActiveRepPercentage; 