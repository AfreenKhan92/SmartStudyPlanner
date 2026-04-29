/**
 * plannerService.js
 * Exam-oriented, timeline-based study plan generation.
 *
 * Algorithm:
 *  1. Build a day-by-day timeline from today → last exam date.
 *  2. Block "Exam Days" and "Revision Days" (1 day before each exam).
 *  3. Distribute each subject's topics evenly across the study days
 *     that fall BEFORE that subject's revision day.
 *  4. Respect dailyHours budget; carry overflow forward.
 */

const addDays    = (date, n) => new Date(date.getTime() + n * 86400000);
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildStudyTask(topic, subj) {
  return {
    topic:        topic._id,
    subject:      subj._id,
    topicName:    topic.name,
    subjectName:  subj.name,
    subjectColor: subj.color,
    duration:     parseFloat((topic.estimatedHours || 1).toFixed(2)),
    taskType:     'study',
    status:       'pending',
    priority:     subj.priority  || 'medium',
    difficulty:   topic.difficulty || 'medium',
    isCompleted:  false,
  };
}

function buildRevisionTasks(subj, dailyHours) {
  if (!subj?.topics?.length) return [];
  const perTopic = parseFloat((dailyHours / subj.topics.length).toFixed(2));
  return subj.topics.map((t) => ({
    topic:        t._id,
    subject:      subj._id,
    topicName:    `Revise: ${t.name}`,
    subjectName:  subj.name,
    subjectColor: subj.color,
    duration:     Math.min(perTopic, t.estimatedHours || 0.5),
    taskType:     'revision',
    status:       'pending',
    priority:     subj.priority  || 'medium',
    difficulty:   t.difficulty   || 'medium',
    isCompleted:  false,
  }));
}

// ─── Main generator ───────────────────────────────────────────────────────────

/**
 * generatePlanDays
 *
 * @param {Array}  subjectsWithTopics  — subjects with embedded topics
 * @param {number} dailyHours          — hours per day budget
 * @param {Date}   planStart           — plan start date (startOfDay)
 * @returns {Array} days
 */
