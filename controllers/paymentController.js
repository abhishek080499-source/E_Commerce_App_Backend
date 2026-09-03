const Bill = require("../models/Bill");
const Product = require("../models/Product");
const Notification = require("../models/Notification");
const cloudinary = require("../config/cloudinary");
const PDFDocument = require("pdfkit");
const streamifier = require("streamifier");

// ============================================================
// Upload PDF Buffer to Cloudinary
// ============================================================
function uploadPdfToCloudinary(buffer, billNumber) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: "invoices",
        public_id: billNumber,
        format: "pdf",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier
      .createReadStream(buffer)
      .pipe(uploadStream);
  });
}

// ============================================================
// Generate PDF as Buffer
// ============================================================
function generateInvoicePdf({
  billNumber,
  customerName,
  address,
  phone,
  email,
  pincode,
  mappedItems,
  grandTotal,
}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
      });

      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", (error) => {
        reject(error);
      });

      // =========================================================
      // HEADER
      // =========================================================

      doc
        .fontSize(26)
        .font("Helvetica-Bold")
        .text("INVOICE", { align: "center" });

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#666666")
        .text("Thank you for shopping with us!", {
          align: "center",
        });

      doc.moveDown(1.5);

      // =========================================================
      // BILL INFORMATION
      // =========================================================

      const startY = doc.y;

      doc
        .fontSize(10)
        .fillColor("#333333")
        .font("Helvetica-Bold")
        .text("Invoice Details", 50, startY);

      doc
        .font("Helvetica")
        .fontSize(10)
        .text(`Invoice Number: ${billNumber}`, 50, startY + 18)
        .text(
          `Invoice Date: ${new Date().toLocaleDateString("en-IN")}`,
          50,
          startY + 34
        );

      // =========================================================
      // CUSTOMER DETAILS
      // =========================================================

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("Billed To", 330, startY);

      doc
        .font("Helvetica")
        .fontSize(10)
        .text(customerName, 330, startY + 18)
        .text(address, 330, startY + 34)
        .text(`Pincode: ${pincode}`, 330, startY + 50)
        .text(`Phone: ${phone}`, 330, startY + 66)
        .text(`Email: ${email}`, 330, startY + 82);

      doc.moveDown(7);

      // =========================================================
      // ITEMS TABLE
      // =========================================================

      const tableTop = doc.y;

      const colX = {
        sno: 50,
        product: 85,
        qty: 350,
        price: 405,
        total: 475,
      };

      // Table header background
      doc
        .rect(50, tableTop, 495, 28)
        .fill("#eeeeee");

      doc
        .fillColor("#222222")
        .font("Helvetica-Bold")
        .fontSize(9);

      doc.text("S.No", colX.sno, tableTop + 9);
      doc.text("Product", colX.product, tableTop + 9);
      doc.text("Qty", colX.qty, tableTop + 9);
      doc.text("Price", colX.price, tableTop + 9);
      doc.text("Total", colX.total, tableTop + 9);

      let currentY = tableTop + 28;

      // =========================================================
      // TABLE ROWS
      // =========================================================

      mappedItems.forEach((item, index) => {
        const rowHeight = 38;

        // Row border
        doc
          .strokeColor("#dddddd")
          .lineWidth(0.5)
          .moveTo(50, currentY + rowHeight)
          .lineTo(545, currentY + rowHeight)
          .stroke();

        doc
          .fillColor("#333333")
          .font("Helvetica")
          .fontSize(9);

        doc.text(`${index + 1}`, colX.sno, currentY + 12);

        // Product name
        doc.text(
          item.productName,
          colX.product,
          currentY + 12,
          {
            width: 250,
            ellipsis: true,
          }
        );

        doc.text(
          String(item.quantity),
          colX.qty,
          currentY + 12
        );

        doc.text(
          `Rs. ${Number(item.price).toFixed(2)}`,
          colX.price,
          currentY + 12
        );

        doc.text(
          `Rs. ${Number(item.total).toFixed(2)}`,
          colX.total,
          currentY + 12
        );

        currentY += rowHeight;
      });

      // =========================================================
      // TOTAL SECTION
      // =========================================================

      doc.moveDown(1.5);

      const totalY = currentY + 20;

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#444444")
        .text("Subtotal:", 390, totalY);

      doc
        .text(
          `Rs. ${Number(grandTotal).toFixed(2)}`,
          475,
          totalY
        );

      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor("#111111")
        .text("Grand Total:", 350, totalY + 25);

      doc
        .fontSize(14)
        .text(
          `Rs. ${Number(grandTotal).toFixed(2)}`,
          475,
          totalY + 25
        );

      // =========================================================
      // ORDER MESSAGE
      // =========================================================

      doc.moveDown(5);

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#222222")
        .text("Thank You For Your Order!");

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#666666")
        .text(
          "We appreciate your business and hope you enjoy your purchase."
        );

      doc.moveDown(0.5);

      doc.text(
        "Please keep this invoice for your records. If you have any questions",
        {
          width: 495,
        }
      );

      doc.text(
        "regarding your order, please contact our customer support team."
      );

      // =========================================================
      // FOOTER
      // =========================================================

      doc
        .fontSize(8)
        .fillColor("#888888")
        .text(
          "This is a computer-generated invoice and does not require a signature.",
          50,
          760,
          {
            align: "center",
            width: 495,
          }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================
// Payment Controller
// ============================================================
const pay = async (req, res) => {
  try {
    const {
      customerName,
      address,
      phone,
      email,
      pincode,
      items,
      grandTotal,
    } = req.body;

    console.log("req.user =", req.user);
    console.log("body =", req.body);

    // ========================================================
    // Basic validation
    // ========================================================
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No products found in the order.",
      });
    }

    // ========================================================
    // Generate unique 5-6 digit bill number
    // ========================================================
    let billNumber;
    let exists = true;

    while (exists) {
      const randomNumber = Math.floor(
        10000 + Math.random() * 900000
      );

      billNumber = `BILL-${randomNumber}`;

      exists = await Bill.findOne({
        billNumber,
      });
    }

    // ========================================================
    // Map items to match Bill schema
    // ========================================================
    const mappedItems = items.map((item) => ({
      productName: item.itemName,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
      productId: item._id,
    }));

    console.log("Decoded User:", req.user);

    // ========================================================
    // Save bill in DB
    // ========================================================
    const newBill = new Bill({
      userId: req.user.id,
      billNumber,
      customerName,
      address,
      phone,
      email,
      pincode,
      items: mappedItems,
      grandTotal,
      status: "Pending",
    });

    console.log(newBill);

    console.log("Creating bill:", {
      userId: req.user.id,
      status: "Pending",
    });

    await newBill.save();

    // ========================================================
    // Reduce stock for each product
    // ========================================================
    for (const item of mappedItems) {
      const product = await Product.findById(
        item.productId
      );

      if (product) {
        // Check stock
        if (
          product.availableQuantity <
          item.quantity
        ) {
          return res.status(400).json({
            success: false,
            error: `Not enough stock for ${product.itemName}`,
          });
        }

        // Reduce stock
        product.availableQuantity -= item.quantity;

        await product.save();

        // ====================================================
        // Create or remove stock notification
        // ====================================================
        if (product.availableQuantity === 0) {
          const existing =
            await Notification.findOne({
              productId: product._id,
              type: "stock",
            });

          if (!existing) {
            await Notification.create({
              productId: product._id,
              message: `Product "${product.itemName}" is out of stock!`,
              type: "stock",
              read: false,
            });
          }
        } else {
          // If stock is available, remove old notification
          await Notification.deleteMany({
            productId: product._id,
            type: "stock",
          });
        }
      }
    }

    // ========================================================
    // Generate PDF in memory
    // ========================================================
    const pdfBuffer = await generateInvoicePdf({
      billNumber,
      customerName,
      address,
      phone,
      email,
      pincode,
      mappedItems,
      grandTotal,
    });

    // ========================================================
    // Upload PDF to Cloudinary
    // ========================================================
    const cloudinaryResult =
      await uploadPdfToCloudinary(
        pdfBuffer,
        billNumber
      );

    console.log(
      "Invoice uploaded to Cloudinary:",
      cloudinaryResult.secure_url
    );

    // ========================================================
    // Save Cloudinary invoice information in Bill
    // ========================================================
    newBill.invoiceUrl =
      cloudinaryResult.secure_url;

    newBill.invoicePublicId =
      cloudinaryResult.public_id;

    await newBill.save();

    // ========================================================
    // Final response
    // ========================================================
    res.status(201).json({
      success: true,

      message:
        "Payment successful, bill stored, stock updated, notifications checked, and PDF uploaded to Cloudinary!",

      bill: newBill,

      // Cloudinary PDF URL
      pdfUrl: cloudinaryResult.secure_url,
    });
  } catch (err) {
    console.error("Payment error:", err);

    res.status(500).json({
      success: false,
      error: "Failed to store bill",
    });
  }
};

