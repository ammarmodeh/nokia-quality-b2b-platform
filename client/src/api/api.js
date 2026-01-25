import axios from "axios";
import store from "../redux/store";
import { logout } from "../redux/slices/authSlice";

// console.log('import.meta.env.VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);

const api = axios.create({
  // Use /api to leverage the Vite proxy during local development, 
  // or the full URL from environment variables in production.
  baseURL: import.meta.env.DEV ? '/api' : `${import.meta.env.VITE_BACKEND_URL}/api`,
  withCredentials: true,
});

// Request interceptor (adds token to headers)
api.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem("accessToken");

    // Fallback to auditUser token if accessToken is missing
    if (!token) {
      const auditUserStr = localStorage.getItem("auditUser");
      if (auditUserStr) {
        try {
          const auditUser = JSON.parse(auditUserStr);
          token = auditUser.token;
        } catch (e) {
          console.error("Failed to parse auditUser from localStorage", e);
        }
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (handles token expiry)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check for 401 and specific conditions
    if (error.response?.status === 401) {
      const isLoginRequest = originalRequest.url.includes('/login');
      const isAuditRequest = originalRequest.url.includes('/audit');

      // If it's a login request or we already tried to retry, don't loop
      if (isLoginRequest || originalRequest._retry) {
        return Promise.reject(error);
      }

      // If it's an audit request, we don't have a refresh token logic currently
      // so just logout and redirect to audit login
      if (isAuditRequest) {
        localStorage.removeItem("auditUser");
        store.dispatch(logout()); // Clean up any other state
        window.location.href = "/audit/login";
        return Promise.reject(error);
      }

      // Main app refresh token logic
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const { data } = await api.post('/users/refresh-token');

        // Update local storage
        localStorage.setItem("accessToken", data.accessToken);

        // Update the header for the original request
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        // Update the default header for future requests
        api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;

        // Retry the original request
        return api(originalRequest);

      } catch (refreshError) {
        // If refresh fails, log out
        store.dispatch(logout());
        window.location.href = "/auth";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
