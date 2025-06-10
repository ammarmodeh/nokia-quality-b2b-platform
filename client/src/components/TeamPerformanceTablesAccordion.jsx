import { useState } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

const TableAccordion = ({ title, children, defaultExpanded = false, color = 'primary' }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleChange = () => {
    setExpanded(!expanded);
  };

  return (
    <Accordion
      expanded={expanded}
      onChange={handleChange}
      sx={{
        backgroundColor: 'transparent',
        boxShadow: 'none',
        border: '1px solid',
        borderColor: '#444', // Darker border color
        '&:before': {
          display: 'none'
        }
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore sx={{ color: '#fff' }} />} // Light color for the expand icon
        sx={{
          backgroundColor: '#1e1e1e', // Dark background color
          borderBottom: expanded ? '1px solid' : 'none',
          borderColor: '#444', // Darker border color
          minHeight: '48px',
          '& .MuiAccordionSummary-content': {
            alignItems: 'center',
            margin: '8px 0'
          }
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            color: '#3ea6ff', // Light color for the text
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0, backgroundColor: '#252525' }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
};

export default TableAccordion;
