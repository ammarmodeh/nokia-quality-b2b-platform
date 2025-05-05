import { Box } from "@mui/material";
import { Block, Warning, CheckCircle } from "@mui/icons-material";

const ViolationThresholdBadge = ({ count }) => {
  const status = count >= 3 ? 'VIOLATED' : count === 2 ? 'WARNING' : 'OK';
  const Icon = count >= 3 ? Block : count === 2 ? Warning : CheckCircle;

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      backgroundColor: `rgba(${count >= 3 ? '244, 67, 54' :
        count === 2 ? '255, 152, 0' : '76, 175, 80'
        }, 0.4)`,
      color: "white",
      padding: "4px 8px",
      fontWeight: 'bold',
      fontSize: '0.8rem'
    }}>
      <Icon sx={{ mr: 0.5, fontSize: '1.1rem' }} />
      {status}
    </Box>
  );
};

export default ViolationThresholdBadge;