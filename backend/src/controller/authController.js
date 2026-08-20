const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ─── Helper: sign a JWT ───────────────────────────────────────────────────────
const signToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        console.log("📥 Register request received:", { name, email });

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required",
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword });

        const token = signToken(user);

        console.log("✅ User registered:", { id: user._id, email: user.email });

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.log("🔴 Error in registerUser:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("📥 Login request received:", { email });

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        // Find user and include password for comparison
        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const token = signToken(user);

        console.log("✅ User logged in:", { id: user._id, email: user.email });

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.log("🔴 Error in loginUser:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET /api/auth/me (protected) ────────────────────────────────────────────
const getMe = async (req, res) => {
    try {
        // req.user is set by the protect middleware
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.log("🔴 Error in getMe:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { registerUser, loginUser, getMe };
