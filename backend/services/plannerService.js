/**
 * plannerService.js
 * Core study plan generation algorithm.
 * All pure logic — no DB calls, easy to test.
 */

const addDays   = (date, n) => new Date(date.getTime() + n * 86400000);
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

/**
 * generatePlanDays
 * Distributes topics across days respecting daily hour budget.
 * Inserts revision slots every 4th day.
 *
 * @param {Array}  subjectsWithTopics  — subjects with embedded topics
 * @param {number} dailyHours          — hours per day budget
 * @param {Date}   planStart           — plan start date (startOfDay)
 * @returns {Array} days
 */
function generatePlanDays(subjectsWithTopics, dailyHours, planStart) {
  // ── Flatten and sort topics by exam proximity + difficulty ─────────────────
  const allItems = [];

  subjectsWithTopics.forEach((subj) => {
    const daysUntilExam = Math.max(
      1,
      Math.ceil((new Date(subj.examDate) - planStart) / 86400000)
    );

    subj.topics.forEach((topic) => {
      allItems.push({
        topic:        topic._id,
        subject:      subj._id,
        topicName:    topic.name,
        subjectName:  subj.name,
        subjectColor: subj.color,
        duration:     topic.estimatedHours || 1,
        difficulty:   topic.difficulty || 'medium',
        priority:     subj.priority || 'medium',
        examDate:     new Date(subj.examDate),
        daysUntilExam,
      });
    });
  });

  // Sort: earlier exams first → higher priority → harder topics
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const diffOrder     = { hard: 0, medium: 1, easy: 2 };

  allItems.sort((a, b) => {
    if (a.daysUntilExam !== b.daysUntilExam) return a.daysUntilExam - b.daysUntilExam;
    if (a.priority !== b.priority) return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    return (diffOrder[a.difficulty] || 1) - (diffOrder[b.difficulty] || 1);
  });

  // ── Determine plan length ──────────────────────────────────────────────────
  const maxExamDate = subjectsWithTopics.reduce((max, s) =>
    new Date(s.examDate) > max ? new Date(s.examDate) : max, planStart);
  const totalDays = Math.min(365, Math.ceil((maxExamDate - planStart) / 86400000));

  // ── Build days ─────────────────────────────────────────────────────────────
  const days   = [];
  let currentDay = 0;
  let itemIndex  = 0;
  const totalItems = allItems.length;

  while (itemIndex < totalItems || currentDay < totalDays) {
    const date = startOfDay(addDays(planStart, currentDay));
    const isRevisionDay = currentDay > 0 && (currentDay + 1) % 4 === 0;
    const tasks = [];
    let hoursUsed = 0;

    if (isRevisionDay) {
      // Revision: recap topics studied in last 3 days
      const recentTopics = days
        .slice(-3)
        .flatMap((d) => d.tasks.filter((t) => t.taskType === 'study'))
        .slice(0, Math.floor(dailyHours));

      recentTopics.forEach((prevTask) => {
        const revDuration = Math.min(0.5, dailyHours - hoursUsed);
        if (revDuration <= 0) return;
        tasks.push({
          topic:        prevTask.topic,
          subject:      prevTask.subject,
          topicName:    `Revise: ${prevTask.topicName.replace(/^Revise: /, '')}`,
          subjectName:  prevTask.subjectName,
          subjectColor: prevTask.subjectColor,
          duration:     revDuration,
          taskType:     'revision',
          status:       'pending',
          priority:     prevTask.priority,
          difficulty:   prevTask.difficulty,
          isCompleted:  false,
        });
        hoursUsed += revDuration;
      });
    } else {
      // Fill day with study tasks up to dailyHours
      while (itemIndex < totalItems && hoursUsed < dailyHours) {
        const item = allItems[itemIndex];
        const remaining = dailyHours - hoursUsed;

        if (item.duration <= remaining) {
          tasks.push({
            topic:        item.topic,
            subject:      item.subject,
            topicName:    item.topicName,
            subjectName:  item.subjectName,
            subjectColor: item.subjectColor,
            duration:     item.duration,
            taskType:     'study',
            status:       'pending',
            priority:     item.priority,
            difficulty:   item.difficulty,
            isCompleted:  false,
          });
          hoursUsed += item.duration;
          itemIndex++;
        } else if (remaining >= 0.5) {
          // Partial carry-over
          tasks.push({
            topic:        item.topic,
            subject:      item.subject,
            topicName:    `${item.topicName} (Part 1)`,
            subjectName:  item.subjectName,
            subjectColor: item.subjectColor,
            duration:     remaining,
            taskType:     'study',
            status:       'pending',
            priority:     item.priority,
            difficulty:   item.difficulty,
            isCompleted:  false,
          });
          allItems[itemIndex] = {
            ...item,
            duration:  item.duration - remaining,
            topicName: `${item.topicName.replace(' (Part 1)', '')} (Part 2)`,
          };
          hoursUsed += remaining;
        } else {
          break;
        }
      }
    }

    if (tasks.length > 0 || currentDay < totalDays) {
      days.push({
        date,
        dayNumber:     currentDay + 1,
        totalHours:    parseFloat(hoursUsed.toFixed(2)),
        tasks,
        isRevisionDay,
        dayStatus:     'pending',
      });
    }

    currentDay++;
    if (currentDay > 365) break;
  }

  return days;
}

/**
 * rescheduleMissedTasks
 * Given an array of missed task objects, distribute them into upcoming days
 * without overloading any single day beyond dailyHours.
 *
 * @param {Array}  missedTasks   — array of task-like objects with duration
 * @param {Array}  upcomingDays  — future day objects (mutable)
 * @param {number} dailyHours    — per-day hour budget
 * @returns {Array} updated upcomingDays
 */
function rescheduleMissedTasks(missedTasks, upcomingDays, dailyHours) {
  const queue = [...missedTasks];

  for (const day of upcomingDays) {
    if (!queue.length) break;
    const currentLoad = day.tasks.reduce((sum, t) => sum + (t.duration || 0), 0);
    let available = dailyHours - currentLoad;

    while (queue.length > 0 && available >= 0.5) {
      const task = queue[0];
      const fit  = Math.min(task.duration, available);
      const rescheduled = {
        ...task,
        duration:        parseFloat(fit.toFixed(2)),
        status:          'pending',
        isCompleted:     false,
        completedAt:     undefined,
        rescheduledFrom: task.rescheduledFrom || new Date(),
      };
      day.tasks.push(rescheduled);
      day.totalHours = parseFloat((day.totalHours + fit).toFixed(2));

      if (fit < task.duration) {
        queue[0] = { ...task, duration: parseFloat((task.duration - fit).toFixed(2)) };
      } else {
        queue.shift();
      }
      available -= fit;
    }
  }

  return upcomingDays;
}

module.exports = { generatePlanDays, rescheduleMissedTasks, startOfDay, addDays };
