const Bill = require("../models/Bill");
const Product = require("../models/Product");
const Notification = require("../models/Notification");   // ✅ Import Notification model
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// ✅ Payment Controller
const pay = async (req, res) => {
  try {
    const { customerName, address, phone,email,pincode, items, grandTotal } = req.body;

    // ✅ Generate unique 5-6 digit random bill number
    let billNumber;
    let exists = true;
    while (exists) {
      const randomNumber = Math.floor(10000 + Math.random() * 900000);
      billNumber = `BILL-${randomNumber}`;
      exists = await Bill.findOne({ billNumber });
    }

    // ✅ Map items to match schema
    const mappedItems = items.map(item => ({
      productName: item.itemName,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
      productId: item._id   // ✅ keep productId for stock update
    }));

    // ✅ Save bill in DB
    const newBill = new Bill({
      billNumber,
      customerName,
      address,
      phone,
      email,
      pincode,
      items: mappedItems,
      grandTotal
    });
    await newBill.save();

    // ✅ Reduce stock for each product
    for (const item of mappedItems) {
      const product = await Product.findById(item.productId);
      if (product) {
        if (product.availableQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            error: `Not enough stock for ${product.itemName}`
          });
        }

        product.availableQuantity -= item.quantity;
        await product.save();

        // ✅ Create or remove notification based on stock
        if (product.availableQuantity === 0) {
          const existing = await Notification.findOne({
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
          // If stock replenished later, clean up old notifications
          await Notification.deleteMany({ productId: product._id, type: "stock" });
        }
      }
    }

    // ✅ Generate PDF
    const invoicesDir = path.join(__dirname, "../invoices");
    if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir);

    const filePath = path.join(invoicesDir, `${billNumber}.pdf`);
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // PDF Content
    doc.fontSize(20).text("Invoice / Bill", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Bill Number: ${billNumber}`);
    doc.text(`Customer Name: ${customerName}`);
    doc.text(`Address: ${address}`);
    doc.text(`Phone: ${phone}`);
    doc.text(`Email: ${email}`);
    doc.text(`Pincode: ${pincode}`);
    doc.moveDown();

    doc.text("Items:");
    mappedItems.forEach((item, i) => {
      doc.text(
        `${i + 1}. ${item.productName} - Qty: ${item.quantity} - Price: ₹${item.price} - Total: ₹${item.total}`
      );
    });

    doc.moveDown();
    doc.fontSize(14).text(`Grand Total: ₹${grandTotal}`, { align: "right" });

    doc.end();

    stream.on("finish", () => {
      res.status(201).json({
        success: true,
        message: "Payment successful, bill stored, stock updated, notifications checked, and PDF generated!",
        bill: newBill,
        pdfUrl: `/payment/invoice/${billNumber}`
      });
    });
  } catch (err) {
    console.error("Payment error:", err);
    res.status(500).json({ success: false, error: "Failed to store bill" });
  }
};

// ✅ Serve PDF file
const getInvoice = (req, res) => {
  const { billNumber } = req.params;
  const filePath = path.join(__dirname, `../invoices/${billNumber}.pdf`);
  res.download(filePath);
};

// ✅ Fetch all bills (for Admin Dashboard)
const getAllBills = async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, bills });
  } catch (err) {
    console.error("Error fetching bills:", err);
    res.status(500).json({ success: false, error: "Failed to fetch bills" });
  }
};

module.exports = { pay, getInvoice, getAllBills };
