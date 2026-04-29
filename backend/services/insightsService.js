/**
 * insightsService.js
 * Generates intelligent insights based on user plan performance.
 */

/**
 * generateInsights
 * @param {Object} plan      — StudyPlan document (populated)
 * @param {Object} user      — User document
 * @returns {Array<string>}  — Array of insight strings
 */
function generateInsights(plan, user) {
  const insights = [];
  if (!plan) return insights;

  const now        = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const oneWeekAgo   = new Date(startOfToday.getTime() - 7 * 86400000);

  // ── Overall progress ───────────────────────────────────────────────────────
  const overallPct = plan.totalTasks
    ? Math.round((plan.completedTasks / plan.totalTasks) * 100)
    : 0;

  if (overallPct === 100) {
    insights.push('🏆 Incredible! You have completed 100% of your study plan!');
  } else if (overallPct >= 80) {
    insights.push(`🌟 Great work! You're ${overallPct}% through your plan — keep the momentum!`);
  } else if (overallPct >= 50) {
    insights.push(`📈 You're ${overallPct}% through your plan. Consistent effort will get you there!`);
  } else if (overallPct < 30 && plan.completedTasks > 0) {
    insights.push(`⚠️ Only ${overallPct}% complete. Consider adjusting your daily schedule to catch up.`);
  }

  // ── Past-week missed tasks ─────────────────────────────────────────────────
  const pastWeekDays = plan.days.filter(
    (d) => new Date(d.date) >= oneWeekAgo && new Date(d.date) < startOfToday
  );
  const weekMissed = pastWeekDays.reduce(
    (sum, d) => sum + d.tasks.filter((t) => t.status === 'missed').length, 0
  );
  const weekTotal = pastWeekDays.reduce((sum, d) => sum + d.tasks.length, 0);

  if (weekMissed > 0) {
    insights.push(`📉 You missed ${weekMissed} task${weekMissed > 1 ? 's' : ''} this week${weekTotal ? ` (${Math.round((weekMissed / weekTotal) * 100)}% miss rate)` : ''}. Missed tasks have been rescheduled.`);
  }

  // ── Subject-wise weakness ─────────────────────────────────────────────────
  const subjectBreakdown = plan.getSubjectBreakdown
    ? plan.getSubjectBreakdown()
    : [];

  const weakest = subjectBreakdown
    .filter((s) => s.total >= 3)
    .sort((a, b) => a.completionRate - b.completionRate)
    .slice(0, 2);

  weakest.forEach((s) => {
    if (s.completionRate < 50) {
      insights.push(`📚 You appear to be struggling with "${s.name}" (${s.completionRate}% done). Consider allocating extra time.`);
    }
  });

  // ── Behind schedule detection ──────────────────────────────────────────────
  const passedDays = plan.days.filter((d) => new Date(d.date) < startOfToday);
  const expectedCompleted = passedDays.reduce((sum, d) => sum + d.tasks.length, 0);
  if (expectedCompleted > 0 && plan.completedTasks < expectedCompleted * 0.7) {
    insights.push('🕒 You are behind schedule. Try to complete pending tasks from previous days first.');
  }

  // ── Upcoming exams ─────────────────────────────────────────────────────────
  // (Derived from task topic names and subject exam dates if available)
  // If no specific exam data, check if end date is near
  const daysToEnd = Math.ceil((new Date(plan.endDate) - now) / 86400000);
  if (daysToEnd > 0 && daysToEnd <= 7) {
    insights.push(`⏰ Your plan ends in ${daysToEnd} day${daysToEnd > 1 ? 's' : ''}. Final push — you can do this!`);
  }

  // ── Streak encouragement ──────────────────────────────────────────────────
  if (user?.currentStreak >= 7) {
    insights.push(`🔥 Amazing! You're on a ${user.currentStreak}-day study streak. Keep it going!`);
  } else if (user?.currentStreak >= 3) {
    insights.push(`🔥 You're on a ${user.currentStreak}-day streak! Don't break the chain.`);
  }

  // Fallback
  if (!insights.length) {
    insights.push('📖 Start completing tasks to unlock personalised insights about your progress.');
  }

  return insights;
}

module.exports = { generateInsights };
