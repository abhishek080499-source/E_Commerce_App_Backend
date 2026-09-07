const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const brevo = require("@getbrevo/brevo");
const axios = require("axios");

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
      { expiresIn: "1d" }
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

// Only send safe user data to frontend
const userData = {
  id: user._id,
  username: user.username,
  email: user.email,
  type: user.type,
};

  res.cookie("accessToken", accessToken, {
  ...cookieOptions,
  maxAge: 24 * 60 * 60 * 1000,
});

res.cookie("refreshToken", refreshToken, {
  ...cookieOptions,
  maxAge:  7 * 24 * 60 * 60 * 1000,
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
      { expiresIn: "1d" }
    );
res.cookie("accessToken", newAccessToken, {
  ...cookieOptions,
  maxAge: 24 * 60 * 60 * 1000,
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




exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find User
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Generate Reset Token
    const resetToken = jwt.sign(
      { id: user._id },
      process.env.JWT_RESET_SECRET,
      { expiresIn: "15m" }
    );

    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;

    await user.save();

    // Reset Link
    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // Send Email using Brevo REST API
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "SwiftCart Support",
          email: process.env.BREVO_SENDER,
        },

        to: [
          {
            email: email,
            name: user.username,
          },
        ],

        subject: "Reset Your Password",

        htmlContent: `
        <div
  style="
    margin:0;
    padding:40px 15px;
    background:#f3f4f6;
    font-family:Arial,Helvetica,sans-serif;
  "
>
  <div
    style="
      max-width:600px;
      margin:0 auto;
      background:#ffffff;
      border:1px solid #e5e7eb;
      border-radius:16px;
      overflow:hidden;
      box-shadow:0 8px 30px rgba(0,0,0,0.08);
    "
  >



<div
  style="
    padding:28px 25px 24px;
    text-align:center;
    border-bottom:1px solid #eef0f3;
    background:#ffffff;
  "
>
  <div
    style="
      display:inline-block;
      text-align:left;
    "
  >
    <table
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="margin:auto;"
    >
      <tr>
        <td style="vertical-align:middle;padding-right:10px;">
          <div
            style="
              width:44px;
              height:44px;
              background:#ffffff;
              border:1px solid #e5e7eb;
              border-radius:12px;
              text-align:center;
              line-height:44px;
              box-shadow:0 2px 6px rgba(0,0,0,0.06);
            "
          >
            <img
              src="${process.env.CLIENT_URL}/favicon.png"
              alt="SwiftCart"
              width="32"
              height="32"
              style="
                display:inline-block;
                vertical-align:middle;
                border:0;
              "
            />
          </div>
        </td>

        <td style="vertical-align:middle;">
          <div
            style="
              font-size:24px;
              line-height:26px;
              font-weight:800;
              color:#111827;
              letter-spacing:-0.5px;
            "
          >
            SwiftCart
          </div>

          <div
            style="
              margin-top:4px;
              font-size:8px;
              line-height:10px;
              font-weight:700;
              letter-spacing:1.5px;
              color:#6b7280;
              text-transform:uppercase;
            "
          >
            Shop Smart &bull; Shop Fast
          </div>
        </td>
      </tr>
    </table>
  </div>
</div>


<div style="padding:35px 30px 30px;">

  
  <div style="text-align:center;margin-bottom:18px;">
    <div
      style="
        display:inline-block;
        width:58px;
        height:58px;
        line-height:58px;
        background:#eef2ff;
        border-radius:50%;
        font-size:26px;
      "
    >
      &#128274;
    </div>
  </div>

  
  <h2
    style="
      margin:0;
      text-align:center;
      color:#111827;
      font-size:26px;
      line-height:32px;
      font-weight:700;
    "
  >
    Password Reset
  </h2>

  <p
    style="
      margin:10px 0 28px;
      text-align:center;
      color:#6b7280;
      font-size:14px;
      line-height:22px;
    "
  >
    Reset your SwiftCart account password securely.
  </p>

  
  <p
    style="
      margin:0 0 14px;
      color:#374151;
      font-size:15px;
      line-height:24px;
    "
  >
    Hello <strong style="color:#111827;">${user.username}</strong>,
  </p>

  <p
    style="
      margin:0 0 24px;
      color:#4b5563;
      font-size:15px;
      line-height:24px;
    "
  >
    We received a request to reset the password for your
    SwiftCart account. Click the button below to create a new password.
  </p>

  
  <div style="text-align:center;margin:30px 0;">
    <a
      href="${resetLink}"
      style="
        display:inline-block;
        background:#4f46e5;
        color:#ffffff;
        text-decoration:none;
        padding:14px 30px;
        border-radius:10px;
        font-size:15px;
        font-weight:700;
        box-shadow:0 4px 12px rgba(79,70,229,0.25);
      "
    >
      Reset Password
    </a>
  </div>

  
  <div
    style="
      margin:25px 0;
      padding:14px 16px;
      background:#fff7ed;
      border:1px solid #fed7aa;
      border-radius:10px;
      text-align:center;
    "
  >
    <p
      style="
        margin:0;
        color:#9a3412;
        font-size:13px;
        line-height:20px;
      "
    >
      &#9200; This password reset link will expire in
      <strong>15 minutes</strong>.
    </p>
  </div>

  
  <p
    style="
      margin:25px 0 10px;
      color:#4b5563;
      font-size:13px;
      line-height:20px;
    "
  >
    If the button doesn't work, copy and paste this URL into your browser:
  </p>

  <div
    style="
      padding:12px;
      background:#f9fafb;
      border:1px solid #e5e7eb;
      border-radius:8px;
    "
  >
    <p
      style="
        margin:0;
        word-break:break-all;
        color:#2563eb;
        font-size:12px;
        line-height:18px;
      "
    >
      ${resetLink}
    </p>
  </div>

  
  <div
    style="
      margin-top:25px;
      padding-top:22px;
      border-top:1px solid #e5e7eb;
    "
  >
    <p
      style="
        margin:0;
        color:#6b7280;
        font-size:13px;
        line-height:20px;
      "
    >
      If you didn't request this password reset, you can safely ignore
      this email. Your password will remain unchanged.
    </p>
  </div>

</div>


<div
  style="
    padding:22px 25px;
    background:#f9fafb;
    border-top:1px solid #eef0f3;
    text-align:center;
  "
>
  <div
    style="
      font-size:16px;
      font-weight:800;
      color:#111827;
    "
  >
    SwiftCart
  </div>

  <p
    style="
      margin:6px 0 0;
      color:#6b7280;
      font-size:11px;
      letter-spacing:1px;
      text-transform:uppercase;
    "
  >
    Shop Smart &bull; Shop Fast
  </p>

  <p
    style="
      margin:12px 0 0;
      color:#9ca3af;
      font-size:11px;
    "
  >
    &copy; 2026 SwiftCart. All rights reserved.
  </p>
</div>


  </div>
</div>
`
      },
      {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": process.env.BREVO_API_KEY,
        },
      }
    );

    console.log("Brevo Response:", response.data);

    return res.status(200).json({
      success: true,
      message: "Password reset email sent successfully.",
    });

  } catch (err) {
    console.error("Forgot Password Error:");

    if (err.response) {
      console.error(err.response.data);
    } else {
      console.error(err.message);
    }

    return res.status(500).json({
      success: false,
      error: err.response?.data || err.message,
    });
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






