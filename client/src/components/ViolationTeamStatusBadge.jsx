import { Box } from "@mui/material";
import {
  PauseCircleOutline,
  Block,
  ExitToApp,
  BeachAccess,
  CheckCircle
} from "@mui/icons-material";

const TeamStatusBadge = ({ status }) => {
  const statusConfig = {
    'Suspended': { icon: PauseCircleOutline, color: '#f44336' },
    'Terminated': { icon: Block, color: '#f44336' },
    'Resigned': { icon: ExitToApp, color: '#9c27b0' },
    'On Leave': { icon: BeachAccess, color: '#2196f3' },
    'Active': { icon: CheckCircle, color: '#4caf50' },
    default: { icon: CheckCircle, color: '#ff9800' }
  };

  const { icon: Icon, color } = statusConfig[status] || statusConfig.default;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', color }}>
      <Icon sx={{ mr: 0.5, fontSize: '1.1rem' }} />
      {status}
    </Box>
  );
};

export default TeamStatusBadge;