import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import api from "../../api/api";

// Base URL for audit API
// Base URL for audit API
const API_URL = "/audit";

// Async thunk for login
export const loginAuditUser = createAsyncThunk(
  "audit/login",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_URL}/login`, userData);
      localStorage.setItem("auditUser", JSON.stringify(response.data));
      // localStorage.setItem("token", response.data.token); // If using token header
      return response.data;
    } catch (error) {
      if (error.response && error.response.data.message) {
        return rejectWithValue(error.response.data.message);
      } else {
        return rejectWithValue(error.message);
      }
    }
  }
);

export const logoutAuditUser = createAsyncThunk(
  "audit/logout",
  async (_, { rejectWithValue }) => {
    try {
      await api.post(`${API_URL}/logout`);
      localStorage.removeItem("auditUser");
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
)

const initialState = {
  auditUser: localStorage.getItem("auditUser")
    ? JSON.parse(localStorage.getItem("auditUser"))
    : null,
  isLoading: false,
  isError: false,
  isSuccess: false,
  message: "",
};

const auditSlice = createSlice({
  name: "audit",
  initialState,
  reducers: {
    resetAuditState: (state) => {
      state.isLoading = false;
      state.isError = false;
      state.isSuccess = false;
      state.message = "";
    },
    setAuditUser: (state, action) => {
      state.auditUser = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginAuditUser.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.isSuccess = false;
        state.message = "";
      })
      .addCase(loginAuditUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.auditUser = action.payload;
      })
      .addCase(loginAuditUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.auditUser = null;
      })
      // Logout
      .addCase(logoutAuditUser.fulfilled, (state) => {
        state.auditUser = null;
      })
  },
});

export const { resetAuditState, setAuditUser } = auditSlice.actions;
export default auditSlice.reducer;
