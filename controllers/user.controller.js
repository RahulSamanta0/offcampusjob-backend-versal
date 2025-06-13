import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";

export const register = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, password, role } = req.body;

    // Check if all fields are provided
    if (!fullname || !email || !phoneNumber || !password || !role) {
      return res.status(400).json({
        message: "All fields are required.",
        success: false,
      });
    }

    // Handle file upload
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        message: "Profile picture is required.",
        success: false,
      });
    }
    
    // Convert file to Data URI and upload to Cloudinary
    const fileUri = getDataUri(file);
    const cloudResponse = await cloudinary.uploader.upload(fileUri.content);

    // Check if the user already exists
    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        message: 'User already exists with this email.',
        success: false,
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user in the database
    await User.create({
      fullname,
      email,
      phoneNumber,
      password: hashedPassword,
      role,
      profile: {
        profilePhoto: cloudResponse.secure_url, // Save the profile photo URL
      },
    });

    return res.status(201).json({
      message: "Account created successfully.",
      success: true,
    });
  } catch (error) {
    console.error(error);

    // Handle unexpected errors
    return res.status(500).json({
      message: "An error occurred while creating the account.",
      success: false,
    });
  }
};
export const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        
        if (!email || !password || !role) {
            return res.status(400).json({
                message: "Something is missing",
                success: false
            });
        };
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false,
            })
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false,
            })
        };
        // check role is correct or not
        if (role !== user.role) {
            return res.status(400).json({
                message: "Account doesn't exist with current role.",
                success: false
            })
        };

        const tokenData = {
            userId: user._id
        }
        const token = await jwt.sign(tokenData, process.env.SECRET_KEY, { expiresIn: '1d' });

        user = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile
        }

        return res.status(200).cookie("token", token, { maxAge: 1 * 24 * 60 * 60 * 1000, httpsOnly: true, sameSite: 'strict' }).json({
            message: `Welcome back ${user.fullname}`,
            user,
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}
export const logout = async (req, res) => {
    try {
        return res.status(200).cookie("token", "", { maxAge: 0 }).json({
            message: "Logged out successfully.",
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}
export const updateProfile = async (req, res) => { 
    try { 
        const { fullname, email, phoneNumber, bio, skills } = req.body; 
        const file = req.file; 
        const userId = req.id; // from authentication middleware 
 
        let user = await User.findById(userId); 
        if (!user) { 
            return res.status(404).json({ 
                message: "User not found.", 
                success: false, 
            }); 
        } 
 
        // Update user fields 
        if (fullname) user.fullname = fullname; 
        if (email) user.email = email; 
        if (phoneNumber) user.phoneNumber = phoneNumber; 
        if (bio) user.profile.bio = bio; 
        if (skills) user.profile.skills = skills.split(","); 
 
        // Handle file upload (profile picture or other image) 
        if (file) { 
            const fileUri = getDataUri(file); 
            const cloudResponse = await cloudinary.uploader.upload(fileUri.content, { 
                resource_type: "image", // Correct resource type for images 
                folder: "user_profiles", 
                format: "jpg", // Convert to JPG 
                pages: true,   // Convert all pages or a specific page // Optional: Organize uploads in a specific folder 
            }); 
 
            user.profile.resume = cloudResponse.secure_url; // Save Cloudinary URL 
            user.profile.resumeOriginalName = file.originalname; // Save original filename 
        } 
 
        await user.save(); 
 
        // Prepare response user object 
        const responseUser = { 
            _id: user._id, 
            fullname: user.fullname, 
            email: user.email, 
            phoneNumber: user.phoneNumber, 
            role: user.role, 
            profile: user.profile, 
        }; 
 
        // Explicitly set Content-Type header 
        res.setHeader("Content-Type", "application/json"); 
        return res.status(200).json({ 
            message: "Profile updated successfully.", 
            user: responseUser, 
            success: true, 
        }); 
    } catch (error) { 
        console.error(error); 
        return res.status(500).json({ 
            message: "Internal server error.", 
            error: error.message, 
            success: false, 
        }); 
    } 
};
