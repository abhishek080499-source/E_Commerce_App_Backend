const Wishlist = require("../models/Wishlist");

// ===============================
// Add Product to Wishlist
// ===============================
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    const exists = await Wishlist.findOne({
      userId: req.user.id,
      productId,
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Product already in wishlist",
      });
    }

    const wishlist = await Wishlist.create({
      userId: req.user.id,
      productId,
    });

    res.status(201).json({
      success: true,
      message: "Added to wishlist",
      wishlist,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ===============================
// Get Logged-in User Wishlist
// ===============================
const getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.find({
      userId: req.user.id,
    })
      .populate("productId")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      wishlist,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ===============================
// Remove Product
// ===============================
const removeFromWishlist = async (req, res) => {
  try {
    await Wishlist.findOneAndDelete({
      userId: req.user.id,
      productId: req.params.productId,
    });

    res.json({
      success: true,
      message: "Removed from wishlist",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
};