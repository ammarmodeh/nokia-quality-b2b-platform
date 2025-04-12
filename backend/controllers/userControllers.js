import { UserSchema } from "../models/userModel.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UnhashedPasswordSchema } from "../models/unhashedUsersModel.js";
import bcrypt from "bcryptjs";
dotenv.config();
// console.log(process.env.JWT_SECRET);

// Generate JWT Token
const generateToken = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role }, // Payload
    process.env.JWT_SECRET, // Secret key
    { expiresIn: "12h" } // Token expires in 12 hours
  );

  // const refreshToken = jwt.sign(
  //   { id: user._id },
  //   process.env.JWT_SECRET,
  //   { expiresIn: "7d" } // Refresh token expires in 7 days
  // );

  return { accessToken };
};

// List of predefined colors
const availableColors = [
  "#D84E26", // Dark Red (#FF5733)
  "#1D6A28", // Dark Green (#33FF57)
  "#1A3D80", // Dark Blue (#3357FF)
  "#C3A400", // Dark Yellow (#F7DC6F)
  "#6A3A8E", // Dark Purple (#9B59B6)
  "#16A07A", // Dark Teal (#1ABC9C)
  "#9C2C29", // Dark Red (#E74C3C)
  "#D47F10", // Dark Orange (#F39C12)
  "#1F7A3D", // Dark Lime (#2ECC71)
  "#631C6D", // Dark Violet (#8E44AD)

  "#5B2C6F", // Dark Orchid (#8E44AD)
  "#7B2A34", // Dark Burgundy (#FF5733)
  "#4F7D7A", // Dark Slate (#33FF57)
  "#2A3D66", // Dark Navy (#3357FF)
  "#9B7D4F", // Dark Gold (#F7DC6F)
  "#6F3D4A", // Dark Rose (#9B59B6)
  "#3A6F5E", // Dark Sea Green (#1ABC9C)
  "#8B1C1C", // Dark Scarlet (#E74C3C)
  "#4F3925", // Dark Brass (#F39C12)
  "#2A5630", // Dark Moss (#2ECC71)
];

export const register = async (req, res) => {
  try {
    const { name, email, password, title, phoneNumber } = req.body;

    // Set default values for role, department, and subDepartment
    const role = "Member";
    const department = "Quality";
    const subDepartment = "Quality";

    // Check if the user already exists
    const userExists = await UserSchema.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    // Find an available color from the list
    let assignedColor = null;
    let colorTaken = true;
    while (colorTaken) {
      const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
      const colorExists = await UserSchema.findOne({ color: randomColor });
      if (!colorExists) {
        assignedColor = randomColor;
        colorTaken = false; // color is available
      }
    }

    // Create a new user
    const user = new UserSchema({
      name,
      email,
      password, // Password will be hashed by the pre-save hook
      role,
      title,
      department,
      phoneNumber,
      subDepartment,
      color: assignedColor,
    });

    // Save the user to the database
    await user.save();

    // Save the unhashed password temporarily
    await UnhashedPasswordSchema.create({ userId: user._id, email, password });

    // Respond with success message
    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    // Handle errors
    if (error.message.includes("Email already exists")) {
      return res.status(400).json({ message: "Email already exists. Please use a different email." });
    }
    res.status(500).json({ message: "User registration failed", error: error.message });
  }
};


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserSchema.findOne({ email });
    // console.log({ email, user });

    // Check if user exists
    if (!user) {
      // console.log('User not found');
      return res.status(401).json({ message: "User not found" });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    // console.log({ isMatch });

    if (!isMatch) {
      // console.log('Password does not match');
      return res.status(401).json({ message: "Invalid password" });
    }

    // Generate tokens
    const { accessToken } = generateToken(user);

    // Send the refresh token in a secure, HTTP-only cookie
    // res.cookie("refreshToken", refreshToken, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "Strict",
    //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    // });

    // Send the access token and user data
    res.status(200).json({
      accessToken,
      user,
    });
  } catch (error) {
    // console.error('Error during login:', error);
    res.status(500).json({ error: error.message });
  }
};


// export const refreshToken = async (req, res) => {
//   try {
//     // Extract refresh token from cookies
//     const { refreshToken } = req.cookies;

//     if (!refreshToken) {
//       return res.status(403).json({ message: 'Refresh token not found' });
//     }

//     // Verify the refresh token
//     const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

//     // Find the user by the decoded ID
//     const user = await UserSchema.findById(decoded.id);

//     if (!user) {
//       return res.status(403).json({ message: 'User not found' });
//     }

//     // Generate new access token
//     const accessToken = jwt.sign(
//       { id: user._id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: '1h' }
//     );

//     // Send new access token
//     res.status(200).json({ accessToken });
//   } catch (error) {
//     console.error(error);
//     res.status(403).json({ message: 'Invalid refresh token' });
//   }
// };

export const getUsersByIds = async (req, res) => {
  try {
    const { userIds } = req.body;
    // console.log("userIds in userControllers:", { userIds });

    const users = await UserSchema.find({ _id: { $in: userIds } });
    // console.log("users in userControllers:", { users });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const getAllUsers = async (req, res) => {
  try {
    const users = await UserSchema.find();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const getAllUnhashedUsers = async (req, res) => {
  try {
    const users = await UnhashedPasswordSchema.find();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Update User Profile
export const updateUserProfile = async (req, res) => {
  try {
    const { name, email, phoneNumber, title, password } = req.body;
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await UserSchema.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify password if provided
    if (password) {
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid password" });
      }
    } else {
      return res.status(400).json({ message: "Password is required for updates" });
    }

    // Update user fields
    user.name = name || user.name;
    user.email = email || user.email;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.title = title || user.title;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber,
      title: updatedUser.title,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      message: "Server error occurred while updating profile",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



export const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user._id;

  try {
    // Find the user by ID
    const user = await UserSchema.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if the old password matches
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) return res.status(400).json({ message: 'Old password is incorrect' });

    // Update the unhashedPassword collection
    await UnhashedPasswordSchema.findOneAndUpdate({ email: user.email }, { userId, password: newPassword }, { upsert: true });

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    const updatedUser = await UserSchema.findOneAndUpdate({ _id: userId }, { password: hashedPassword }, { new: true });

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}

export const updateVisibility = async (req, res) => {
  const { memberId } = req.params;
  const { visibleTo } = req.body;
  const userId = req.user._id.toString(); // Convert userId to string

  // console.log("Request Params - memberId:", memberId);
  // console.log("Logged-in User ID - userId:", userId);

  if (memberId !== userId) {
    // console.log("Unauthorized access attempt: memberId does not match userId");
    return res.status(403).json({ message: "You can only update your own visibility settings." });
  }

  try {
    const user = await UserSchema.findByIdAndUpdate(
      memberId,
      { visibleTo },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    // console.error("Error updating visibility:", error);
    res.status(500).json({ error: error.message });
  }
};
