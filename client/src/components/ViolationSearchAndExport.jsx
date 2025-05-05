import {
  TextField,
  IconButton,
  Tooltip,
  Stack,
  Typography,
  InputAdornment
} from "@mui/material";
import { RiFileExcel2Fill } from "react-icons/ri";
import { MdInfo, MdSearch } from "react-icons/md";
import { useMediaQuery } from "@mui/material";

const SearchAndExport = ({
  searchText,
  setSearchText,
  exportToExcel,
  onViolationInfoClick,
}) => {
  const isMobile = useMediaQuery('(max-width:503px)');

  return (
    <Stack
      direction={isMobile ? "column" : "row"}
      spacing={2}
      alignItems={isMobile ? "flex-start" : "center"}
      justifyContent="space-between"
    >
      <Typography
        variant="h6"
        fontWeight="bold"
        sx={{
          color: "#c2c2c2",
          fontSize: isMobile ? "0.9rem" : "1rem",
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        Team Violation Tracker
        <Tooltip title="Learn how violations are evaluated" arrow>
          <IconButton
            onClick={onViolationInfoClick}
            size="medium"
            sx={{ color: '#ffffff' }}
          >
            <MdInfo />
          </IconButton>
        </Tooltip>
      </Typography>

      <Stack direction="row" gap={1} alignItems="center">
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search teams, violations, status..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          sx={{
            backgroundColor: '#333',
            borderRadius: '4px',
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: '#444' },
              '&:hover fieldset': { borderColor: '#555' },
              '&.Mui-focused fieldset': { borderColor: '#3ea6ff' },
            },
            '& .MuiInputBase-input': {
              color: '#fff',
              fontSize: '0.875rem',
              padding: '8.5px 14px',
            },
            minWidth: isMobile ? '100%' : '300px',
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MdSearch style={{ color: '#9e9e9e' }} />
              </InputAdornment>
            ),
          }}
        />

        <Tooltip title="Export to Excel">
          <IconButton
            onClick={exportToExcel}
            size={isMobile ? "small" : "medium"}
            sx={{
              color: '#4caf50',
              '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.1)' }
            }}
          >
            <RiFileExcel2Fill fontSize={isMobile ? "16px" : "20px"} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
};

export default SearchAndExport;