import React from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { AppBar, Toolbar, Typography, Container, Box, IconButton, Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { logoutAuditUser } from '../../redux/slices/auditSlice';

import { ThemeProvider } from '@mui/material/styles';
import auditTheme from '../../theme/auditTheme';

const AuditLayout = () => {
  const { auditUser } = useSelector((state) => state.audit);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logoutAuditUser());
    navigate('/audit/login');
  };

  if (!auditUser) {
    return <Navigate to="/audit/login" replace />;
  }

  return (
    <ThemeProvider theme={auditTheme}>
      <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid #e0e0e0' }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
              Field Audit Portal
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' }, color: 'text.primary', fontWeight: 600 }}>
                {auditUser.name}
              </Typography>
              <IconButton color="default" onClick={handleLogout}>
                <LogoutIcon />
              </IconButton>
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
