



// controllers/productController.js

const Product = require("../models/Product");
const Category = require("../models/Category");
const Notification = require("../models/Notification");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

// ============================================================
// CLOUDINARY UPLOAD HELPER
// ============================================================
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    console.time("⏱️ Cloudinary Upload");

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "products",

        transformation: [
          {
            width: 1200,
            height: 1200,
            crop: "limit",
            quality: "auto",
            fetch_format: "auto",
          },
        ],
      },
      (error, result) => {
        console.timeEnd("⏱️ Cloudinary Upload");

        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier
      .createReadStream(file.buffer)
      .pipe(uploadStream);
  });
};

// ============================================================
// GET ALL PRODUCTS
// ============================================================

exports.getProducts = async (req, res) => {
  try {
    const { categoryId } = req.query;

    let query = {};

    if (categoryId) {
      query.category = categoryId;
    }

    const products = await Product.find(query).populate(
      "category",
      "name"
    );

    res.json(products);
  } catch (err) {
    console.error("Get products error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

// ============================================================
// GET SINGLE PRODUCT
// ============================================================

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(
      req.params.id
    ).populate("category", "name");

    if (!product) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    res.json(product);
  } catch (err) {
    console.error("Get product error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

// ============================================================
// ADD PRODUCT
// ============================================================

exports.addProduct = async (req, res) => {
    console.time("⏱️ TOTAL ADD PRODUCT");
  try {
    // ----------------------------------------------------------
    // GET FORM DATA
    // ----------------------------------------------------------

    const itemName = req.body.itemName?.trim();
    const categoryId = req.body.categoryId;

    const availableQuantity = Number(
      req.body.availableQuantity
    );

    const price = Number(req.body.price);

    // ----------------------------------------------------------
    // VALIDATE REQUIRED FIELDS
    // ----------------------------------------------------------

    if (!itemName || !categoryId) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    // ----------------------------------------------------------
    // VALIDATE NUMBER VALUES
    // ----------------------------------------------------------

    if (Number.isNaN(availableQuantity)) {
      return res.status(400).json({
        error: "Invalid available quantity",
      });
    }

    if (Number.isNaN(price)) {
      return res.status(400).json({
        error: "Invalid price",
      });
    }

    // ----------------------------------------------------------
    // VALIDATE CATEGORY
    // ----------------------------------------------------------

    const categoryExists = await Category.findById(
      categoryId
    );

    if (!categoryExists) {
      return res.status(400).json({
        error: "Invalid category",
      });
    }

    // ==========================================================
    // CHECK DUPLICATE PRODUCT NAME
    // ==========================================================

    const existingProduct = await Product.findOne({
      itemName,
    });

    if (existingProduct) {
      return res.status(400).json({
        error: "Product with this name already exists",
      });
    }

    // ==========================================================
    // CLOUDINARY IMAGE
    // ==========================================================

    let imageUrl = null;
    let imagePublicId = null;

    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file);

        imageUrl = result.secure_url;
        imagePublicId = result.public_id;
      } catch (cloudinaryError) {
        console.error(
          "Cloudinary upload error:",
          cloudinaryError
        );

        return res.status(500).json({
          error: "Image upload failed",
        });
      }
    }

    // ==========================================================
    // CREATE PRODUCT
    // ==========================================================

    const newProduct = new Product({
      itemName,
      description: req.body.description,

      availableQuantity,
      price,

      imageUrl,
      imagePublicId,

      category: categoryId,
    });
console.time("⏱️ MongoDB Save");
    try {
      await newProduct.save();

  console.timeEnd("⏱️ MongoDB Save");
    } catch (err) {
      // --------------------------------------------------------
      // HANDLE MONGODB DUPLICATE KEY
      // --------------------------------------------------------

      if (err.code === 11000) {
        console.error(
          "Duplicate product error:",
          err
        );

        // If image was uploaded but product creation failed,
        // delete the uploaded image to avoid unused Cloudinary files.
        if (imagePublicId) {
          try {
            await cloudinary.uploader.destroy(
              imagePublicId
            );
          } catch (deleteError) {
            console.error(
              "Failed to delete unused Cloudinary image:",
              deleteError.message
            );
          }
        }

        return res.status(400).json({
          error: "Product with this name already exists",
        });
      }

      throw err;
    }

    // ==========================================================
    // STOCK NOTIFICATION
    // ==========================================================

    if (newProduct.availableQuantity === 0) {
      const existingNotification =
        await Notification.findOne({
          productId: newProduct._id,
          type: "stock",
        });

      if (!existingNotification) {
        await Notification.create({
          productId: newProduct._id,
          message: `Product "${newProduct.itemName}" is out of stock!`,
          type: "stock",
          read: false,
        });
      }
    }

    // ==========================================================
    // RESPONSE
    // ==========================================================
console.timeEnd("⏱️ TOTAL ADD PRODUCT");
    res.status(201).json(newProduct);
  } catch (err) {
    console.error("Add product error:", err);

    // ----------------------------------------------------------
    // EXTRA DUPLICATE KEY PROTECTION
    // ----------------------------------------------------------

    if (err.code === 11000) {
      return res.status(400).json({
        error: "Product with this name already exists",
      });
    }

    res.status(500).json({
      error: err.message,
    });
  }
};

// ============================================================
// UPDATE PRODUCT
// ============================================================

exports.updateProduct = async (req, res) => {
  try {
    // ----------------------------------------------------------
    // FIND EXISTING PRODUCT
    // ----------------------------------------------------------

    const existingProduct = await Product.findById(
      req.params.id
    );

    if (!existingProduct) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    // ==========================================================
    // BUILD UPDATE DATA
    // ==========================================================

    const updateData = {};

    // ----------------------------------------------------------
    // ITEM NAME
    // ----------------------------------------------------------

    if (req.body.itemName !== undefined) {
      const itemName = req.body.itemName.trim();

      if (!itemName) {
        return res.status(400).json({
          error: "Product name cannot be empty",
        });
      }

      // Check whether another product already has this name
      const duplicateProduct = await Product.findOne({
        itemName,
        _id: { $ne: req.params.id },
      });

      if (duplicateProduct) {
        return res.status(400).json({
          error: "Product with this name already exists",
        });
      }

      updateData.itemName = itemName;
    }

    // ----------------------------------------------------------
    // DESCRIPTION
    // ----------------------------------------------------------

    if (req.body.description !== undefined) {
      updateData.description = req.body.description;
    }

    // ----------------------------------------------------------
    // AVAILABLE QUANTITY
    // ----------------------------------------------------------

    if (req.body.availableQuantity !== undefined) {
      const quantity = Number(
        req.body.availableQuantity
      );

      if (Number.isNaN(quantity)) {
        return res.status(400).json({
          error: "Invalid available quantity",
        });
      }

      updateData.availableQuantity = quantity;
    }

    // ----------------------------------------------------------
    // PRICE
    // ----------------------------------------------------------

    if (req.body.price !== undefined) {
      const price = Number(req.body.price);

      if (Number.isNaN(price)) {
        return res.status(400).json({
          error: "Invalid price",
        });
      }

      updateData.price = price;
    }

    // ----------------------------------------------------------
    // CATEGORY
    // ----------------------------------------------------------

    if (req.body.categoryId !== undefined) {
      updateData.category = req.body.categoryId;
    }

    // ==========================================================
    // VALIDATE CATEGORY
    // ==========================================================

    if (updateData.category) {
      const categoryExists = await Category.findById(
        updateData.category
      );

      if (!categoryExists) {
        return res.status(400).json({
          error: "Invalid category",
        });
      }
    }

    // ==========================================================
    // NEW IMAGE
    // ==========================================================

    let newImagePublicId = null;

    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file);

        updateData.imageUrl = result.secure_url;
        updateData.imagePublicId = result.public_id;

        newImagePublicId = result.public_id;
      } catch (cloudinaryError) {
        console.error(
          "Cloudinary upload error:",
          cloudinaryError
        );

        return res.status(500).json({
          error: "Image upload failed",
        });
      }
    }

    // ==========================================================
    // UPDATE PRODUCT
    // ==========================================================

    let updated;

    try {
      updated = await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      ).populate("category", "name");
    } catch (err) {
      // --------------------------------------------------------
      // HANDLE DUPLICATE KEY
      // --------------------------------------------------------

      if (err.code === 11000) {
        // Delete newly uploaded image because update failed
        if (newImagePublicId) {
          try {
            await cloudinary.uploader.destroy(
              newImagePublicId
            );
          } catch (deleteError) {
            console.error(
              "Failed to delete unused new image:",
              deleteError.message
            );
          }
        }

        return res.status(400).json({
          error: "Product with this name already exists",
        });
      }

      throw err;
    }

    if (!updated) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    // ==========================================================
    // STOCK NOTIFICATION
    // ==========================================================

    if (updated.availableQuantity === 0) {
      const existingNotification =
        await Notification.findOne({
          productId: updated._id,
          type: "stock",
        });

      if (!existingNotification) {
        await Notification.create({
          productId: updated._id,
          message: `Product "${updated.itemName}" is out of stock!`,
          type: "stock",
          read: false,
        });
      }
    } else {
      // Product is back in stock.
      // Remove old stock notifications.

      await Notification.deleteMany({
        productId: updated._id,
        type: "stock",
      });
    }

    // ==========================================================
    // DELETE OLD CLOUDINARY IMAGE
    // ==========================================================

    if (
      req.file &&
      existingProduct.imagePublicId &&
      existingProduct.imagePublicId !== newImagePublicId
    ) {
      try {
        await cloudinary.uploader.destroy(
          existingProduct.imagePublicId
        );

        console.log(
          "Old Cloudinary image deleted:",
          existingProduct.imagePublicId
        );
      } catch (cloudinaryError) {
        // Do not fail the product update just because
        // old image deletion failed.

        console.error(
          "Failed to delete old Cloudinary image:",
          cloudinaryError.message
        );
      }
    }

    // ==========================================================
    // RESPONSE
    // ==========================================================

    res.json(updated);
  } catch (err) {
    console.error("Update product error:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        error: "Product with this name already exists",
      });
    }

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// DELETE PRODUCT
// ============================================================

