/**
 * aiController.js
 * Handles AI-driven endpoints: optimize plan, detect weak topics.
 */

const StudyPlan = require('../models/StudyPlan');
const { optimizePlan, detectWeakTopics } = require('../services/aiService');
const { createNotification } = require('../services/notificationService');

// ─── POST /api/ai/optimize ────────────────────────────────────────────────────
exports.optimizePlan = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne({ user: req.user._id, status: 'active' }).sort({ createdAt: -1 });
    if (!plan) return res.status(404).json({ success: false, message: 'No active study plan found.' });

    const result = await optimizePlan(plan);

    // Persist a notification with the optimization summary
    const topSuggestion = result.suggestions?.[0] || 'Plan optimization completed.';
    await createNotification({
      userId:      req.user._id,
      message:     `🤖 AI Optimization: ${topSuggestion}`,
      type:        'general',
      relatedPlan: plan._id,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/ai/weak-topics ──────────────────────────────────────────────────
exports.detectWeakTopics = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne({ user: req.user._id, status: 'active' }).sort({ createdAt: -1 });
    if (!plan) return res.status(404).json({ success: false, message: 'No active study plan found.' });

    const ranked = detectWeakTopics(plan);

    // Flag top weak subjects in notification if very weak
    const critical = ranked.filter((s) => s.weaknessScore > 60);
    if (critical.length > 0) {
      await createNotification({
        userId:  req.user._id,
        message: `📚 Weak topic alert: ${critical.map((s) => s.name).join(', ')} need more attention.`,
        type:    'low_progress',
        relatedPlan: plan._id,
      });
    }

    res.json({ success: true, count: ranked.length, data: ranked });
  } catch (err) {
    next(err);
  }
};
