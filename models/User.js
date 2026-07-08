const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ // ✅ email format regex
  },
  password: { 
    type: String, 
    required: true,
    minlength: 8 // ✅ enforce minimum length
    // Don't use regex here — validate before hashing in controller
  },
  type: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
