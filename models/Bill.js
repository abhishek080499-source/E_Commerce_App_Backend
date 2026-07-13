// models/Bill.js
const mongoose = require("mongoose");

const billSchema = new mongoose.Schema({
  billNumber: {
    type: String,
    required: true,
    unique: true,
  },

  customerName: {
    type: String,
    required: true,
  },

  address: {
    type: String,
    required: true,
  },

  phone: {
    type: String,
    required: true,
  },

  items: [
    {
      productName: {
        type: String,
        required: true,
      },

      quantity: {
        type: Number,
        required: true,
      },

      price: {
        type: Number,
        required: true,
      },

      total: {
        type: Number,
        required: true,
      },
    },
  ],

  grandTotal: {
    type: Number,
    required: true,
  },

  // ✅ Order Status
  status: {
    type: String,
    enum: ["Pending", "Processing", "Delivered"],
    default: "Pending",
  },
  userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true,
},

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Bill", billSchema);