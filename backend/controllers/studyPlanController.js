const Subject   = require('../models/Subject');
const Topic     = require('../models/Topic');
const StudyPlan = require('../models/StudyPlan');
const User      = require('../models/User');
const Notification = require('../models/Notification');
const { generatePlanDays, rescheduleMissedTasks, startOfDay, addDays } = require('../services/plannerService');
const { generateInsights } = require('../services/insightsService');
const { triggerMissedTaskAlerts, triggerLowProgressAlert, triggerUpcomingExamAlert } = require('../services/notificationService');

// ─── POST /api/studyplan/generate ─────────────────────────────────────────────
exports.generatePlan = async (req, res, next) => {
  try {
    const { subjectIds, dailyHours } = req.body;

    if (!subjectIds?.length) {
      return res.status(400).json({ success: false, message: 'Select at least one subject.' });
    }

    const subjects = await Subject.find({ _id: { $in: subjectIds }, user: req.user._id });
    if (!subjects.length) {
      return res.status(404).json({ success: false, message: 'No subjects found.' });
    }

    const subjectsWithTopics = await Promise.all(
      subjects.map(async (subj) => {
        const topics = await Topic.find({ subject: subj._id });
        return { ...subj.toObject(), topics };
      })
    );

    const empty = subjectsWithTopics.filter((s) => !s.topics.length);
    if (empty.length) {
      return res.status(400).json({
        success: false,
        message: `These subjects have no topics: ${empty.map((s) => s.name).join(', ')}`,
      });
    }

    const hoursPerDay = dailyHours || req.user.dailyStudyHours || 4;
    const planStart   = startOfDay(new Date());
    const days        = generatePlanDays(subjectsWithTopics, hoursPerDay, planStart);

    if (!days.length) {
      return res.status(400).json({ success: false, message: 'Could not generate a plan. Check your exam dates.' });
    }

    const totalTasks = days.reduce((sum, d) => sum + d.tasks.length, 0);
    const endDate    = days[days.length - 1].date;

    // Determine next version
    const lastPlan = await StudyPlan.findOne({ user: req.user._id }).sort({ version: -1 });
    const version  = lastPlan ? lastPlan.version + 1 : 1;

    // Set previous plans to completed (not deleted — versioning)
    await StudyPlan.updateMany(
      { user: req.user._id, status: 'active' },
      { status: 'completed', isActive: false }
    );

    const plan = await StudyPlan.create({
      user:       req.user._id,
      title:      `Study Plan v${version} — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      version,
      status:     'active',
      isActive:   true,
      startDate:  planStart,
      endDate,
      dailyHours: hoursPerDay,
      days,
      subjects:   subjects.map((s) => s._id),
      totalTasks,
      completedTasks: 0,
      missedTasks:    0,
    });

    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/studyplan — active plan ─────────────────────────────────────────
exports.getActivePlan = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne({ user: req.user._id, status: 'active' })
      .sort({ createdAt: -1 });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'No active study plan found.' });
    }

    res.json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/studyplan/all — all plan versions ───────────────────────────────
exports.getAllPlans = async (req, res, next) => {
  try {
    const plans = await StudyPlan.find({ user: req.user._id })
      .sort({ version: -1 })
      .select('title version status startDate endDate totalTasks completedTasks createdAt');

    res.json({ success: true, count: plans.length, data: plans });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/studyplan/today — today's tasks ─────────────────────────────────
exports.getTodayPlan = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne({ user: req.user._id, status: 'active' });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'No active plan.' });
    }

    const today = startOfDay(new Date());
    const todayEntry = plan.days.find(
      (d) => startOfDay(new Date(d.date)).getTime() === today.getTime()
    );

    res.json({ success: true, data: todayEntry || null, planId: plan._id });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/studyplan/day/:date — specific date ─────────────────────────────
exports.getDayPlan = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne({ user: req.user._id, status: 'active' });
    if (!plan) return res.status(404).json({ success: false, message: 'No active plan.' });

    const target = startOfDay(new Date(req.params.date));
    if (isNaN(target.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date.' });
    }

    const day = plan.days.find(
      (d) => startOfDay(new Date(d.date)).getTime() === target.getTime()
    );

    res.json({ success: true, data: day || null, planId: plan._id });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/studyplan/task/:planId/:dayId/:taskId — toggle completion ─────
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { planId, dayId, taskId } = req.params;
    const { isCompleted, status }   = req.body;

    const plan = await StudyPlan.findOne({ _id: planId, user: req.user._id });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found.' });

    const day  = plan.days.id(dayId);
    if (!day)  return res.status(404).json({ success: false, message: 'Day not found.' });

    const task = day.tasks.id(taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    const wasCompleted = task.isCompleted;

    // Accept either isCompleted (legacy) or status (new)
    if (status !== undefined) {
      task.status      = status;
      task.isCompleted = status === 'completed';
    } else {
      task.isCompleted = isCompleted;
      task.status      = isCompleted ? 'completed' : 'pending';
    }

    task.completedAt = task.isCompleted ? new Date() : undefined;

    // Update overall counts
    if (task.isCompleted && !wasCompleted) {
      plan.completedTasks += 1;
      // Update user stats
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { totalTasksCompleted: 1 },
      });
    }
    if (!task.isCompleted && wasCompleted) {
      plan.completedTasks = Math.max(0, plan.completedTasks - 1);
    }

    plan.completedTasks = Math.max(0, Math.min(plan.totalTasks, plan.completedTasks));

    // Update day status
    const allDone   = day.tasks.every((t)  => t.status === 'completed');
    const noneMissed = day.tasks.every((t) => t.status !== 'missed');
    if (allDone)          day.dayStatus = 'completed';
    else if (!noneMissed) day.dayStatus = 'partial';
    else                  day.dayStatus = 'pending';

    await plan.save();

    // Streak update
    await _updateStreak(req.user._id);

    res.json({
      success:           true,
      completedTasks:    plan.completedTasks,
      totalTasks:        plan.totalTasks,
      overallCompletion: Math.round((plan.completedTasks / plan.totalTasks) * 100),
      data:              task,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/studyplan/detect-missed — mark past incomplete tasks as missed ──
exports.detectAndRescheduleMissed = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne({ user: req.user._id, status: 'active' });
    if (!plan) return res.status(404).json({ success: false, message: 'No active plan.' });

    const today = startOfDay(new Date());
    let missedCount = 0;
    const missedTasks = [];

    // Identify past days with pending tasks
    for (const day of plan.days) {
      if (startOfDay(new Date(day.date)) >= today) continue;

      for (const task of day.tasks) {
        if (task.status === 'pending') {
          task.status      = 'missed';
          task.isCompleted = false;
          missedCount++;
          missedTasks.push({ ...task.toObject(), originalDayId: day._id });
        }
      }

      // Update day status
      const tasks = day.tasks;
      if (tasks.every((t) => t.status === 'completed')) {
        day.dayStatus = 'completed';
      } else if (tasks.some((t) => t.status === 'missed')) {
        day.dayStatus = tasks.some((t) => t.status === 'completed') ? 'partial' : 'missed';
      }
    }

    // Reschedule missed tasks into future days
    if (missedTasks.length > 0) {
      const upcomingDays = plan.days.filter(
        (d) => startOfDay(new Date(d.date)) >= today
      );

      const updatedUpcoming = rescheduleMissedTasks(
        missedTasks.map((t) => ({
          ...t,
          status:          'pending',
          isCompleted:     false,
          rescheduledFrom: new Date(t.originalDate || new Date()),
        })),
        upcomingDays,
        plan.dailyHours
      );

      // Merge updated upcoming back into plan.days
      const upcomingIds = new Set(updatedUpcoming.map((d) => d._id?.toString()));
      for (let i = 0; i < plan.days.length; i++) {
        const pd = plan.days[i];
        if (startOfDay(new Date(pd.date)) >= today) {
          const updated = updatedUpcoming.find(
            (d) => d._id?.toString() === pd._id?.toString()
          );
          if (updated) {
            plan.days[i].tasks      = updated.tasks;
            plan.days[i].totalHours = updated.totalHours;
          }
        }
      }

      // Update total tasks count
      plan.totalTasks = plan.days.reduce((sum, d) => sum + d.tasks.length, 0);
      plan.missedTasks = (plan.missedTasks || 0) + missedCount;
    }

    await plan.save();

    // Trigger notifications
    if (missedCount > 0) {
      await triggerMissedTaskAlerts(req.user._id, missedCount, plan._id);
    }

    const overallPct = plan.totalTasks
      ? Math.round((plan.completedTasks / plan.totalTasks) * 100)
      : 0;
    if (overallPct < 30 && plan.completedTasks > 0) {
      await triggerLowProgressAlert(req.user._id, overallPct, plan._id);
    }

    res.json({
      success: true,
      missedCount,
      message: missedCount > 0
        ? `${missedCount} missed task(s) detected and rescheduled.`
        : 'No missed tasks found.',
      data: plan,
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/studyplan/status — pause / resume ─────────────────────────────
exports.setPlanStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'paused'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be active or paused.' });
    }

    const plan = await StudyPlan.findOneAndUpdate(
      { user: req.user._id, status: { $in: ['active', 'paused'] } },
      { status, isActive: status === 'active' },
      { new: true, sort: { createdAt: -1 } }
    );

    if (!plan) return res.status(404).json({ success: false, message: 'No plan found.' });

    res.json({ success: true, data: plan, message: `Plan ${status}.` });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/studyplan/regenerate — regenerate remaining tasks ───────────────
exports.regeneratePlan = async (req, res, next) => {
  try {
    const { mode = 'full', subjectIds, dailyHours } = req.body;
    // mode: 'full' | 'partial'

    const existingPlan = await StudyPlan.findOne({
      user: req.user._id,
      status: { $in: ['active', 'paused'] },
    }).sort({ createdAt: -1 });

    const subjIds = subjectIds || existingPlan?.subjects || [];
    if (!subjIds.length) {
      return res.status(400).json({ success: false, message: 'No subjects to plan for.' });
    }

    const subjects = await Subject.find({ _id: { $in: subjIds }, user: req.user._id });
    const subjectsWithTopics = await Promise.all(
      subjects.map(async (subj) => {
        const topics = await Topic.find({ subject: subj._id });
        return { ...subj.toObject(), topics };
      })
    );

    const empty = subjectsWithTopics.filter((s) => !s.topics.length);
    if (empty.length) {
      return res.status(400).json({
        success: false,
        message: `No topics for: ${empty.map((s) => s.name).join(', ')}`,
      });
    }

    const hoursPerDay = dailyHours || req.user.dailyStudyHours || 4;
    const today       = startOfDay(new Date());

    let days = generatePlanDays(subjectsWithTopics, hoursPerDay, today);

    // For partial mode: keep completed days from old plan, replace pending
    if (mode === 'partial' && existingPlan) {
      const completedDays = existingPlan.days.filter(
        (d) => startOfDay(new Date(d.date)) < today
      );
      days = [...completedDays, ...days];
    }

    const totalTasks = days.reduce((sum, d) => sum + d.tasks.length, 0);
    const endDate    = days[days.length - 1]?.date || today;
    const lastPlan   = await StudyPlan.findOne({ user: req.user._id }).sort({ version: -1 });
    const version    = lastPlan ? lastPlan.version + 1 : 1;

    // Archive old plan
    if (existingPlan) {
      await StudyPlan.findByIdAndUpdate(existingPlan._id, { status: 'completed', isActive: false });
    }

    const plan = await StudyPlan.create({
      user:       req.user._id,
      title:      `Study Plan v${version} — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      version,
      status:     'active',
      isActive:   true,
      startDate:  today,
      endDate,
      dailyHours: hoursPerDay,
      days,
      subjects:   subjects.map((s) => s._id),
      totalTasks,
      completedTasks: mode === 'partial' ? (existingPlan?.completedTasks || 0) : 0,
      missedTasks:    0,
    });

    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/studyplan/progress — advanced progress tracking ──────────────────
exports.getProgress = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne({ user: req.user._id, status: 'active' }).sort({ createdAt: -1 });
    if (!plan) return res.status(404).json({ success: false, message: 'No active plan.' });

    const today = startOfDay(new Date());

    // Global
    const global = {
      totalTasks:          plan.totalTasks,
      completedTasks:      plan.completedTasks,
      missedTasks:         plan.missedTasks || 0,
      progressPercentage:  plan.totalTasks ? Math.round((plan.completedTasks / plan.totalTasks) * 100) : 0,
    };

    // Daily — last 7 days
    const daily = plan.days
      .filter((d) => startOfDay(new Date(d.date)) <= today)
      .slice(-14)
      .map((d) => {
        const done   = d.tasks.filter((t) => t.status === 'completed').length;
        const missed = d.tasks.filter((t) => t.status === 'missed').length;
        const total  = d.tasks.length;
        let dayStatus = d.dayStatus;
        if (!dayStatus) {
          if (done === total && total > 0)  dayStatus = 'completed';
          else if (done > 0)                dayStatus = 'partial';
          else if (missed > 0)              dayStatus = 'missed';
          else                              dayStatus = 'pending';
        }
        return {
          date:      d.date,
          dayNumber: d.dayNumber,
          done,
          missed,
          total,
          dayStatus,
          completionRate: total ? Math.round((done / total) * 100) : 0,
        };
      });

    // Subject-wise
    const subjectWise = plan.getSubjectBreakdown();

    res.json({
      success: true,
      data: { global, daily, subjectWise, planStatus: plan.status, version: plan.version },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/studyplan/insights ──────────────────────────────────────────────
exports.getInsights = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne({ user: req.user._id, status: 'active' }).sort({ createdAt: -1 });
    const user = await require('../models/User').findById(req.user._id);
    const insights = generateInsights(plan, user);
    res.json({ success: true, data: insights });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/studyplan — delete active plan ───────────────────────────────
exports.deletePlan = async (req, res, next) => {
  try {
    await StudyPlan.findOneAndDelete({ user: req.user._id, status: 'active' });
    res.json({ success: true, message: 'Study plan deleted.' });
  } catch (err) {
    next(err);
  }
};

// ─── Internal: update user streak ────────────────────────────────────────────
async function _updateStreak(userId) {
  try {
    const user  = await User.findById(userId);
    const today = startOfDay(new Date());
    const last  = user.lastActiveDate ? startOfDay(new Date(user.lastActiveDate)) : null;

    let newStreak = user.currentStreak || 0;

    if (!last || last.getTime() === today.getTime()) {
      // Already counted today or first time
    } else if (last.getTime() === today.getTime() - 86400000) {
      // Yesterday — extend streak
      newStreak++;
    } else {
      // Streak broken
      newStreak = 1;
    }

    const longest = Math.max(user.longestStreak || 0, newStreak);

    await User.findByIdAndUpdate(userId, {
      currentStreak:  newStreak,
      longestStreak:  longest,
      lastActiveDate: today,
    });
  } catch (e) {
    // Non-critical
    console.error('Streak update error:', e.message);
  }
}
