import React from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { AppBar, Toolbar, Typography, Container, Box, IconButton, Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { logoutAuditUser } from '../../redux/slices/auditSlice';

import { ThemeProvider } from '@mui/material/styles';
import auditTheme from '../../theme/auditTheme';

const AuditLayout = () => {
  const { auditUser } = useSelector((state) => state.audit);
  const { user: mainUser } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logoutAuditUser());
    navigate('/audit/login');
  };

  // Determine the effective user (either auditUser or main admin)
  const effectiveUser = auditUser || (mainUser?.role === 'Admin' ? mainUser : null);

  if (!effectiveUser) {
    return <Navigate to="/audit/login" replace />;
  }

  // Path-based role restriction: /audit/admin requires Admin role
  if (location.pathname.startsWith('/audit/admin') && effectiveUser.role !== 'Admin') {
    return <Navigate to="/audit/tasks" replace />;
  }

  return (
    <ThemeProvider theme={auditTheme}>
      <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid #e0e0e0' }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
              Field Audit Portal
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' }, color: 'text.primary', fontWeight: 600 }}>
                {effectiveUser.name}
              </Typography>

              {mainUser?.role === 'Admin' ? (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DashboardIcon />}
                  onClick={() => navigate('/dashboard')}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '8px',
                    borderColor: 'rgba(0,0,0,0.12)',
                    color: 'text.primary',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'rgba(0,0,0,0.04)'
                    }
                  }}
                >
                  Back to Dashboard
                </Button>
              ) : (
                <IconButton color="default" onClick={handleLogout} title="Exit Portal">
                  <LogoutIcon />
                </IconButton>
              )}
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 2 } }}>
          <Outlet />
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default AuditLayout;