exports.deleteProduct = async (req, res) => {
  try {
    // ----------------------------------------------------------
    // FIND PRODUCT
    // ----------------------------------------------------------

    const product = await Product.findById(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    // ==========================================================
    // DELETE CLOUDINARY IMAGE
    // ==========================================================

    if (product.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(
          product.imagePublicId
        );

        console.log(
          "Cloudinary image deleted:",
          product.imagePublicId
        );
      } catch (cloudinaryError) {
        console.error(
          "Cloudinary image deletion failed:",
          cloudinaryError.message
        );

        return res.status(500).json({
          error:
            "Failed to delete product image from Cloudinary",
        });
      }
    }

    // ==========================================================
    // DELETE PRODUCT
    // ==========================================================

    await Product.findByIdAndDelete(
      req.params.id
    );

    // ==========================================================
    // DELETE STOCK NOTIFICATIONS
    // ==========================================================

    await Notification.deleteMany({
      productId: product._id,
      type: "stock",
    });

    // ==========================================================
    // RESPONSE
    // ==========================================================

    res.json({
      message: "Product and image deleted successfully",
    });
  } catch (err) {
    console.error("Delete product error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};















// // controllers/productController.js
// const Product = require("../models/Product");
// const Category = require("../models/Category");
// const Notification = require("../models/Notification");
// const cloudinary = require("../config/cloudinary");
// const streamifier = require("streamifier");

// // Get all products (with optional category filter)
// exports.getProducts = async (req, res) => {
//   try {
//     const { categoryId } = req.query;
//     let query = {};
//     if (categoryId) query.category = categoryId;

//     const products = await Product.find(query).populate("category", "name");
//     res.json(products);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };



// // Get single product by ID
// exports.getProductById = async (req, res) => {
//   try {
//     const product = await Product.findById(req.params.id).populate("category", "name");
//     if (!product) {
//       return res.status(404).json({ error: "Product not found" });
//     }
//     res.json(product);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };






// // Add product with image + full details
// exports.addProduct = async (req, res) => {
//   try {
//     let imageUrl = null;

//     const createProduct = async () => {
//       // ✅ Validate category
//       const categoryExists = await Category.findById(req.body.categoryId);
//       if (!categoryExists) {
//         return res.status(400).json({ error: "Invalid category" });
//       }

//       const newProduct = new Product({
//         itemName: req.body.itemName,
//         description: req.body.description,
//         availableQuantity: req.body.availableQuantity,
//         price: req.body.price,
//         imageUrl,
//         category: req.body.categoryId,
//       });

//       await newProduct.save();

//       // 🔎 Notification check (instant)
//       if (newProduct.availableQuantity === 0) {
//         const existing = await Notification.findOne({
//           productId: newProduct._id,
//           type: "stock",
//         });
//         if (!existing) {
//           await Notification.create({
//             productId: newProduct._id,
//             message: `Product "${newProduct.itemName}" is out of stock!`,
//             type: "stock",
//             read: false,
//           });
//         }
//       }

//       res.status(201).json(newProduct);
//     };

//     if (req.file) {
//       const uploadStream = cloudinary.uploader.upload_stream(
//         { folder: "products" },
//         async (error, result) => {
//           if (error) return res.status(500).json({ error: error.message });
//           imageUrl = result.secure_url;
//           await createProduct();
//         }
//       );
//       streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
//     } else {
//       await createProduct();
//     }
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// };

// // Update product (including image + stock notifications)
// exports.updateProduct = async (req, res) => {
//   try {
//     let updateData = {
//       itemName: req.body.itemName,
//       description: req.body.description,
//       availableQuantity: req.body.availableQuantity,
//       price: req.body.price,
//       category: req.body.categoryId,
//     };

//     const handleUpdate = async () => {
//       // ✅ Validate category if provided
//       if (updateData.category) {
//         const categoryExists = await Category.findById(updateData.category);
//         if (!categoryExists) {
//           return res.status(400).json({ error: "Invalid category" });
//         }
//       }

//       const updated = await Product.findByIdAndUpdate(
//         req.params.id,
//         updateData,
//         { returnDocument: "after", runValidators: true }
//       ).populate("category", "name");

//       if (!updated) return res.status(404).json({ error: "Product not found" });

//       // 🔎 Notification logic (instant)
//       if (updated.availableQuantity === 0) {
//         const existing = await Notification.findOne({
//           productId: updated._id,
//           type: "stock",
//         });
//         if (!existing) {
//           await Notification.create({
//             productId: updated._id,
//             message: `Product "${updated.itemName}" is out of stock!`,
//             type: "stock",
//             read: false,
//           });
//         }
//       } else {
//         await Notification.deleteMany({ productId: updated._id, type: "stock" });
//       }

//       res.json(updated);
//     };

//     if (req.file) {
//       const uploadStream = cloudinary.uploader.upload_stream(
//         { folder: "products" },
//         async (error, result) => {
//           if (error) return res.status(500).json({ error: error.message });
//           updateData.imageUrl = result.secure_url;
//           await handleUpdate();
//         }
//       );
//       streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
//     } else {
//       await handleUpdate();
//     }
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// };

// // Delete product
// exports.deleteProduct = async (req, res) => {
//   try {
//     const deleted = await Product.findByIdAndDelete(req.params.id);
//     if (!deleted) return res.status(404).json({ error: "Product not found" });

//     // 🗑️ Clean up notifications for deleted product
//     await Notification.deleteMany({ productId: deleted._id, type: "stock" });

//     res.json({ message: "Product deleted" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };















// controllers/productController.js

// const Product = require("../models/Product");
// const Category = require("../models/Category");
// const Notification = require("../models/Notification");
// const cloudinary = require("../config/cloudinary");
// const streamifier = require("streamifier");

// exports.getProducts = async (req, res) => {
//   try {
//     const { categoryId } = req.query;

//     let query = {};

//     if (categoryId) {
//       query.category = categoryId;
//     }

//     const products = await Product.find(query).populate(
//       "category",
//       "name"
//     );

//     res.json(products);
//   } catch (err) {
//     res.status(500).json({
//       error: err.message,
//     });
//   }
// };


// exports.getProductById = async (req, res) => {
//   try {
//     const product = await Product.findById(req.params.id).populate(
//       "category",
//       "name"
//     );

//     if (!product) {
//       return res.status(404).json({
//         error: "Product not found",
//       });
//     }

//     res.json(product);
//   } catch (err) {
//     res.status(500).json({
//       error: err.message,
//     });
//   }
// };





// exports.addProduct = async (req, res) => {
//   try {
//     let imageUrl = null;
//     let imagePublicId = null;

//     const createProduct = async () => {
//       if (!req.body.itemName || !req.body.categoryId) {
//         return res.status(400).json({ error: "Missing required fields" });
//       }

//       const categoryExists = await Category.findById(req.body.categoryId);
//       if (!categoryExists) {
//         return res.status(400).json({ error: "Invalid category" });
//       }

//       const newProduct = new Product({
//         itemName: req.body.itemName,
//         description: req.body.description,
//         availableQuantity: Number(req.body.availableQuantity),
//         price: Number(req.body.price),
//         imageUrl,
//         imagePublicId,
//         category: req.body.categoryId,
//       });

//       await newProduct.save();

//       if (newProduct.availableQuantity === 0) {
//         const existing = await Notification.findOne({ productId: newProduct._id, type: "stock" });
//         if (!existing) {
//           await Notification.create({
//             productId: newProduct._id,
//             message: `Product "${newProduct.itemName}" is out of stock!`,
//             type: "stock",
//             read: false,
//           });
//         }
//       }

//       res.status(201).json(newProduct);
//     };

//     if (req.file) {
//       try {
//         const uploadStream = cloudinary.uploader.upload_stream(
//           { folder: "products" },
//           async (error, result) => {
//             if (error) {
//               console.error("Cloudinary error:", error);
//               return res.status(500).json({ error: "Image upload failed" });
//             }
//             imageUrl = result.secure_url;
//             imagePublicId = result.public_id;
//             await createProduct();
//           }
//         );
//         streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
//       } catch (err) {
//         console.error("Upload stream error:", err);
//         return res.status(500).json({ error: "Image processing failed" });
//       }
//     } else {
//       await createProduct();
//     }
//   } catch (err) {
//     console.error("Add product error:", err);
//     res.status(500).json({ error: err.message });
//   }
// };


// exports.updateProduct = async (req, res) => {
//   try {
//     // Find existing product first.
//     // We need the old imagePublicId if a new image is uploaded.
//     const existingProduct = await Product.findById(req.params.id);

//     if (!existingProduct) {
//       return res.status(404).json({
//         error: "Product not found",
//       });
//     }

//     let updateData = {
//       itemName: req.body.itemName,
//       description: req.body.description,
//       availableQuantity: Number(req.body.availableQuantity),
//       price: Number(req.body.price),
//       category: req.body.categoryId,
//     };

//     const handleUpdate = async () => {

//       if (updateData.category) {
//         const categoryExists = await Category.findById(
//           updateData.category
//         );

//         if (!categoryExists) {
//           return res.status(400).json({
//             error: "Invalid category",
//           });
//         }
//       }

//       const updated = await Product.findByIdAndUpdate(
//         req.params.id,
//         updateData,
//         {
//           new: true,
//           runValidators: true,
//         }
//       ).populate("category", "name");

//       if (!updated) {
//         return res.status(404).json({
//           error: "Product not found",
//         });
//       }

//       if (updated.availableQuantity === 0) {
//         const existing = await Notification.findOne({
//           productId: updated._id,
//           type: "stock",
//         });

//         if (!existing) {
//           await Notification.create({
//             productId: updated._id,
//             message: `Product "${updated.itemName}" is out of stock!`,
//             type: "stock",
//             read: false,
//           });
//         }
//       } else {
//         await Notification.deleteMany({
//           productId: updated._id,
//           type: "stock",
//         });
//       }

//       res.json(updated);
//     };

//     if (req.file) {
//       const uploadStream = cloudinary.uploader.upload_stream(
//         {
//           folder: "products",
//         },
//         async (error, result) => {
//           if (error) {
//             console.error("Cloudinary error:", error);
//             return res.status(500).json({ error: "Image upload failed" });
//           }

          
//           updateData.imageUrl = result.secure_url;
//           updateData.imagePublicId = result.public_id;

//           await handleUpdate();

//           if (existingProduct.imagePublicId) {
//             try {
//               await cloudinary.uploader.destroy(
//                 existingProduct.imagePublicId
//               );

//               console.log(
//                 "Old Cloudinary image deleted:",
//                 existingProduct.imagePublicId
//               );
//             } catch (cloudinaryError) {
//               console.error(
//                 "Failed to delete old Cloudinary image:",
//                 cloudinaryError.message
//               );
//             }
//           }
//         }
//       );

//       streamifier
//         .createReadStream(req.file.buffer)
//         .pipe(uploadStream);
//     } else {
//       // No new image
//       await handleUpdate();
//     }
//   } catch (err) {
//     console.error("Update product error:", err);

//     res.status(400).json({
//       error: err.message,
//     });
//   }
// };


// exports.deleteProduct = async (req, res) => {
//   try {
//     const product = await Product.findById(req.params.id);

//     if (!product) {
//       return res.status(404).json({
//         error: "Product not found",
//       });
//     }
//     if (product.imagePublicId) {
//       try {
//         await cloudinary.uploader.destroy(
//           product.imagePublicId
//         );

//         console.log(
//           "Cloudinary image deleted:",
//           product.imagePublicId
//         );
//       } catch (cloudinaryError) {
//         console.error(
//           "Cloudinary image deletion failed:",
//           cloudinaryError.message
//         );

//         return res.status(500).json({
//           error: "Failed to delete product image from Cloudinary",
//         });
//       }
//     }

//     await Product.findByIdAndDelete(req.params.id);

//     await Notification.deleteMany({
//       productId: product._id,
//       type: "stock",
//     });

//     res.json({
//       message: "Product and image deleted successfully",
//     });
//   } catch (err) {
//     console.error("Delete product error:", err);

//     res.status(500).json({
//       error: err.message,
//     });
//   }
// };


