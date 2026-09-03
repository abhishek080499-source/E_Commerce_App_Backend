


const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      unique: true, 
    },

    description: {
      type: String,
      required: true,
    },

    availableQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Keep this as String
    imageUrl: {
      type: String,
    },

    // Store Cloudinary public_id separately
    imagePublicId: {
      type: String,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);


