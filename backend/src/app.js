const express = require("express");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");


const app = express();

connectDB();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});
app.use("/api/auth", authRoutes);

app.get("/api/test", (req, res) => {
  res.send("Test endpoint is working!");
});

module.exports = app;
