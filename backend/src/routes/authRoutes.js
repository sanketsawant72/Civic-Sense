const express = require("express");
const { registerUser, loginUser, getMe } = require("../controller/authController");
const protect = require("../middleware/protect");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login",    loginUser);
router.get("/me",        protect, getMe);   // protected — requires valid JWT

module.exports = router;
