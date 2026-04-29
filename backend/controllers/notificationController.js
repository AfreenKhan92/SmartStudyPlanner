const Notification = require('../models/Notification');

// ─── GET /api/notifications ───────────────────────────────────────────────────
exports.getNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit);

    const unreadCount = await Notification.countDocuments({
      user:   req.user._id,
      isRead: false,
    });

    res.json({ success: true, count: notifications.length, unreadCount, data: notifications });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────
exports.markAsRead = async (req, res, next) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found.' });
    res.json({ success: true, data: n });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/notifications/:id ───────────────────────────────────────────
exports.deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Notification deleted.' });
  } catch (err) {
    next(err);
  }
};
