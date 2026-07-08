// models/Bill.js
const mongoose = require("mongoose");

const billSchema = new mongoose.Schema({
  billNumber: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  items: [
    {
      productName: String,
      quantity: Number,
      price: Number,
      total: Number
    }
  ],
  grandTotal: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Bill", billSchema);
