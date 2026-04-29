const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: ['missed_task', 'upcoming_exam', 'low_progress', 'plan_complete', 'streak', 'general'],
      default: 'general',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    relatedPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyPlan',
    },
    relatedSubject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
