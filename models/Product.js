const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true },
    description: { type: String, required: true },
    availableQuantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String },

    // Reference Category by ID
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
