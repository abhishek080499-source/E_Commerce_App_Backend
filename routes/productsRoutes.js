const express = require("express");
const {
  getProducts,
  getProductById,   // ✅ import new controller
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

// ✅ Single product by ID
router.get("/:id", authMiddleware, getProductById);

// Only admins can add, update, or delete products
router.post("/", authMiddleware, isAdmin, upload.single("image"), addProduct);
router.put("/:id", authMiddleware, isAdmin, upload.single("image"), updateProduct);
router.delete("/:id", authMiddleware, isAdmin, deleteProduct);

module.exports = router;
