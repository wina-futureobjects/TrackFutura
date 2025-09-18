import React from 'react';
import { Box, Card, CardContent, Typography, CardHeader, useTheme } from '@mui/material';
import {
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';

// Mock data for NPS scores
const npsData = [
  { score: 0, count: 12 },
  { score: 1, count: 15 },
  { score: 2, count: 18 },
  { score: 3, count: 22 },
  { score: 4, count: 25 },
  { score: 5, count: 30 },
  { score: 6, count: 25 },
  { score: 7, count: 40 },
  { score: 8, count: 45 },
  { score: 9, count: 50 },
  { score: 10, count: 40 },
];

// NPS categories
const categories = [
  { name: 'Detractors', range: [0, 6], color: '#E74C3C' },
  { name: 'Passives', range: [7, 8], color: '#F39C12' },
  { name: 'Promoters', range: [9, 10], color: '#2ECC71' },
];

const NPSChart: React.FC = () => {
  const theme = useTheme();

  // Calculate NPS score
  const calculateNPS = () => {
    let detractors = 0;
    let passives = 0;
    let promoters = 0;
    let total = 0;

    npsData.forEach(item => {
      total += item.count;
      
      if (item.score <= 6) {
        detractors += item.count;
      } else if (item.score <= 8) {
        passives += item.count;
      } else {
        promoters += item.count;
      }
    });

    const npsScore = Math.round((promoters / total) * 100 - (detractors / total) * 100);
    
    return {
      score: npsScore,
      detractors: {
        count: detractors,
        percentage: Math.round((detractors / total) * 100)
      },
      passives: {
        count: passives,
        percentage: Math.round((passives / total) * 100)
      },
      promoters: {
        count: promoters,
        percentage: Math.round((promoters / total) * 100)
      }
    };
  };

  const npsResult = calculateNPS();

  // Determine color for NPS score
  const getNPSColor = (score: number) => {
    if (score >= 50) return theme.palette.success.main;
    if (score >= 0) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  // Get bar color based on score
  const getBarColor = (score: number) => {
    const category = categories.find(
      cat => score >= cat.range[0] && score <= cat.range[1]
    );
    return category ? category.color : theme.palette.primary.main;
  };

  return (
    <Card>
      <CardHeader 
        title="Net Promoter Score (NPS)" 
        subheader="Based on customer feedback and social sentiment"
      />
      <CardContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: '1 1 auto', minWidth: { xs: '100%', md: '30%' } }}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h2" sx={{ 
                fontWeight: 700, 
                color: getNPSColor(npsResult.score),
                mb: 2
              }}>
                {npsResult.score}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                NPS Score
              </Typography>
              
              <Box sx={{ mt: 4 }}>
                {categories.map((category, index) => (
                  <Box key={index} sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          bgcolor: category.color,
                          mr: 1
                        }} 
                      />
                      <Typography variant="body2">{category.name}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={500}>
                      {category.name === 'Detractors' 
                        ? `${npsResult.detractors.percentage}%` 
                        : category.name === 'Passives'
                        ? `${npsResult.passives.percentage}%`
                        : `${npsResult.promoters.percentage}%`
                      }
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
          <Box sx={{ flex: '1 1 auto', minWidth: { xs: '100%', md: '65%' } }}>
            <Box sx={{ height: 300, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={npsData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 0,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis 
                    dataKey="score" 
                    stroke={theme.palette.text.secondary}
                    tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  />
                  <YAxis 
                    stroke={theme.palette.text.secondary}
                    tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [`${value} responses`, 'Count']}
                    labelFormatter={value => `Score: ${value}`}
                    contentStyle={{ 
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Bar dataKey="count" fill={theme.palette.primary.main}>
                    {npsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default NPSChart; 