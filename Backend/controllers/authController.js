const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// In-memory OTP store (for simplicity)
const otpStore = {};

exports.sendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ success: false, message: "Email is required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = otp;

  // Set up email transport
  const transporter = nodemailer.createTransport({
    service: "Gmail", // Or use Outlook/Yahoo etc.
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP for Signup",
    text: `Your OTP is: ${otp}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP required" });

  if (otpStore[email] === otp) {
    delete otpStore[email]; // clear OTP once verified
    return res.json({ success: true, message: "OTP verified" });
  } else {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }
};

exports.signup = async (req, res) => {
  const { fullName, email, password, role, otp } = req.body;

  if (!fullName || !email || !password || !role || !otp)
    return res.status(400).json({ success: false, message: "All fields are required" });

  if (otpStore[email] !== otp)
    return res.status(400).json({ success: false, message: "OTP verification failed" });

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ success: false, message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ fullName, email, password: hashedPassword, role });

    await user.save();
    delete otpStore[email]; // Clear OTP on successful registration

    res.status(201).json({ success: true, message: "User registered successfully", userId: user._id });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.login = async (req, res) => {
  console.log("🔥 LOGIN HIT");
  console.log(req.body);

  const { email, password, role } = req.body;

  try {

    // TEMP ADMIN LOGIN
    if (
      email === "admin@example.com" &&
      password === "admin123" 
    ) {
      return res.status(200).json({
        success: true,
        token: "admin-token",
        role: "admin",
        user: {
          email: "admin@example.com",
          role: "admin",
          fullName: "Admin",
        },
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).json({
      success: true,
      token,
      role: user.role,
      user,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

   const resetLink = `${process.env.FRONTEND_URL}/reset-password/${user._id}/${token}`;


    await transporter.sendMail({
      to: email,
      from: `"CureBuddy" <${process.env.MAIL_USER}>`,
      subject: "Reset Your CureBuddy Password",
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link will expire in 15 minutes.</p>`,
    });

    return res.status(200).json({ success: true, message: "Reset password email sent" });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    return res.status(500).json({ success: false, message: "Failed to send reset email" });
  }
};

exports.resetPassword = async (req, res) => {
  const { id, token } = req.params;
  const { password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.id !== id) {
      return res.status(403).json({ success: false, message: "Invalid token" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    return res.status(400).json({ success: false, message: "Token expired or invalid" });
  }
};
