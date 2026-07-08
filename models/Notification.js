// models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
   productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  message: String,
  type: { type: String, default: "stock" },
  read: { type: Boolean, default: false },   // ✅ new field
  createdAt: { type: Date, default: Date.now },
});


module.exports = mongoose.model("Notification", notificationSchema);
