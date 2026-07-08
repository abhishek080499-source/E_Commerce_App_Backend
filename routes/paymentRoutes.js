// const express = require("express");
// const { pay, getInvoice } = require("../controllers/paymentController");

// const router = express.Router();

// router.post("/pay", pay);                 // store bill + generate PDF
// router.get("/invoice/:billNumber", getInvoice); // download PDF

// module.exports = router;





const express = require("express");
const { pay, getInvoice, getAllBills } = require("../controllers/paymentController");

const router = express.Router();

// ✅ Store bill + generate PDF
router.post("/pay", pay);

// ✅ Download invoice PDF
router.get("/invoice/:billNumber", getInvoice);

// ✅ Fetch all bills (Admin Dashboard)
router.get("/all", getAllBills);

module.exports = router;
