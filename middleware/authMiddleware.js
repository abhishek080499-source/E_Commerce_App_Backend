const jwt = require("jsonwebtoken");

// 🔹 Verify JWT from cookie
function authMiddleware(req, res, next) {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretKey");
    req.user = decoded; // attach user info to request
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// 🔹 Role check: Admin only
function isAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ error: "Admin access required" });
}

// 🔹 Role check: Customer only
function isCustomer(req, res, next) {
  if (req.user && req.user.role === "customer") {
    return next();
  }
  return res.status(403).json({ error: "Customer access required" });
}

module.exports = { authMiddleware, isAdmin, isCustomer };
