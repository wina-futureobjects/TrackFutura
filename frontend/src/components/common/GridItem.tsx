import React, { ReactNode } from 'react';
import { Grid } from '@mui/material';

interface GridItemProps {
  children: ReactNode;
  xs?: number | boolean;
  sm?: number | boolean;
  md?: number | boolean;
  lg?: number | boolean;
  xl?: number | boolean;
}

const GridItem: React.FC<GridItemProps> = ({ children, xs, sm, md, lg, xl }) => {
  return (
    <Grid xs={xs} sm={sm} md={md} lg={lg} xl={xl}>
      {children}
    </Grid>
  );
};

export default GridItem; 