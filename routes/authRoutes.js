
const express = require("express");
const { login, signup, logout, verify } = require("../controllers/authController");
const { authMiddleware, isAdmin, isCustomer } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.post("/login", login);
router.post("/signup", signup);

// Protected routes
router.post("/logout", authMiddleware, logout);
router.get("/verify", authMiddleware, verify);

// Example: Admin-only route
router.get("/admin/dashboard", authMiddleware, isAdmin, (req, res) => {
  res.json({ message: "Welcome Admin Dashboard" });
});

// Example: Customer-only route
router.get("/customer/profile", authMiddleware, isCustomer, (req, res) => {
  res.json({ message: "Welcome Customer Profile" });
});

module.exports = router;
