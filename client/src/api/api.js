import axios from "axios";
import store from "../redux/store";
import { logout } from "../redux/slices/authSlice";

// console.log('import.meta.env.VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);

const api = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL}/api`,
  withCredentials: true,
});

// Request interceptor (adds token to headers)
// Request interceptor (adds token to headers)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
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
      const isProfileUpdateRequest = originalRequest.url.includes('/users/profile');

      // If it's a login request or we already tried to retry, don't loop
      if (isLoginRequest || originalRequest._retry) {
        return Promise.reject(error);
      }

      if (isProfileUpdateRequest) {
        // Special handling for profile update if needed, otherwise treat as auth error
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const { data } = await api.post('/users/refresh-token');

        // Update local storage and redux (indirectly via reload or manual dispatch if we had store access here easily without circular deps)
        // Since we are inside axios, we just update the header for the retry
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
