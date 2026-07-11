const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// Regex for strong password
const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};



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

    // Short-lived access token
    const accessToken = jwt.sign(
      { id: user._id, role: user.type, username: user.username },
      process.env.JWT_SECRET || "secretKey",
      { expiresIn: "15m" }
    );

    // Long-lived refresh token
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET || "refreshSecretKey",
      { expiresIn: "7d" }
    );

    // Save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    const { password: _, ...userData } = user.toObject();


  res.cookie("accessToken", accessToken, {
  ...cookieOptions,
  maxAge: 15 * 60 * 1000,
});

res.cookie("refreshToken", refreshToken, {
  ...cookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000,
});


    res.json({ user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ------------------- REFRESH TOKEN -------------------
exports.refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: "No refresh token" });

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || "refreshSecretKey"
    );

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    const newAccessToken = jwt.sign(
      { id: user._id, role: user.type, username: user.username },
      process.env.JWT_SECRET || "secretKey",
      { expiresIn: "15m" }
    );
res.cookie("accessToken", newAccessToken, {
  ...cookieOptions,
  maxAge: 15 * 60 * 1000,
});


    res.json({ message: "Token refreshed" });
  } catch (err) {
    res.status(403).json({ error: "Expired or invalid refresh token" });
  }
};

// ------------------- LOGOUT -------------------
exports.logout = async (req, res) => {
  res.clearCookie("accessToken", cookieOptions);
res.clearCookie("refreshToken", cookieOptions);
  // Remove refresh token from DB
  const userId = req.user?.id;
  if (userId) {
    const user = await User.findById(userId);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
  }

  res.json({ message: "Logged out successfully" });
};

