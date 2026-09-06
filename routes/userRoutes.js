// backend/routes/userRoutes.js
const express = require("express");
const { getAllUsers, getUserById, deleteUser } = require("../controllers/userController");
const { authMiddleware, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /users → all users
router.get("/", authMiddleware, isAdmin, getAllUsers);

// GET /users/:id → single user
router.get("/:id",authMiddleware, isAdmin, getUserById);

// DELETE /users/:id → delete user
router.delete("/:id", authMiddleware, isAdmin, deleteUser);

module.exports = router;