// ============================================================
// Serve / Open Invoice
// ============================================================
// Instead of downloading a local file, redirect to Cloudinary.
const getInvoice = async (req, res) => {
  try {
    const { billNumber } = req.params;

    const bill = await Bill.findOne({
      billNumber,
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        error: "Bill not found",
      });
    }

    if (!bill.invoiceUrl) {
      return res.status(404).json({
        success: false,
        error: "Invoice PDF not found",
      });
    }

    // Redirect user to Cloudinary PDF
    return res.redirect(bill.invoiceUrl);
  } catch (err) {
    console.error("Get Invoice Error:", err);

    res.status(500).json({
      success: false,
      error: "Failed to fetch invoice",
    });
  }
};

// ============================================================
// Fetch all bills - Admin
// ============================================================
const getAllBills = async (req, res) => {
  try {
    const bills = await Bill.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      bills,
    });
  } catch (err) {
    console.error(
      "Error fetching bills:",
      err
    );

    res.status(500).json({
      success: false,
      error: "Failed to fetch bills",
    });
  }
};

// ============================================================
// Update Order Status - Admin
// ============================================================
const updateOrderStatus = async (req, res) => {
  try {
    const { billNumber } = req.params;
    const { status } = req.body;

    // Validate status
    const allowedStatus = [
      "Pending",
      "Processing",
      "Delivered",
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid order status",
      });
    }

    const bill = await Bill.findOne({
      billNumber,
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        error: "Bill not found",
      });
    }

    // Prevent updating after delivery
    if (bill.status === "Delivered") {
      return res.status(400).json({
        success: false,
        error:
          "Delivered orders cannot be modified.",
      });
    }

    // Prevent skipping statuses
    if (
      bill.status === "Pending" &&
      status !== "Processing"
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Pending orders can only move to Processing.",
      });
    }

    if (
      bill.status === "Processing" &&
      status !== "Delivered"
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Processing orders can only move to Delivered.",
      });
    }

    bill.status = status;

    await bill.save();

    res.status(200).json({
      success: true,
      message:
        "Order status updated successfully.",
      bill,
    });
  } catch (err) {
    console.error(
      "Update Status Error:",
      err
    );

    res.status(500).json({
      success: false,
      error:
        "Failed to update order status.",
    });
  }
};

