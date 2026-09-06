
const Notification = require("../models/Notification");

// Create notification
const createNotification = async (req, res) => {
  try {
    const { message, type } = req.body;

    const notification = new Notification({
      message,
      type: type || "general",
      read: false,
    });

    await notification.save();

    res.status(201).json({
      success: true,
      notification,
    });
  } catch (err) {
    console.error("Error creating notification:", err);

    res.status(500).json({
      success: false,
      error: "Failed to create notification",
    });
  }
};

// Get all notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({
      createdAt: -1,
    });

    // Return array directly
    res.status(200).json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);

    res.status(500).json({
      success: false,
      error: "Failed to fetch notifications",
    });
  }
};

// Mark as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { read: true },
      { returnDocument: "after" }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      notification,
    });
  } catch (err) {
    console.error("Error marking notification as read:", err);

    res.status(500).json({
      success: false,
      error: "Failed to update notification",
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (err) {
    console.error("Error deleting notification:", err);

    res.status(500).json({
      success: false,
      error: "Failed to delete notification",
    });
  }
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  deleteNotification,
};
