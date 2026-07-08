const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./config/db");

require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productsRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const userRoutes = require("./routes/userRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const categoryRoutes = require("./routes/categoryRoutes"); // ✅ new

const { startStockCheckJob } = require("./jobs/stockCheckJob");

const app = express();

// ✅ Security & logging
app.use(helmet());
app.use(morgan("dev"));

// ✅ Enable CORS with credentials
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// ✅ Parse JSON and cookies
app.use(express.json());
app.use(cookieParser());

// ✅ Connect to DB and start cron job
connectDB().then(() => {
  startStockCheckJob();
}).catch(err => console.error("MongoDB connection error:", err));

// ✅ Routes
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/payment", paymentRoutes);
app.use("/users", userRoutes);
app.use("/notifications", notificationRoutes);
app.use("/categories", categoryRoutes); // ✅ added

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
