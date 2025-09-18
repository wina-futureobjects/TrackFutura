import React from 'react';
import { Box, Card, CardContent, Typography, CardHeader, useTheme } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

// Mock data for sentiment analysis
const sentimentData = [
  { date: 'Jan', positive: 4000, neutral: 2400, negative: 1200 },
  { date: 'Feb', positive: 3000, neutral: 1398, negative: 2210 },
  { date: 'Mar', positive: 2000, neutral: 9800, negative: 2290 },
  { date: 'Apr', positive: 2780, neutral: 3908, negative: 2000 },
  { date: 'May', positive: 1890, neutral: 4800, negative: 2181 },
  { date: 'Jun', positive: 2390, neutral: 3800, negative: 2500 },
  { date: 'Jul', positive: 3490, neutral: 4300, negative: 2100 },
];

const SentimentChart = () => {
  const theme = useTheme();

  // Calculate sentiment score (average)
  const calculateSentimentScore = () => {
    const sum = sentimentData.reduce((acc, item) => {
      // Calculate a score between -1 and 1 based on the proportions
      const total = item.positive + item.neutral + item.negative;
      const score = (item.positive - item.negative) / total;
      return acc + score;
    }, 0);
    
    return (sum / sentimentData.length).toFixed(2);
  };

  const sentimentScore = calculateSentimentScore();
  
  // Determine sentiment label based on score
  const getSentimentLabel = (score: number) => {
    if (score >= 0.5) return 'Very Positive';
    if (score >= 0.2) return 'Positive';
    if (score >= -0.2) return 'Neutral';
    if (score >= -0.5) return 'Negative';
    return 'Very Negative';
  };
  
  // Get color based on sentiment
  const getSentimentColor = (score: number) => {
    if (score >= 0.5) return theme.palette.success.main;
    if (score >= 0.2) return theme.palette.success.light;
    if (score >= -0.2) return theme.palette.info.main;
    if (score >= -0.5) return theme.palette.error.light;
    return theme.palette.error.main;
  };

  return (
    <Card>
      <CardHeader 
        title="Sentiment Analysis" 
        subheader="Based on social media and web mentions"
        action={
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              backgroundColor: 'background.default',
              px: 2,
              py: 0.5,
              borderRadius: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              Sentiment Score:
            </Typography>
            <Typography 
              variant="body1" 
              fontWeight={600}
              sx={{ 
                color: getSentimentColor(parseFloat(sentimentScore)),
              }}
            >
              {sentimentScore} ({getSentimentLabel(parseFloat(sentimentScore))})
            </Typography>
          </Box>
        }
      />
      <CardContent>
        <Box sx={{ height: 300, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={sentimentData}
              margin={{
                top: 5,
                right: 30,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis 
                dataKey="date" 
                stroke={theme.palette.text.secondary}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              />
              <YAxis 
                stroke={theme.palette.text.secondary}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="positive" 
                stackId="1"
                stroke={theme.palette.success.main} 
                fill={theme.palette.success.light} 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="neutral" 
                stackId="1"
                stroke={theme.palette.info.main} 
                fill={theme.palette.info.light} 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="negative" 
                stackId="1"
                stroke={theme.palette.error.main} 
                fill={theme.palette.error.light} 
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SentimentChart; 