import React from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
} from '@mui/material';
import { CloudOutlined as CloudIcon } from '@mui/icons-material';
import { TagCloud } from 'react-tagcloud';

// Mock data for keywords
const keywords = [
  { value: 'Great Wealth Advantage', count: 30 },
  { value: 'Great Life Advantage', count: 25 },
  { value: 'Investment', count: 22 },
  { value: 'Careshield', count: 19 },
  { value: 'Prestige Life Rewards', count: 18 },
  { value: 'LPA', count: 17 },
  { value: 'Cashback', count: 16 },
  { value: 'Interest Rate', count: 15 },
  { value: 'Returns', count: 14 },
  { value: 'Wealth', count: 14 },
  { value: 'Gift', count: 13 },
  { value: 'Savings', count: 13 },
  { value: 'Passive Income', count: 12 },
  { value: 'Will', count: 12 },
  { value: 'Great Cancer Guard', count: 11 },
  { value: 'Great SP', count: 11 },
  { value: 'Capital', count: 10 },
  { value: 'Dividend', count: 10 },
  { value: 'Trust Service', count: 9 },
  { value: 'Retirement', count: 9 },
  { value: 'Guaranteed', count: 8 },
  { value: 'Shield Plan', count: 8 },
  { value: 'Tax', count: 7 },
  { value: 'Debt Management', count: 7 },
  { value: 'Finance', count: 6 },
  { value: 'Lucky draw', count: 6 },
  { value: 'Risk', count: 5 },
  { value: 'Gains', count: 5 },
  { value: 'Giveaway', count: 4 },
  { value: 'Recruitment', count: 4 },
  { value: 'Fixed Deposit', count: 3 },
];

// Custom renderer for tag cloud
const customRenderer = (tag: any, size: number, color: string) => {
  return (
    <Typography
      component="span"
      key={tag.value}
      style={{
        fontSize: size,
        color,
        margin: '3px',
        padding: '3px',
        display: 'inline-block',
        cursor: 'pointer',
      }}
    >
      {tag.value}
    </Typography>
  );
};

const KeywordsCloud: React.FC = () => {
  const theme = useTheme();

  // Custom colorOptions for the tag cloud
  const colorOptions = {
    luminosity: 'bright',
    hue: 'red',
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        height: '100%',
        mb: 4,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <CloudIcon sx={{ color: theme.palette.info.main, mr: 1 }} />
        <Typography variant="h6" fontWeight="bold">
          KEYWORDS CLOUD
        </Typography>
      </Box>

      <Box
        sx={{
          p: 2,
          textAlign: 'center',
          height: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TagCloud
          minSize={12}
          maxSize={35}
          tags={keywords}
          colorOptions={colorOptions}
          renderer={customRenderer}
        />
      </Box>
    </Paper>
  );
};

export default KeywordsCloud; 