function generatePlanDays(subjectsWithTopics, dailyHours, planStart) {
  if (!subjectsWithTopics?.length) return [];

  const diffOrder = { hard: 0, medium: 1, easy: 2 };

  // ── 1. Sort subjects by exam date (earliest first) ─────────────────────────
  const subjects = [...subjectsWithTopics].sort(
    (a, b) => new Date(a.examDate) - new Date(b.examDate)
  );

  const lastExamDate = startOfDay(new Date(subjects[subjects.length - 1].examDate));
  const totalDays    = Math.max(1, Math.ceil((lastExamDate - planStart) / 86400000) + 1);

  // ── 2. Build day-slot array ────────────────────────────────────────────────
  const slots = Array.from({ length: totalDays }, (_, i) => ({
    date:        startOfDay(addDays(planStart, i)),
    dayNumber:   i + 1,
    type:        'study',   // 'study' | 'revision' | 'exam'
    revisionFor: null,
    examFor:     null,
  }));

  // ── 3. Mark Exam Days ─────────────────────────────────────────────────────
  for (const subj of subjects) {
    const examMs = startOfDay(new Date(subj.examDate)).getTime();
    const examSlot = slots.find((s) => s.date.getTime() === examMs);
    if (examSlot) { examSlot.type = 'exam'; examSlot.examFor = subj; }
  }

  // ── 4. Mark Revision Days (1 day before exam; fallback to nearest free study day) ──
  for (const subj of subjects) {
    const examMs = startOfDay(new Date(subj.examDate)).getTime();
    const revMs  = startOfDay(addDays(new Date(subj.examDate), -1)).getTime();

    // Try the natural revision slot first
    const natural = slots.find((s) => s.date.getTime() === revMs);
    if (natural && natural.type === 'study') {
      natural.type = 'revision';
      natural.revisionFor = subj;
      continue;
    }

    // Collision: natural slot is taken — find the closest free study slot before exam
    const fallback = [...slots]
      .filter((s) => s.type === 'study' && s.date.getTime() < examMs)
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0]; // closest before exam

    if (fallback) {
      fallback.type = 'revision';
      fallback.revisionFor = subj;
    }
  }


  // ── 4. Assign topics to study days (per-subject even distribution) ─────────
  // dayBucket maps date.getTime() → [taskObjects]
  const dayBucket = new Map();
  slots.forEach((s) => { if (s.type === 'study') dayBucket.set(s.date.getTime(), []); });

  for (const subj of subjects) {
    const revMs = startOfDay(addDays(new Date(subj.examDate), -1)).getTime();

    // Study slots available for this subject (strictly before revision day)
    const availKeys = slots
      .filter((s) => s.type === 'study' && s.date.getTime() < revMs)
      .map((s) => s.date.getTime());

    // Sort topics: hardest first
    const topics = [...(subj.topics || [])].sort(
      (a, b) => (diffOrder[a.difficulty] || 1) - (diffOrder[b.difficulty] || 1)
    );

    if (!topics.length) continue;

    if (availKeys.length === 0) {
      // Edge case: no study days before exam — dump on the first available study day
      const fallback = slots.find((s) => s.type === 'study');
      if (fallback) topics.forEach((t) => dayBucket.get(fallback.date.getTime()).push(buildStudyTask(t, subj)));
      continue;
    }

    // Evenly space topics across available study days
    topics.forEach((topic, idx) => {
      const slotIdx = Math.min(
        Math.floor((idx / topics.length) * availKeys.length),
        availKeys.length - 1
      );
      dayBucket.get(availKeys[slotIdx]).push(buildStudyTask(topic, subj));
    });
  }

  // ── 5. Build final Day output ──────────────────────────────────────────────
  const days    = [];
  let overflow  = []; // tasks that didn't fit → carry to next study day

  for (const slot of slots) {

    // — Exam Day —
    if (slot.type === 'exam') {
      days.push({
        date:            slot.date,
        dayNumber:       slot.dayNumber,
        totalHours:      0,
        tasks:           [],
        isRevisionDay:   false,
        isExamDay:       true,
        examSubjectName: slot.examFor?.name || '',
        dayStatus:       'pending',
      });
      continue;
    }

    // — Revision Day —
    if (slot.type === 'revision') {
      const revTasks   = buildRevisionTasks(slot.revisionFor, dailyHours);
      const totalHours = parseFloat(
        Math.min(revTasks.reduce((s, t) => s + t.duration, 0), dailyHours).toFixed(2)
      );
      days.push({
        date:            slot.date,
        dayNumber:       slot.dayNumber,
        totalHours,
        tasks:           revTasks,
        isRevisionDay:   true,
        isExamDay:       false,
        examSubjectName: '',
        dayStatus:       'pending',
      });
      continue;
    }

    // — Study Day —
    const scheduled = [...overflow, ...(dayBucket.get(slot.date.getTime()) || [])];
    overflow = [];

    let hoursUsed = 0;
    const tasks   = [];

    for (const item of scheduled) {
      if (hoursUsed >= dailyHours) { overflow.push(item); continue; }
      const remaining = parseFloat((dailyHours - hoursUsed).toFixed(2));

      if (item.duration <= remaining) {
        tasks.push({ ...item });
        hoursUsed += item.duration;
      } else if (remaining >= 0.5) {
        tasks.push({ ...item, topicName: `${item.topicName} (Part 1)`, duration: remaining });
        overflow.push({ ...item, topicName: `${item.topicName} (Part 2)`, duration: parseFloat((item.duration - remaining).toFixed(2)) });
        hoursUsed += remaining;
      } else {
        overflow.push(item);
      }
    }

    days.push({
      date:            slot.date,
      dayNumber:       slot.dayNumber,
      totalHours:      parseFloat(hoursUsed.toFixed(2)),
      tasks,
      isRevisionDay:   false,
      isExamDay:       false,
      examSubjectName: '',
      dayStatus:       'pending',
    });
  }

  return days;
}

// ─── Reschedule missed tasks ─────────────────────────────────────────────────

/**
 * rescheduleMissedTasks
 * Distributes missed tasks into upcoming days without exceeding dailyHours.
 */
function rescheduleMissedTasks(missedTasks, upcomingDays, dailyHours) {
  const queue = [...missedTasks];

  for (const day of upcomingDays) {
    if (!queue.length) break;
    const currentLoad = day.tasks.reduce((sum, t) => sum + (t.duration || 0), 0);
    let available     = dailyHours - currentLoad;

    while (queue.length > 0 && available >= 0.5) {
      const task = queue[0];
      const fit  = Math.min(task.duration, available);
      day.tasks.push({
        ...task,
        duration:        parseFloat(fit.toFixed(2)),
        status:          'pending',
        isCompleted:     false,
        completedAt:     undefined,
        rescheduledFrom: task.rescheduledFrom || new Date(),
      });
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
