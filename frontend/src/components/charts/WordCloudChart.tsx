import React from 'react';
import { Box, Card, CardContent, Typography, CardHeader, useTheme } from '@mui/material';

interface WordCloudWord {
  text: string;
  value: number;
}

// Mock data for word cloud
const mockWords: WordCloudWord[] = [
  { text: 'Digital', value: 64 },
  { text: 'Social', value: 50 },
  { text: 'Media', value: 43 },
  { text: 'Analysis', value: 37 },
  { text: 'Sentiment', value: 32 },
  { text: 'Brand', value: 30 },
  { text: 'Marketing', value: 28 },
  { text: 'Platform', value: 25 },
  { text: 'Customer', value: 24 },
  { text: 'Engagement', value: 23 },
  { text: 'Content', value: 22 },
  { text: 'Strategy', value: 21 },
  { text: 'Campaign', value: 20 },
  { text: 'Audience', value: 19 },
  { text: 'Influence', value: 18 },
  { text: 'Trend', value: 17 },
  { text: 'Data', value: 16 },
  { text: 'Analytics', value: 15 },
  { text: 'Reputation', value: 14 },
  { text: 'Metrics', value: 13 },
  { text: 'Feedback', value: 12 },
  { text: 'Performance', value: 11 },
  { text: 'Awareness', value: 10 },
  { text: 'Visibility', value: 9 },
  { text: 'Experience', value: 8 },
];

const WordCloudChart: React.FC = () => {
  const theme = useTheme();

  // Due to library compatibility issues with React 19, we'll simulate the word cloud with a custom component
  // Normally, we would use react-wordcloud or another library
  
  // Helper function to get random position for demo purposes
  const getRandomPosition = () => {
    const positions = ['center', 'flex-start', 'flex-end'];
    return positions[Math.floor(Math.random() * positions.length)];
  };
  
  // Helper function to determine font size based on value
  const getFontSize = (value: number) => {
    const minSize = 12;
    const maxSize = 40;
    const minValue = 8;
    const maxValue = 64;
    
    return minSize + ((value - minValue) / (maxValue - minValue)) * (maxSize - minSize);
  };
  
  return (
    <Card>
      <CardHeader 
        title="Popular Topics & Keywords" 
        subheader="Most frequently mentioned terms across platforms"
      />
      <CardContent>
        <Box 
          sx={{ 
            height: 300, 
            width: '100%', 
            display: 'flex', 
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            p: 2
          }}
        >
          {mockWords.map((word, index) => (
            <Box
              key={index}
              sx={{
                position: 'absolute',
                top: `${Math.random() * 70 + 15}%`,
                left: `${Math.random() * 70 + 15}%`,
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                justifyContent: getRandomPosition(),
                alignItems: getRandomPosition(),
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  fontSize: getFontSize(word.value),
                  fontWeight: word.value > 30 ? 600 : 400,
                  color: word.value > 40 
                    ? theme.palette.primary.main 
                    : word.value > 20 
                    ? theme.palette.text.primary 
                    : theme.palette.text.secondary,
                  opacity: word.value / 64, // Max value is 64
                  transform: `rotate(${Math.random() * 20 - 10}deg)`,
                  px: 1,
                }}
              >
                {word.text}
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default WordCloudChart; 