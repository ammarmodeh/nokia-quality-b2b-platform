import axios from "axios";
import store from "../redux/store";
import { logout } from "../redux/slices/authSlice";

const api = axios.create({
  // baseURL: "http://localhost:5000/api",
  baseURL: "https://nokia-quality-b2b-platform.onrender.com/api",
  withCredentials: true,
});

// Request interceptor (adds token to headers)
// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem("accessToken");
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// Response interceptor (handles token expiry)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check for 401 and specific conditions
    if (error.response?.status === 401) {
      const isLoginRequest = originalRequest.url.includes('/login');
      const hasToken = localStorage.getItem("accessToken");

      // Only handle token expiration cases (has token but request failed)
      if (!isLoginRequest && hasToken && !originalRequest._retry) {
        originalRequest._retry = true;
        store.dispatch(logout());
        window.location.href = "/auth";
      }
    }

    return Promise.reject(error);
  }
);

export default api;