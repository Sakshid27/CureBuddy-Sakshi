/*
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');


// Helper: Generate JWT Token
function generateToken(id, role) {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// ========== SEND OTP ==========
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email is required" });

  try {
    let user = await User.findOne({ email });

    if (user && user.password) {
      return res.status(400).json({ success: false, message: "User already registered. Please log in." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    if (!user) {
      user = new User({ email, role: "patient", otp, isVerified: false });
    } else {
      user.otp = otp;
      user.isVerified = false;
    }

    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });

    await transporter.sendMail({
      to: email,
      from: `"CureBuddy" <${process.env.MAIL_USER}>`,
      subject: "Your OTP for Registration",
      html: `<h2>Your OTP is: ${otp}</h2><p>This OTP is valid for 5 minutes.</p>`
    });

    return res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("Send OTP Error:", err);
    return res.status(500).json({ success: false, message: "Error sending OTP" });
  }
});

// ========== VERIFY OTP ==========
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "Email and OTP are required" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ success: false, message: "User not found" });
    if (user.otp !== otp) return res.status(400).json({ success: false, message: "Invalid OTP" });

    user.isVerified = true;
    user.otp = null;
    await user.save();

    return res.status(200).json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    return res.status(500).json({ success: false, message: "Error verifying OTP" });
  }
});

// ========== SIGNUP ==========
router.post("/signup", async (req, res) => {
  const { fullName, email, password, role } = req.body;

  try {
    let user = await User.findOne({ email });

    if (user && user.password) {
      return res.status(400).json({ success: false, message: "User already registered with this email" });
    }

    if (!user) {
      return res.status(400).json({ success: false, message: "Request OTP first" });
    }

    if (!user.isVerified) {
      return res.status(400).json({ success: false, message: "Please verify OTP before signup" });
    }

    if (!fullName || !password) {
      return res.status(400).json({ success: false, message: "Full name and password required" });
    }

    user.fullName = fullName;
    user.role = role;
    user.password = await bcrypt.hash(password, 10);
    user.isVerified = false; // reset after signup
    await user.save();

    return res.status(201).json({
      success: true,
      message: `${role} signup successful.`,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Signup Error:", err);
    return res.status(500).json({ success: false, message: "Error signing up" });
  }
});

// ========== LOGIN ==========
// ========== LOGIN ========== 
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ success: false, message: "Email, password, and role are required" });
  }

  try {
    const user = await User.findOne({ email, role });
    if (!user) return res.status(400).json({ success: false, message: "User not found with this role" });

    if (!user.password) return res.status(400).json({ success: false, message: "Password not set" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid credentials" });

    if (role === "doctor") {
      const doctorProfile = await DoctorProfile.findOne({ email });

      if (!doctorProfile) {
        return res.status(403).json({
          success: false,
          message: "Doctor profile not found. Complete registration process."
        });
      }

      if (doctorProfile.status !== "approved") {
        return res.status(403).json({
          success: false,
          message: `Your profile is ${doctorProfile.status}. Please wait for admin approval.`
        });
      }
    }

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      token,
      role: user.role,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName || user.name || "Patient",
      }
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ success: false, message: "Error logging in" });
  }
});


module.exports = router;

*/


const express = require('express');
const router = express.Router();
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const { forgotPassword, resetPassword } = require('../controllers/authController');

// Helper: Generate JWT Token
function generateToken(id, role) {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// ========== SEND OTP ==========
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email is required" });

  try {
    let user = await User.findOne({ email });

    if (user && user.password) {
      return res.status(400).json({ success: false, message: "User already registered. Please log in." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    if (!user) {
      user = new User({ email, role: "patient", otp, isVerified: false });
    } else {
      user.otp = otp;
      user.isVerified = false;
    }

    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });

    await transporter.sendMail({
      to: email,
      from: `"CureBuddy" <${process.env.MAIL_USER}>`,
      subject: "Your OTP for Registration",
      html: `<h2>Your OTP is: ${otp}</h2><p>This OTP is valid for 5 minutes.</p>`
    });

    return res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("Send OTP Error:", err);
    return res.status(500).json({ success: false, message: "Error sending OTP" });
  }
});

// ========== VERIFY OTP ==========
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "Email and OTP are required" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ success: false, message: "User not found" });
    if (user.otp !== otp) return res.status(400).json({ success: false, message: "Invalid OTP" });

    user.isVerified = true;
    user.otp = null;
    await user.save();

    return res.status(200).json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    return res.status(500).json({ success: false, message: "Error verifying OTP" });
  }
});

// ========== SIGNUP ==========
router.post("/signup", async (req, res) => {
  const { fullName, email, password, role } = req.body;

  try {
    let user = await User.findOne({ email });

    if (user && user.password) {
      return res.status(400).json({ success: false, message: "User already registered with this email" });
    }

    if (!user) {
      return res.status(400).json({ success: false, message: "Request OTP first" });
    }

    if (!user.isVerified) {
      return res.status(400).json({ success: false, message: "Please verify OTP before signup" });
    }

    if (!fullName || !password) {
      return res.status(400).json({ success: false, message: "Full name and password required" });
    }

    user.fullName = fullName;
    user.role = role;
    user.password = await bcrypt.hash(password, 10);
    user.isVerified = false; // reset after signup
    await user.save();

    return res.status(201).json({
      success: true,
      message: `${role} signup successful.`,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Signup Error:", err);
    return res.status(500).json({ success: false, message: "Error signing up" });
  }
});

// ========== LOGIN ==========
// ========== LOGIN ==========
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: "Email, password, and role are required"
    });
  }

  try {

    // ✅ ADMIN LOGIN
    if (
      role === "admin" &&
      email === "admin@example.com" &&
      password === "admin123"
    ) {

      const token = jwt.sign(
        { id: "admin123", role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        success: true,
        token,
        role: "admin",
        user: {
          _id: "admin123",
          email: "admin@example.com",
          role: "admin",
          fullName: "Admin"
        }
      });
    }

    // NORMAL USER LOGIN
    const user = await User.findOne({ email, role });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found with this role"
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Password not set"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    if (role === "doctor") {
      const doctorProfile = await DoctorProfile.findOne({ email });

      if (!doctorProfile) {
        return res.status(403).json({
          success: false,
          message: "Doctor profile not found"
        });
      }

      if (doctorProfile.status !== "approved") {
        return res.status(403).json({
          success: false,
          message: `Your profile is ${doctorProfile.status}`
        });
      }
    }

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      token,
      role: user.role,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName || "User"
      }
    });

  } catch (err) {
    console.error("Login Error:", err);

    return res.status(500).json({
      success: false,
      message: "Error logging in"
    });
  }
});

router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:id/:token', resetPassword);

module.exports = router;
