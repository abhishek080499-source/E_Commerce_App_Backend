// backend/routes/userRoutes.js
const express = require("express");
const { getAllUsers, getUserById, deleteUser } = require("../controllers/userController");

const router = express.Router();

// GET /users → all users
router.get("/", getAllUsers);

// GET /users/:id → single user
router.get("/:id", getUserById);

// DELETE /users/:id → delete user
router.delete("/:id", deleteUser);

module.exports = router;
