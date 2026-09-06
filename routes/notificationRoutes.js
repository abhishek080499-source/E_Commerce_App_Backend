
const express = require("express");

const router = express.Router();

const {
  createNotification,
  getNotifications,
  markAsRead,
  deleteNotification,
} = require("../controllers/notificationController");

const {
  authMiddleware,
  isAdmin,
} = require("../middleware/authMiddleware");

// Get all notifications
router.get(
  "/",
  authMiddleware,
  isAdmin,
  getNotifications
);

// Create notification
router.post(
  "/",
  authMiddleware,
  isAdmin,
  createNotification
);

// Mark notification as read
router.put(
  "/:id/read",
  authMiddleware,
  isAdmin,
  markAsRead
);

// Delete notification
router.delete(
  "/:id",
  authMiddleware,
  isAdmin,
  deleteNotification
);

module.exports = router;
