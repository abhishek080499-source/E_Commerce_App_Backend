// controllers/productController.js
const Product = require("../models/Product");
const Category = require("../models/Category");
const Notification = require("../models/Notification");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

// Get all products (with optional category filter)
exports.getProducts = async (req, res) => {
  try {
    const { categoryId } = req.query;
    let query = {};
    if (categoryId) query.category = categoryId;

    const products = await Product.find(query).populate("category", "name");
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add product with image + full details
exports.addProduct = async (req, res) => {
  try {
    let imageUrl = null;

    const createProduct = async () => {
      // ✅ Validate category
      const categoryExists = await Category.findById(req.body.categoryId);
      if (!categoryExists) {
        return res.status(400).json({ error: "Invalid category" });
      }

      const newProduct = new Product({
        itemName: req.body.itemName,
        description: req.body.description,
        availableQuantity: req.body.availableQuantity,
        price: req.body.price,
        imageUrl,
        category: req.body.categoryId,
      });

      await newProduct.save();

      // 🔎 Notification check (instant)
      if (newProduct.availableQuantity === 0) {
        const existing = await Notification.findOne({
          productId: newProduct._id,
          type: "stock",
        });
        if (!existing) {
          await Notification.create({
            productId: newProduct._id,
            message: `Product "${newProduct.itemName}" is out of stock!`,
            type: "stock",
            read: false,
          });
        }
      }

      res.status(201).json(newProduct);
    };

    if (req.file) {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "products" },
        async (error, result) => {
          if (error) return res.status(500).json({ error: error.message });
          imageUrl = result.secure_url;
          await createProduct();
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    } else {
      await createProduct();
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update product (including image + stock notifications)
exports.updateProduct = async (req, res) => {
  try {
    let updateData = {
      itemName: req.body.itemName,
      description: req.body.description,
      availableQuantity: req.body.availableQuantity,
      price: req.body.price,
      category: req.body.categoryId,
    };

    const handleUpdate = async () => {
      // ✅ Validate category if provided
      if (updateData.category) {
        const categoryExists = await Category.findById(updateData.category);
        if (!categoryExists) {
          return res.status(400).json({ error: "Invalid category" });
        }
      }

      const updated = await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        { returnDocument: "after", runValidators: true }
      ).populate("category", "name");

      if (!updated) return res.status(404).json({ error: "Product not found" });

      // 🔎 Notification logic (instant)
      if (updated.availableQuantity === 0) {
        const existing = await Notification.findOne({
          productId: updated._id,
          type: "stock",
        });
        if (!existing) {
          await Notification.create({
            productId: updated._id,
            message: `Product "${updated.itemName}" is out of stock!`,
            type: "stock",
            read: false,
          });
        }
      } else {
        await Notification.deleteMany({ productId: updated._id, type: "stock" });
      }

      res.json(updated);
    };

    if (req.file) {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "products" },
        async (error, result) => {
          if (error) return res.status(500).json({ error: error.message });
          updateData.imageUrl = result.secure_url;
          await handleUpdate();
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    } else {
      await handleUpdate();
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Product not found" });

    // 🗑️ Clean up notifications for deleted product
    await Notification.deleteMany({ productId: deleted._id, type: "stock" });

    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
