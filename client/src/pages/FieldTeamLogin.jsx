import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/api';
import { Box, Button, TextField, Snackbar, CircularProgress, Alert } from '@mui/material';
import AuthShell, { FieldLabel } from '../components/shell/AuthShell';

const FieldTeamLogin = () => {
  const [formData, setFormData] = useState({
    teamCode: '',
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
  const location = useLocation();
  const from = location.state?.from?.pathname || '/quiz';

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
      const { teamCode, quizCode } = formData;

      const response = await api.post('/field-teams/login', {
        teamCode,
        quizCode
      });

      if (!response.data.isValid) {
        throw new Error(response.data.message || 'Invalid credentials');
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
        quizCode: team.quizCode,
        teamCode: team.teamCode,
        isFieldTeam: true
      };

      sessionStorage.setItem('fieldTeamAuth', JSON.stringify(authData));
      sessionStorage.removeItem('quizResults');

      navigate(from, {
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

  return (
    <AuthShell
      title="Field team assessment"
      description="Enter your Team ID and the quiz code you were given to start the technical assessment."
      footer={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
          <img src="/images/reach_logo_new.svg" width={56} height={20} alt="Reach" style={{ objectFit: 'contain' }} />
          <span style={{ width: 1, height: 14, background: 'var(--border-strong)' }} />
          <img src="/images/Orange-Logo.png" width={18} height={18} alt="Orange" />
          <span>{settings?.clientName || 'OrangeJo'} · {settings?.projectName || 'FTTH Project'}</span>
        </Box>
      }
    >
      <Box component="form" noValidate onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FieldLabel htmlFor="teamCode" label="Team ID">
          <TextField
            id="teamCode"
            fullWidth
            name="teamCode"
            autoFocus
            autoComplete="off"
            placeholder="e.g. 5077"
            value={formData.teamCode}
            onChange={handleChange}
            disabled={loading}
          />
        </FieldLabel>
        <FieldLabel htmlFor="quizCode" label="Quiz code">
          <TextField
            id="quizCode"
            fullWidth
            name="quizCode"
            autoComplete="off"
            placeholder="Code from your supervisor"
            value={formData.quizCode}
            onChange={handleChange}
            disabled={loading}
          />
        </FieldLabel>
        <Button fullWidth size="large" variant="contained" type="submit" disabled={loading || !formData.teamCode || !formData.quizCode} sx={{ mt: 0.5 }}>
          {loading ? <CircularProgress size={18} sx={{ color: 'var(--on-accent)' }} /> : 'Start assessment'}
        </Button>
      </Box>

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
    </AuthShell>
  );
};

export default FieldTeamLogin;
