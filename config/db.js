const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Use Atlas connection string from environment, fallback to local for development
    const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/E-commerce";
    
    await mongoose.connect(mongoURI, {
      retryWrites: true,
      w: "majority",
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    
    console.log("✅ MongoDB Connected successfully to Atlas");
    console.log(`📍 Connection State: ${mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"}`);
  } catch (err) {
    console.error("❌ DB Connection Error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
