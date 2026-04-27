/**
 * notificationService.js
 * Helpers to create and retrieve user notifications.
 */

const Notification = require('../models/Notification');

/**
 * createNotification
 */
async function createNotification({ userId, message, type = 'general', relatedPlan, relatedSubject }) {
  try {
    return await Notification.create({
      user:           userId,
      message,
      type,
      relatedPlan,
      relatedSubject,
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

/**
 * triggerMissedTaskAlerts
 * Called after missed-task detection; creates one aggregate notification.
 */
async function triggerMissedTaskAlerts(userId, missedCount, planId) {
  if (missedCount <= 0) return;
  await createNotification({
    userId,
    message:     `You missed ${missedCount} task${missedCount > 1 ? 's' : ''} yesterday. They have been rescheduled automatically.`,
    type:        'missed_task',
    relatedPlan: planId,
  });
}

/**
 * triggerLowProgressAlert
 */
async function triggerLowProgressAlert(userId, pct, planId) {
  await createNotification({
    userId,
    message:     `Your overall plan progress is only ${pct}%. Consider dedicating more time to your studies.`,
    type:        'low_progress',
    relatedPlan: planId,
  });
}

/**
 * triggerUpcomingExamAlert
 */
async function triggerUpcomingExamAlert(userId, subjectName, daysLeft, subjectId) {
  await createNotification({
    userId,
    message:        `Your exam for "${subjectName}" is in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Make sure you're on track!`,
    type:           'upcoming_exam',
    relatedSubject: subjectId,
  });
}

module.exports = {
  createNotification,
  triggerMissedTaskAlerts,
  triggerLowProgressAlert,
  triggerUpcomingExamAlert,
};
