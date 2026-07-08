// routes/categoryRoutes.js
const express = require("express");
const { authMiddleware, isAdmin } = require("../middleware/authMiddleware");
const {
  addCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const router = express.Router();

// Public routes
router.get("/", getCategories); // anyone can view categories

// Admin-only routes
router.post("/", authMiddleware, isAdmin, addCategory);   // add category
router.put("/:id", authMiddleware, isAdmin, updateCategory); // update category
router.delete("/:id", authMiddleware, isAdmin, deleteCategory); // delete category

module.exports = router;
