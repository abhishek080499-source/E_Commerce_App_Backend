const express = require("express");
const {
  pay,
  getInvoice,
  getAllBills,
  updateOrderStatus,
  getMyOrders,
  deleteBill,
} = require("../controllers/paymentController");

const { authMiddleware, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Store bill + generate PDF
router.post("/pay", authMiddleware, pay);

// ✅ Download invoice PDF
router.get("/invoice/:billNumber", authMiddleware,getInvoice);

// ✅ Fetch all bills (Admin Dashboard)
router.get("/all", authMiddleware, isAdmin, getAllBills);

// ✅ Fetch my orders
router.get("/my-orders", authMiddleware, getMyOrders);

// ✅ Update Order Status (Admin Only)
router.patch(
  "/status/:billNumber",
  authMiddleware,
  isAdmin,
  updateOrderStatus
);


router.delete(
  "/delete/:billNumber",
  authMiddleware,
  isAdmin,
  deleteBill
);


module.exports = router;