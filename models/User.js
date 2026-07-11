// const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema({
//   username: { type: String, required: true, trim: true },
//   email: { 
//     type: String, 
//     required: true, 
//     unique: true, 
//     match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ // ✅ email format regex
//   },
//   password: { 
//     type: String, 
//     required: true,
//     minlength: 8 // ✅ enforce minimum length
//     // Don't use regex here — validate before hashing in controller
//   },
//   type: { type: String, required: true }
// }, { timestamps: true });

// module.exports = mongoose.model("User", userSchema);





const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // ✅ email format regex
    },

    password: {
      type: String,
      required: true,
      minlength: 8, // ✅ enforce minimum length
      // Regex validation is handled in controller before hashing
    },

    type: { type: String, required: true, enum: ["admin", "customer"] },

    // ✅ Fields for forgot/reset password flow
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
