import { Fragment, useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel'; // Import CancelIcon for rejected state
import TextField from '@mui/material/TextField';
import api from '../api/api';

const BootstrapDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialogContent-root': {
    padding: theme.spacing(2),
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(1),
  },
  '& .MuiPaper-root': {
    boxShadow: 'none',
  },
}));

export default function NPSDialog({ open, handleClose, name }) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [action, setAction] = useState(null); // Track the action (agree/disagree)
  const [agreementStatus, setAgreementStatus] = useState(null); // Track agreement status

  // Fetch agreement status when the dialog is opened
  useEffect(() => {
    if (open) {
      const fetchAgreementStatus = async () => {
        try {
          const token = localStorage.getItem('accessToken');
          const response = await api.get(`/policies/agreement-status?name=${name}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          const data = response.data;

          if (data.success) {
            setAgreementStatus(data.agreementStatus); // Set the agreement status
          } else {
            // console.error('Failed to fetch agreement status:', data.message);
          }
        } catch (error) {
          // console.error('Error fetching agreement status:', error);
        }
      };
      fetchAgreementStatus();
    }
  }, [name, open]);

  const handleAgree = () => {
    setAction('agree');
    setPasswordDialogOpen(true);
  };

  const handleDisagree = () => {
    setAction('disagree');
    setPasswordDialogOpen(true);
  };

  const handlePasswordSubmit = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await api.post(
        '/policies/store-policy-action',
        { action, password, name },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = response.data;

      if (data.success) {
        setAgreementStatus(action); // Update the agreement status
        setPasswordDialogOpen(false);
        setPassword('');
        alert('Action successfully stored in the database.');
      } else {
        alert('Invalid password or failed to store action.');
      }
    } catch (error) {
      // console.error('Error:', error);
      alert(error.response.data.message || 'An error occurred while processing your request.');
    }
  };

  return (
    <Fragment>
      {/* Main Policy Dialog */}
      <BootstrapDialog
        onClose={handleClose}
        aria-labelledby="customized-dialog-title"
        open={open}
      >
        <DialogTitle
          sx={{ m: 0, p: 2 }}
          id="customized-dialog-title"
          className="bg-[#a9a9a9] dark:text-white"
        >
          Customer Satisfaction Violation Policy
        </DialogTitle>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 10,
            color: 'black',
          }}
          className="bg-[#949292]"
        >
          <CloseIcon />
        </IconButton>
        <DialogContent dividers className="bg-[#302f2f] dark:text-gray-300">
          <Typography variant="h6" gutterBottom className="dark:text-white">
            1. Detractor Customers (Score 1-6)
          </Typography>
          <Typography gutterBottom className="dark:text-gray-300">
            <strong>Violation Consequences:</strong>
          </Typography>
          <Typography gutterBottom className="dark:text-gray-300">
            • First-time offense: Verbal warning and mandatory coaching session on quality improvement.
          </Typography>
          <Typography gutterBottom className="dark:text-gray-300">
            • Second-time offense (within 3 months): Formal warning and financial deduction (if applicable).
          </Typography>
          <Typography gutterBottom className="dark:text-gray-300">
            • Third-time offense (3+ occurrences within 6 months): Stronger penalties such as long-term suspension. Upon returning, the individual must attend a performance review meeting.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }} className="dark:text-white">
            2. Passive Customers (Score 7-8)
          </Typography>
          <Typography gutterBottom className="dark:text-gray-300">
            <strong>Violation Consequences:</strong>
          </Typography>
          <Typography gutterBottom className="dark:text-gray-300">
            • First-time offense: Verbal warning and guidance on improvement areas.
          </Typography>
          <Typography gutterBottom className="dark:text-gray-300">
            • Second-time offense (within 3 months): Performance improvement session.
          </Typography>
          <Typography gutterBottom className="dark:text-gray-300">
            • Third-time offense (3+ occurrences within 6 months): Closer monitoring. If another passive customer is recorded, it will be counted as one detractor in impact scaling, leading to the same consequence as a first-time detractor offense.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }} className="dark:text-white">
            Fairness Measures Considerations:
          </Typography>
          <Typography gutterBottom className="dark:text-gray-300">
            • <strong>Customer Issue Validation:</strong> Before penalizing a team, confirm whether the customer’s issue resulted from an actual violation or external factors (e.g., unresolved technical issues).
          </Typography>
          <Typography gutterBottom className="dark:text-gray-300">
            • <strong>Impact Scaling:</strong> Every three passive customer cases will be considered equivalent to one detractor.
          </Typography>
        </DialogContent>
        <DialogActions className="bg-[#949292] p-4">
          {agreementStatus ? (
            agreementStatus === 'agree' ? (
              <CheckIcon sx={{ color: 'green', fontSize: 30 }} />
            ) : (
              <CancelIcon sx={{ color: 'red', fontSize: 30 }} />
            )
          ) : (
            <>
              <Button
                onClick={handleAgree}
                sx={{
                  backgroundColor: "green",
                  color: "white",
                  "&:hover": {
                    backgroundColor: "#4caf50",
                  },
                }}
                disableElevation
                disableRipple
              >
                Agree
              </Button>
              <Button
                onClick={handleDisagree}
                sx={{
                  backgroundColor: "red",
                  color: "white",
                  "&:hover": {
                    backgroundColor: "#d32f2f",
                  },
                }}
                disableElevation
                disableRipple
              >
                Disagree
              </Button>
            </>
          )}
          <Button
            onClick={handleClose}
            sx={{
              backgroundColor: "gray",
              color: "black",
              "&:hover": {
                backgroundColor: "#d1d1d1",
              },
            }}
            disableElevation
            disableRipple
          >
            Close
          </Button>
        </DialogActions>
      </BootstrapDialog>

      {/* Password Dialog */}
      <Dialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
      >
        <DialogTitle>Enter Password</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Document Name: <strong>{name}</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
          <Button onClick={handlePasswordSubmit}>Submit</Button>
        </DialogActions>
      </Dialog>
    </Fragment>
  );
}