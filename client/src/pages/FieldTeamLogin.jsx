import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Snackbar,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';

const FieldTeamLogin = () => {
  const [formData, setFormData] = useState({
    teamId: '',
    quizCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'error'
  });
  const [settings, setSettings] = useState(null);
  const navigate = useNavigate();

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { teamId, quizCode } = formData;

      const response = await api.post('/field-teams/validate-team', {
        teamId,
        quizCode
      });

      if (!response.data.isValid) {
        throw new Error(response.data.message || 'Invalid team ID or quiz code');
      }

      const team = response.data.team;
      // console.log({ team });
      if (!team.canTakeQuiz) {
        throw new Error('This team is not authorized to take the quiz');
      }

      const authData = {
        teamId: team._id,
        teamName: team.teamName,
        teamCompany: team.teamCompany,
        quizCode,
        isFieldTeam: true
      };

      sessionStorage.setItem('fieldTeamAuth', JSON.stringify(authData));
      sessionStorage.removeItem('quizResults');

      navigate('/quiz', {
        state: { fieldTeamAuth: authData },
        replace: true
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || err.message || 'Authentication failed',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const textFieldStyles = {
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: '#3d3d3d' },
      '&:hover fieldset': { borderColor: '#555' },
      '&.Mui-focused fieldset': { borderColor: '#7b68ee' },
      color: '#ffffff',
    },
    '& .MuiInputLabel-root': {
      color: '#b3b3b3',
      '&.Mui-focused': { color: '#7b68ee' }
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#2d2d2d',
      p: 2
    }}>
      <Paper elevation={3} sx={{
        p: 4,
        width: '100%',
        maxWidth: 500,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        backgroundColor: '#2d2d2d',
        border: '1px solid #f3f4f6'
      }}>
        <Typography variant="h4" component="div" align="center" gutterBottom sx={{ color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0 }}>
          <img src="/images/reach_logo_new.svg" width={100} height={100} alt="ReachLogo" />
          <img src="/images/Orange-Logo.png" width={40} height={40} alt="Orange Logo" />
        </Typography>
        <Typography variant="p" component="div" align="center" gutterBottom sx={{ color: '#ffffff', fontSize: '12px' }}>
          <span style={{ fontWeight: 'bold', color: '#ff9800' }}>{settings?.clientName || "OrangeJo"}</span> {settings?.projectName || "FTTH Project"}
        </Typography>

        <Divider sx={{ borderColor: '#f3f4f6' }} />

        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom sx={{ color: '#ffffff' }}>
            Field Team Login
          </Typography>

          <Typography variant="body1" align="center" sx={{ color: '#b3b3b3' }}>
            Enter your Team ID and Quiz Code
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            name="teamId"
            label="Team ID"
            variant="outlined"
            margin="normal"
            value={formData.teamId}
            onChange={handleChange}
            disabled={loading}
            sx={textFieldStyles}
            autoComplete="off"
          />

          <TextField
            fullWidth
            name="quizCode"
            label="Quiz Code"
            variant="outlined"
            margin="normal"
            value={formData.quizCode}
            onChange={handleChange}
            disabled={loading}
            sx={textFieldStyles}
            autoComplete="off"
          />

          <Button
            fullWidth
            variant="contained"
            type="submit"
            disabled={loading || !formData.teamId || !formData.quizCode}
            sx={{
              mt: 2,
              height: 48,
              backgroundColor: '#7b68ee',
              '&:hover': { backgroundColor: '#1d4ed8' }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Start Quiz'}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
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