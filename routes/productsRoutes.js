const express = require("express");
const {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productsController");

const { authMiddleware, isAdmin } = require("../middleware/authMiddleware");
const multer = require("multer");

// ✅ Use memory storage so we can stream directly to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

// ✅ Product routes
// Any logged-in user can view products
router.get("/", authMiddleware, getProducts);

// Only admins can add, update, or delete products
router.post("/", authMiddleware, upload.single("image"), addProduct);
router.put("/:id", authMiddleware,  upload.single("image"), updateProduct);
router.delete("/:id", authMiddleware,deleteProduct);

module.exports = router;
