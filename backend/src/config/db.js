const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        // MongoDB Atlas connection (commented out - use when Atlas IP is whitelisted)
        // await mongoose.connect(process.env.MONGO_URI, {
        //     serverSelectionTimeoutMS: 5000,
        // });

        // Local MongoDB connection (active)
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
