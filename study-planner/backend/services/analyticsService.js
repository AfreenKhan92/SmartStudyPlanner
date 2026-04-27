/**
 * analyticsService.js
 * Computes rich analytics from a StudyPlan for charts and reports.
 */

const { startOfDay } = require('./plannerService');

/**
 * getWeeklyPerformance
 * Returns per-week completion stats for the last N weeks.
 *
 * @param {Object} plan
 * @param {number} numWeeks
 * @returns {Array<{week, done, total, rate}>}
 */
function getWeeklyPerformance(plan, numWeeks = 8) {
  const today     = startOfDay(new Date());
  const weeks     = [];

  for (let w = numWeeks - 1; w >= 0; w--) {
    const weekEnd   = new Date(today.getTime() - w * 7 * 86400000);
    const weekStart = new Date(weekEnd.getTime() - 7 * 86400000);

    const daysInWeek = plan.days.filter((d) => {
      const date = new Date(d.date);
      return date >= weekStart && date < weekEnd;
    });

    const done  = daysInWeek.reduce((sum, d) =>
      sum + d.tasks.filter((t) => t.status === 'completed' || t.isCompleted).length, 0);
    const total = daysInWeek.reduce((sum, d) => sum + d.tasks.length, 0);
    const missed = daysInWeek.reduce((sum, d) =>
      sum + d.tasks.filter((t) => t.status === 'missed').length, 0);

    weeks.push({
      week:   weekEnd.toISOString().slice(0, 10),
      label:  `W${numWeeks - w}`,
      done,
      missed,
      total,
      rate:   total ? Math.round((done / total) * 100) : 0,
    });
  }

  return weeks;
}

/**
 * getDailyBreakdown
 * Returns daily completion data for the past N days.
 *
 * @param {Object} plan
 * @param {number} days
 * @returns {Array}
 */
function getDailyBreakdown(plan, days = 30) {
  const today     = startOfDay(new Date());
  const cutoff    = new Date(today.getTime() - days * 86400000);

  return plan.days
    .filter((d) => new Date(d.date) >= cutoff && new Date(d.date) <= today)
    .map((d) => {
      const done   = d.tasks.filter((t) => t.status === 'completed' || t.isCompleted).length;
      const missed = d.tasks.filter((t) => t.status === 'missed').length;
      const total  = d.tasks.length;
      return {
        date:      new Date(d.date).toISOString().slice(0, 10),
        dayNumber: d.dayNumber,
        done,
        missed,
        total,
        rate:      total ? Math.round((done / total) * 100) : 0,
        dayStatus: d.dayStatus || (
          done === total && total > 0 ? 'completed' :
          done > 0 || missed > 0     ? 'partial'   :
          new Date(d.date) < today   ? 'missed'    : 'pending'
        ),
      };
    });
}

/**
 * getSubjectAnalytics
 * Per-subject completion data suitable for pie/bar charts.
 *
 * @param {Object} plan
 * @returns {Array}
 */
function getSubjectAnalytics(plan) {
  const subjects = {};

  for (const day of plan.days) {
    for (const task of day.tasks) {
      const k = task.subjectName;
      if (!subjects[k]) {
        subjects[k] = {
          name:   k,
          color:  task.subjectColor || '#6366f1',
          total:  0,
          done:   0,
          missed: 0,
          hours:  0,
        };
      }
      subjects[k].total++;
      subjects[k].hours += task.duration || 0;
      if (task.status === 'completed' || task.isCompleted) subjects[k].done++;
      if (task.status === 'missed')    subjects[k].missed++;
    }
  }

  return Object.values(subjects).map((s) => ({
    ...s,
    hours:          parseFloat(s.hours.toFixed(1)),
    completionRate: s.total ? Math.round((s.done / s.total) * 100) : 0,
    pending:        s.total - s.done - s.missed,
  }));
}

/**
 * getHourlyDistribution
 * Total hours planned per subject for a donut/pie chart.
 */
function getHourlyDistribution(plan) {
  const subjects = {};

  for (const day of plan.days) {
    for (const task of day.tasks) {
      const k = task.subjectName;
      if (!subjects[k]) {
        subjects[k] = { name: k, color: task.subjectColor || '#6366f1', value: 0 };
      }
      subjects[k].value += task.duration || 0;
    }
  }

  return Object.values(subjects).map((s) => ({
    ...s,
    value: parseFloat(s.value.toFixed(1)),
  }));
}

/**
 * getFullAnalytics
 * Combines all analytics into a single response.
 */
function getFullAnalytics(plan) {
  return {
    weekly:        getWeeklyPerformance(plan),
    daily:         getDailyBreakdown(plan, 30),
    subjects:      getSubjectAnalytics(plan),
    hourlyDist:    getHourlyDistribution(plan),
    global: {
      totalTasks:          plan.totalTasks,
      completedTasks:      plan.completedTasks,
      missedTasks:         plan.missedTasks || 0,
      progressPercentage:  plan.totalTasks
        ? Math.round((plan.completedTasks / plan.totalTasks) * 100)
        : 0,
      totalDays:           plan.days.length,
      completedDays:       plan.days.filter((d) => d.dayStatus === 'completed').length,
    },
  };
}

module.exports = {
  getWeeklyPerformance,
  getDailyBreakdown,
  getSubjectAnalytics,
  getHourlyDistribution,
  getFullAnalytics,
};
