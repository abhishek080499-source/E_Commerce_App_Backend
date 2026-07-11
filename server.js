// server.js
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./config/db");

require("dotenv").config();

// Route imports
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productsRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const userRoutes = require("./routes/userRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const categoryRoutes = require("./routes/categoryRoutes");

// Jobs
const { startStockCheckJob } = require("./jobs/stockCheckJob");

const app = express();

// ✅ Trust proxy (important for secure cookies behind proxies like Heroku/Render)
app.set("trust proxy", 1);

// ✅ Security & logging
app.use(helmet());
app.use(morgan("dev"));

// ✅ Allowed origins from .env
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// ✅ Enable CORS with credentials
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// ✅ Parse JSON and cookies
app.use(express.json());
app.use(cookieParser());

// ✅ Connect to DB and start cron job
connectDB()
  .then(() => {
    startStockCheckJob();
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// ✅ Routes
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/payment", paymentRoutes);
app.use("/users", userRoutes);
app.use("/notifications", notificationRoutes);
app.use("/categories", categoryRoutes);

// ✅ 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;






// const express = require("express");
// const cors = require("cors");
// const cookieParser = require("cookie-parser");
// const helmet = require("helmet");
// const morgan = require("morgan");
// const connectDB = require("./config/db");

// require("dotenv").config();

// const authRoutes = require("./routes/authRoutes");
// const productRoutes = require("./routes/productsRoutes");
// const paymentRoutes = require("./routes/paymentRoutes");
// const userRoutes = require("./routes/userRoutes");
// const notificationRoutes = require("./routes/notificationRoutes");
// const categoryRoutes = require("./routes/categoryRoutes");

// const { startStockCheckJob } = require("./jobs/stockCheckJob");

// const app = express();
// const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
//   .split(",")
//   .map((origin) => origin.trim())
//   .filter(Boolean);

// // ✅ Security & logging
// app.use(helmet());
// app.use(morgan("dev"));

// // ✅ Enable CORS with credentials
// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     credentials: true,
//   })
// );

// // ✅ Parse JSON and cookies
// app.use(express.json());
// app.use(cookieParser());

// // ✅ Connect to DB and start cron job
// connectDB()
//   .then(() => {
//     startStockCheckJob();
//   })
//   .catch((err) => console.error("MongoDB connection error:", err));

// // ✅ Routes
// app.get("/", (req, res) => {
//   res.json({ message: "API is running" });
// });
// app.use("/auth", authRoutes);
// app.use("/products", productRoutes);
// app.use("/payment", paymentRoutes);
// app.use("/users", userRoutes);
// app.use("/notifications", notificationRoutes);
// app.use("/categories", categoryRoutes);

// // ✅ Global error handler
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ error: "Something went wrong!" });
// });

// // ✅ Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// module.exports = app;
