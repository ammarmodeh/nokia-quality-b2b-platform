import express from "express";
import { login, register, getUsersByIds, getAllUsers, updateUserProfile, changePassword, getAllUnhashedUsers, updateVisibility } from "../controllers/userControllers.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get All Users
router.get("/get-all-users", protect, getAllUsers);

// Get unhashed user passwords
router.get("/get-unhashed-users", protect, getAllUnhashedUsers);

// Get Users by IDs
router.post("/get-users-by-ids", protect, getUsersByIds);

// User Registration
router.post("/register", register);

// User Login
router.post("/login", login);

// Refresh Token
// router.post("/refresh-token", refreshToken);

// Update User Profile
router.put("/profile", protect, updateUserProfile);

// Change Password Endpoint
router.post("/change-password", protect, changePassword);

// update user visibility
router.put('/update-visibility/:memberId', protect, updateVisibility);

export default router;
