const bcrypt = require("bcryptjs");
const User = require("../models/User");

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        console.log("📥 Register request received:", { name, email });

        if (!name || !email || !password) {
            console.log("❌ Validation failed: missing fields");
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            console.log("⚠️  User already exists:", email);
            return res.status(409).json({
                success: false,
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword
        });

        console.log("✅ User registered successfully:", { id: user._id, name: user.name, email: user.email, role: user.role });

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.log("🔴 Error in registerUser:", error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    registerUser
};