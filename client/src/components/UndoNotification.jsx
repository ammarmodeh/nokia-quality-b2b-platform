import { useState, useEffect } from "react";
import { Alert, Button, Box, Typography } from "@mui/material";

const UndoNotification = ({ showUndo, onUndo }) => {
  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining());

  // Update time remaining every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const pendingUndo = JSON.parse(localStorage.getItem('pendingUndo'));
  if (!pendingUndo || !showUndo) return null;

  const { assessmentData } = pendingUndo;
  const formattedDate = new Date(assessmentData.assessmentDate).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Alert
      severity="info"
      action={
        <Button
          color="inherit"
          size="small"
          onClick={onUndo}
          sx={{ ml: 2 }}
        >
          UNDO DELETE
        </Button>
      }
      sx={{
        mb: 3,
        alignItems: 'center',
        '& .MuiAlert-message': { width: '100%' }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            {assessmentData.teamName} Assessment Deleted
          </Typography>
          <Typography variant="body2">
            Conducted by {assessmentData.conductedBy} on {formattedDate} • Score: {assessmentData.score}%
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ whiteSpace: 'nowrap', ml: 2 }}>
          Undo within: {Math.floor(timeRemaining)}h {Math.round((timeRemaining % 1) * 60)}m
        </Typography>
      </Box>
    </Alert>
  );
};

const calculateTimeRemaining = () => {
  const pendingUndo = localStorage.getItem('pendingUndo');
  if (!pendingUndo) return 0;

  const { deletionTime } = JSON.parse(pendingUndo);
  const deletionDate = new Date(deletionTime);
  const now = new Date();
  const hoursRemaining = 24 - (now - deletionDate) / (1000 * 60 * 60);

  return Math.max(0, hoursRemaining); // Return exact hours with decimals
};

export default UndoNotification;