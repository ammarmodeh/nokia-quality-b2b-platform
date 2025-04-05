import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';

const FieldTeamLogin = () => {
  const [teamId, setTeamId] = useState('');
  const [quizCode, setQuizCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const navigate = useNavigate();

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/field-teams/validate-team', {
        teamId,
        quizCode
      });

      if (response.data.isValid) {
        const team = response.data.team;

        if (!team.canTakeQuiz) {
          throw new Error('This team is not authorized to take the quiz');
        }

        // Clear any previous quiz results
        sessionStorage.removeItem('quizResults');

        // Navigate to quiz
        navigate('/quiz', {
          state: {
            teamId: team._id,
            teamName: team.teamName,
            isFieldTeam: true,
            quizCode: quizCode
          },
          replace: true
        });
      } else {
        throw new Error(response.data.message || 'Invalid team ID or quiz code');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || err.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#121212',
        p: 2
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 500,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          backgroundColor: '#1e1e1e',
          border: '1px solid #333'
        }}
      >
        <Typography variant="h4" component="h1" align="center" gutterBottom sx={{ color: '#ffffff' }}>
          Field Team Login
        </Typography>

        <Typography variant="body1" align="center" sx={{ mb: 2, color: '#9e9e9e' }}>
          Enter your Team ID and Quiz Code
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Team ID"
            variant="outlined"
            margin="normal"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            disabled={loading}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#444',
                },
                '&:hover fieldset': {
                  borderColor: '#555',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#3ea6ff',
                },
                color: '#ffffff',
              },
              '& .MuiInputLabel-root': {
                color: '#9e9e9e',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#3ea6ff',
              },
            }}
          />

          <TextField
            fullWidth
            label="Quiz Code"
            variant="outlined"
            margin="normal"
            value={quizCode}
            onChange={(e) => setQuizCode(e.target.value)}
            disabled={loading}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#444',
                },
                '&:hover fieldset': {
                  borderColor: '#555',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#3ea6ff',
                },
                color: '#ffffff',
              },
              '& .MuiInputLabel-root': {
                color: '#9e9e9e',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#3ea6ff',
              },
            }}
          />

          <Button
            fullWidth
            variant="contained"
            color="primary"
            type="submit"
            disabled={loading || !teamId || !quizCode}
            sx={{
              mt: 2,
              height: 48,
              backgroundColor: '#3ea6ff',
              '&:hover': {
                backgroundColor: '#1d4ed8',
              }
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Start Quiz'
            )}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FieldTeamLogin;
