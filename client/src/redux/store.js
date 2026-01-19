import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./slices/authSlice";
import auditReducer from "./slices/auditSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    audit: auditReducer,
  }
});

export default store;