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

  useEffect(() => {
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
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%'
          }}
        >
          <Typography component="h1" variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
            Audit Portal Login
          </Typography>

          {isError && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {message}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              {...register("username", { required: "Username is required" })}
              error={!!errors.username}
              helperText={errors.username?.message}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              {...register("password", { required: "Password is required" })}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 1, py: 1.5, fontSize: '1rem' }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : "Sign In"}
            </Button>
            <Button
              fullWidth
              variant="text"
              color="inherit"
              onClick={() => navigate("/dashboard")}
              sx={{ textTransform: 'none', opacity: 0.7 }}
            >
              ← Back to Main Dashboard
            </Button>
          </Box>

        </Paper>
      </Box>
    </Container>
  );
};

export default AuditLogin;