// ============================================================
// Get My Orders - Customer
// ============================================================
const getMyOrders = async (req, res) => {
  try {
    const bills = await Bill.find({
      userId: req.user.id,
    }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      bills,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
    });
  }
};



// ============================================================
// Delete Bill - Admin Only
// ============================================================
const deleteBill = async (req, res) => {
  try {
    const { billNumber } = req.params;

    // Find bill
    const bill = await Bill.findOne({ billNumber });

    if (!bill) {
      return res.status(404).json({
        success: false,
        error: "Bill not found.",
      });
    }

    // ==========================================================
    // Delete Invoice from Cloudinary
    // ==========================================================
    if (bill.invoicePublicId) {
      try {
        await cloudinary.uploader.destroy(
          bill.invoicePublicId,
          {
            resource_type: "image",
          }
        );

        console.log(
          `Invoice deleted from Cloudinary: ${bill.invoicePublicId}`
        );
      } catch (cloudinaryError) {
        console.error(
          "Cloudinary invoice delete error:",
          cloudinaryError
        );
      }
    }

    // ==========================================================
    // Delete Bill from MongoDB
    // ==========================================================
    await Bill.deleteOne({
      _id: bill._id,
    });

    return res.status(200).json({
      success: true,
      message: "Bill deleted successfully.",
    });
  } catch (err) {
    console.error("Delete Bill Error:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to delete bill.",
    });
  }
};



// ============================================================
// Exports
// ============================================================
module.exports = {
  pay,
  getInvoice,
  getAllBills,
  updateOrderStatus,
  getMyOrders,
  deleteBill,
};
