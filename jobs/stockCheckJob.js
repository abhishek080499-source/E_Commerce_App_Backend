const cron = require("node-cron");
const Product = require("../models/Product");
const Notification = require("../models/Notification");

async function checkOutOfStock() {
  const outOfStockProducts = await Product.find({ availableQuantity: 0 });

  for (const product of outOfStockProducts) {
    const exists = await Notification.findOne({
      type: "stock",
      message: `Product "${product.itemName}" is out of stock!`
    });

    if (!exists) {
      await Notification.create({
        message: `Product "${product.itemName}" is out of stock!`,
        type: "stock",
        read: false,
      });
    }
  }
}

function startStockCheckJob() {
  // Run once immediately at startup
  checkOutOfStock();

  // Then run every day at midnight (00:00)
  cron.schedule("0 0 * * *", async () => {
    console.log("🔎 Checking stock every day at midnight...");
    await checkOutOfStock();
  });
}

module.exports = { startStockCheckJob };
