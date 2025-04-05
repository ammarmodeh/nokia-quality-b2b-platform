import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  // baseURL: "https://nokia-quality-b2b-platform.onrender.com/api",
  withCredentials: true, // Include cookies in requests
});

// Function to refresh token
// const refreshAccessToken = async () => {
//   try {
//     const response = await api.post("/users/refresh-token", {}, { withCredentials: true });
//     const newAccessToken = response.data.accessToken;
//     if (newAccessToken) {
//       console.log("New Access Token:", newAccessToken);  // Log new token
//       localStorage.setItem("accessToken", newAccessToken);
//       return newAccessToken;
//     }
//     console.error("Failed to retrieve new access token.");
//     return null;
//   } catch (error) {
//     console.error("Failed to refresh token", error);
//     return null;
//   }
// };


// Request interceptor
// api.interceptors.request.use(
//   async (config) => {
//     let token = localStorage.getItem("accessToken");
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );


// Response interceptor
// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;
//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;
//       const newToken = await refreshAccessToken();
//       if (newToken) {
//         api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
//         originalRequest.headers.Authorization = `Bearer ${newToken}`;
//         return api(originalRequest);
//       }
//     }
//     return Promise.reject(error);
//   }
// );

export default api;
