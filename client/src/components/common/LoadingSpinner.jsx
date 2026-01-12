import { Box, CircularProgress } from '@mui/material';
import PropTypes from 'prop-types';

/**
 * Unified Loading Spinner Component
 * 
 * @param {string} variant - 'page' (full-page centered), 'inline' (default), or 'button' (small for buttons)
 * @param {number} size - Custom size override (optional)
 * @param {string} color - Custom color override (optional, defaults to theme primary #7b68ee)
 */
const LoadingSpinner = ({ variant = 'inline', size, color = '#7b68ee', ...props }) => {
  // Determine size based on variant
  const getSize = () => {
    if (size) return size;

    switch (variant) {
      case 'page':
        return 40;
      case 'button':
        return 20;
      case 'inline':
      default:
        return 24;
    }
  };

  const spinnerSize = getSize();

  // For page variant, wrap in centered container
  if (variant === 'page') {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        p={4}
        {...props}
      >
        <CircularProgress
          size={spinnerSize}
          sx={{ color }}
        />
      </Box>
    );
  }

  // For inline and button variants, return just the spinner
  return (
    <CircularProgress
      size={spinnerSize}
      sx={{ color }}
      {...props}
    />
  );
};

LoadingSpinner.propTypes = {
  variant: PropTypes.oneOf(['page', 'inline', 'button']),
  size: PropTypes.number,
  color: PropTypes.string,
};

export default LoadingSpinner;
