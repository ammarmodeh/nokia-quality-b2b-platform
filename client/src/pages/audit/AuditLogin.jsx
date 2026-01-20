import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert
} from "@mui/material";
import { loginAuditUser, resetAuditState } from "../../redux/slices/auditSlice";

const AuditLogin = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { auditUser, isLoading, isError, isSuccess, message } = useSelector((state) => state.audit);
  const { user: mainUser } = useSelector((state) => state.auth);

  useEffect(() => {
    // If main dashboard user is Admin, auto-redirect to audit tasks
    if (mainUser?.role === 'Admin') {
      navigate("/audit/tasks");
      return;
    }

    if (isError) {
      // toast.error(message);
    }
    if (isSuccess || auditUser) {
      dispatch(resetAuditState())
      if (auditUser?.role === 'Admin') {
        navigate("/audit/admin");
      } else {
        navigate("/audit/tasks");
      }
    }
  }, [auditUser, isError, isSuccess, message, navigate, dispatch]);

  const onSubmit = (data) => {
    dispatch(loginAuditUser(data));
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      backgroundColor: '#000000',
      p: 2,
    }}>
      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            display: 'inline-flex',
            p: 1.5,
            mb: 2,
            border: '2px solid #0070f3',
          }}>
            <img src="/11319783.png" alt="Logo" style={{ width: '48px', height: '48px' }} />
          </Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: '#ffffff',
              mb: 1,
              letterSpacing: '-1px',
              textTransform: 'uppercase'
            }}
          >
            Auditor Portal
          </Typography>
          <Typography variant="body2" sx={{ color: '#888888', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}>
            Quality Inspection System
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            background: '#0a0a0a',
            borderRadius: 0,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            p: 4,
            width: '100%',
          }}
        >
          {isError && (
            <Alert
              severity="error"
              variant="outlined"
              sx={{
                width: '100%',
                mb: 3,
                borderRadius: 0,
                color: '#ff4d4d',
                borderColor: '#ff4d4d'
              }}
            >
              {message}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                required
                fullWidth
                id="username"
                label="USERNAME"
                name="username"
                autoComplete="username"
                autoFocus
                {...register("username", { required: "Username is required" })}
                error={!!errors.username}
                helperText={errors.username?.message}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 0,
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                    '&:hover fieldset': { borderColor: '#0070f3' },
                    '&.Mui-focused fieldset': { borderColor: '#0070f3' },
                  }
                }}
              />
              <TextField
                required
                fullWidth
                name="password"
                label="PASSWORD"
                type="password"
                id="password"
                autoComplete="current-password"
                {...register("password", { required: "Password is required" })}
                error={!!errors.password}
                helperText={errors.password?.message}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 0,
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                    '&:hover fieldset': { borderColor: '#0070f3' },
                    '&.Mui-focused fieldset': { borderColor: '#0070f3' },
                  }
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading}
                sx={{
                  mt: 2,
                  py: 1.5,
                  borderRadius: 0,
                  backgroundColor: '#0070f3',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  letterSpacing: '1px',
                  '&:hover': {
                    backgroundColor: '#005bc4',
                  },
                }}
              >
                {isLoading ? <CircularProgress size={24} sx={{ color: '#ffffff' }} /> : "AUTHENTICATE"}
              </Button>
              <Button
                fullWidth
                variant="text"
                onClick={() => navigate("/auth")}
                sx={{
                  mt: 1,
                  borderRadius: 0,
                  color: '#888888',
                  fontSize: '0.75rem',
                  '&:hover': {
                    color: '#ffffff',
                    background: 'transparent'
                  }
                }}
              >
                BACK TO MANAGEMENT PORTAL
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default AuditLogin;
