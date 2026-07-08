// routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Create notification
router.post("/", async (req, res) => {
  try {
    const { message, type } = req.body;
    const notification = new Notification({ message, type: type || "general" });
    await notification.save();
    res.status(201).json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ error: "Failed to create notification" });
  }
});

// Mark as read
router.put("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

// Delete notification
router.delete("/:id", async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete notification" });
  }
});


module.exports = router;
