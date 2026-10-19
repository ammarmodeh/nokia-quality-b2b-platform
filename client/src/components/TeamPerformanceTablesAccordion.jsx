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
        borderColor: 'var(--border)', // Darker border color
        '&:before': {
          display: 'none'
        }
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore sx={{ color: 'var(--text)' }} />} // Light color for the expand icon
        sx={{
          backgroundColor: 'var(--surface)', // Dark background color
          borderBottom: expanded ? '1px solid' : 'none',
          borderColor: 'var(--border)', // Darker border color
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
            color: 'var(--accent-text)', // Light color for the text
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0, backgroundColor: 'var(--surface)' }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
};

export default TableAccordion;
