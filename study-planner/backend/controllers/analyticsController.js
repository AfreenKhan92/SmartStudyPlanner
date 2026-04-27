/**
 * analyticsController.js
 * Returns rich analytics data for charts.
 */

const StudyPlan = require('../models/StudyPlan');
const { getFullAnalytics } = require('../services/analyticsService');

// ─── GET /api/analytics ────────────────────────────────────────────────────────
exports.getAnalytics = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne({ user: req.user._id, status: 'active' }).sort({ createdAt: -1 });
    if (!plan) return res.status(404).json({ success: false, message: 'No active study plan found.' });

    const analytics = getFullAnalytics(plan);
    res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
};
