const express = require("express");
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} = require("../controllers/wishlistController");

const {
  authMiddleware,
  isCustomer,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ❤️ Add product to wishlist
router.post(
  "/",
  authMiddleware,
  isCustomer,
  addToWishlist
);

// 📋 Get logged-in user's wishlist
router.get(
  "/",
  authMiddleware,
  isCustomer,
  getWishlist
);

// ❌ Remove product from wishlist
router.delete(
  "/:productId",
  authMiddleware,
  isCustomer,
  removeFromWishlist
);

module.exports = router;