// ------------------- VERIFY SESSION -------------------
exports.verify = (req, res) => {
  try {
    const token = req.cookies?.accessToken;
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

// ------------------- FORGOT PASSWORD -------------------
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const resetToken = jwt.sign(
      { id: user._id },
      process.env.JWT_RESET_SECRET || "resetSecretKey",
      { expiresIn: "15m" }
    );

    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset.</p>
             <p>Click <a href="${resetLink}">here</a> to reset your password.</p>
             <p>This link will expire in 15 minutes.</p>`,
    });

    res.json({ message: "Password reset link sent to your email." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ------------------- RESET PASSWORD -------------------
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error:
          "Password must be 8+ chars, include uppercase, lowercase, number, and special character.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET || "resetSecretKey");

    const user = await User.findById(decoded.id);
    if (!user || user.resetToken !== token || Date.now() > user.resetTokenExpiry) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successful." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};







// const User = require("../models/User");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// const nodemailer = require("nodemailer");

// // Regex for strong password
// const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
// const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// // ------------------- SIGNUP -------------------
// exports.signup = async (req, res) => {
//   try {
//     const { username, email, password, type } = req.body;

//     if (!emailRegex.test(email)) {
//       return res.status(400).json({ error: "Invalid email format" });
//     }

//     if (!passwordRegex.test(password)) {
//       return res.status(400).json({
//         error:
//           "Password must be 8+ chars, include uppercase, lowercase, number, and special character.",
//       });
//     }

//     const existingEmail = await User.findOne({ email });
//     if (existingEmail) {
//       return res.status(409).json({ error: "Email already exists" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const newUser = new User({
//       username,
//       email,
//       password: hashedPassword,
//       type,
//     });
//     await newUser.save();

//     res.status(201).json({ message: "Signup successful." });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // ------------------- LOGIN -------------------
// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) return res.status(401).json({ error: "Invalid credentials" });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

//     // Short-lived access token
//     const accessToken = jwt.sign(
//       { id: user._id, role: user.type, username: user.username },
//       process.env.JWT_SECRET || "secretKey",
//       { expiresIn: "15m" }
//     );

//     // Long-lived refresh token
//     const refreshToken = jwt.sign(
//       { id: user._id },
//       process.env.JWT_REFRESH_SECRET || "refreshSecretKey",
//       { expiresIn: "7d" }
//     );

//     // Save refresh token in DB
//     user.refreshToken = refreshToken;
//     await user.save();

//     const { password: _, ...userData } = user.toObject();

    
//     // Set cookies
//     res.cookie("accessToken", accessToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//       maxAge: 15 * 60 * 1000,
//     });

//     res.cookie("refreshToken", refreshToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//       maxAge: 7 * 24 * 60 * 60 * 1000,
//     });

//     res.json({ user: userData });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // ------------------- REFRESH TOKEN -------------------
// exports.refresh = async (req, res) => {
//   try {
//     const refreshToken = req.cookies?.refreshToken;
//     if (!refreshToken) return res.status(401).json({ error: "No refresh token" });

//     const decoded = jwt.verify(
//       refreshToken,
//       process.env.JWT_REFRESH_SECRET || "refreshSecretKey"
//     );

//     const user = await User.findById(decoded.id);
//     if (!user || user.refreshToken !== refreshToken) {
//       return res.status(403).json({ error: "Invalid refresh token" });
//     }

//     const newAccessToken = jwt.sign(
//       { id: user._id, role: user.type, username: user.username },
//       process.env.JWT_SECRET || "secretKey",
//       { expiresIn: "15m" }
//     );

//     res.cookie("accessToken", newAccessToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//       maxAge: 15 * 60 * 1000,
//     });

//     res.json({ message: "Token refreshed" });
//   } catch (err) {
//     res.status(403).json({ error: "Expired or invalid refresh token" });
//   }
// };

// // ------------------- LOGOUT -------------------
// exports.logout = async (req, res) => {
//   res.clearCookie("accessToken");
//   res.clearCookie("refreshToken");

//   // Remove refresh token from DB
//   const userId = req.user?.id;
//   if (userId) {
//     const user = await User.findById(userId);
//     if (user) {
//       user.refreshToken = null;
//       await user.save();
//     }
//   }

//   res.json({ message: "Logged out successfully" });
// };

// // ------------------- VERIFY SESSION -------------------
// exports.verify = (req, res) => {
//   try {
//     const token = req.cookies?.accessToken;
//     if (!token) {
//       return res.status(401).json({ success: false, message: "No token found" });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretKey");
//     res.json({
//       success: true,
//       message: "Session valid",
//       role: decoded.role,
//       username: decoded.username,
//     });
//   } catch (err) {
//     res.status(403).json({ success: false, message: "Invalid or expired token" });
//   }
// };

// // ------------------- FORGOT PASSWORD -------------------
// exports.forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;
//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ error: "User not found" });

//     const resetToken = jwt.sign(
//       { id: user._id },
//       process.env.JWT_RESET_SECRET || "resetSecretKey",
//       { expiresIn: "15m" }
//     );

//     user.resetToken = resetToken;
//     user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
//     await user.save();

//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: "Password Reset Request",
//       html: `<p>You requested a password reset.</p>
//              <p>Click <a href="${resetLink}">here</a> to reset your password.</p>
//              <p>This link will expire in 15 minutes.</p>`,
//     });

//     res.json({ message: "Password reset link sent to your email." });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // ------------------- RESET PASSWORD -------------------
// exports.resetPassword = async (req, res) => {
//   try {
//     const { token } = req.params;
//     const { newPassword } = req.body;

//     if (!passwordRegex.test(newPassword)) {
//       return res.status(400).json({
//         error:
//           "Password must be 8+ chars, include uppercase, lowercase, number, and special character.",
//       });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET || "resetSecretKey");

//     const user = await User.findById(decoded.id);
//     if (!user || user.resetToken !== token || Date.now() > user.resetTokenExpiry) {
//       return res.status(400).json({ error: "Invalid or expired token" });
//     }

//     const hashedPassword = await bcrypt.hash(newPassword, 10);
//     user.password = hashedPassword;
//     user.resetToken = undefined;
//     user.resetTokenExpiry = undefined;
//     await user.save();

//     res.json({ message: "Password reset successful." });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };


