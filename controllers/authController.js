



const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Regex for strong password
const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ------------------- SIGNUP -------------------
exports.signup = async (req, res) => {
  try {
    const { username, email, password, type } = req.body;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error:
          "Password must be 8+ chars, include uppercase, lowercase, number, and special character.",
      });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      type,
    });
    await newUser.save();

    res.status(201).json({ message: "Signup successful." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ------------------- LOGIN -------------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.type, username: user.username },
      process.env.JWT_SECRET || "secretKey",
      { expiresIn: "1h" }
    );

    const { password: _, ...userData } = user.toObject();

    // ✅ Set JWT in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true in production
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.json({ user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ------------------- LOGOUT -------------------
exports.logout = (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
};

// ------------------- VERIFY SESSION -------------------
exports.verify = (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ success: false, message: "No token found" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretKey");
    res.json({
      success: true,
      message: "Session valid",
      role: decoded.role,
      username: decoded.username,
    });
  } catch (err) {
    res.status(403).json({ success: false, message: "Invalid or expired token" });
  }
};
