// Middleware to protect routes (checks if user is authenticated)
import jwt from "jsonwebtoken";
import { UserSchema } from "../models/userModel.js";

const JWT_SECRET = process.env.JWT_SECRET;

export const protect = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = await UserSchema.findById(decoded.id).select("-password");
      if (!req.user) return res.status(401).json({ message: "User not found" });
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      return res.status(401).json({ message: "Invalid token" });
    }
  } catch (error) {
    res.status(401).json({ message: "Unauthorized request" });
  }
};


// Middleware to allow only admins
export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "Admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
  console.log('adminOnly pass');
  next();
};
