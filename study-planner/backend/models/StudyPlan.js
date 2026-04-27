const mongoose = require('mongoose');

// ─── Individual task within a day ────────────────────────────────────────────
const taskSchema = new mongoose.Schema({
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
  },
  topicName:    { type: String, required: true },
  subjectName:  { type: String, required: true },
  subjectColor: { type: String, default: '#6366f1' },
  duration:     { type: Number, required: true }, // hours
  taskType: {
    type: String,
    enum: ['study', 'revision', 'practice'],
    default: 'study',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'missed'],
    default: 'pending',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  // Kept for backward compatibility
  isCompleted:  { type: Boolean, default: false },
  completedAt:  { type: Date },
  // Rescheduling metadata
  rescheduledFrom: { type: Date },
  originalDayId:   { type: mongoose.Schema.Types.ObjectId },
});

// Keep isCompleted in sync with status
taskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.isCompleted = this.status === 'completed';
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    }
  }
  if (this.isModified('isCompleted')) {
    this.status = this.isCompleted ? 'completed' : 'pending';
    if (this.isCompleted && !this.completedAt) {
      this.completedAt = new Date();
    }
  }
  next();
});

// ─── Single day in the plan ───────────────────────────────────────────────────
const daySchema = new mongoose.Schema({
  date:          { type: Date, required: true, index: true },
  dayNumber:     { type: Number, required: true },
  totalHours:    { type: Number, required: true },
  tasks:         [taskSchema],
  isRevisionDay: { type: Boolean, default: false },
  // Day-level status
  dayStatus: {
    type: String,
    enum: ['pending', 'completed', 'partial', 'missed'],
    default: 'pending',
  },
});

// ─── Virtual: completion % for the day ───────────────────────────────────────
daySchema.virtual('completionPercentage').get(function () {
  if (!this.tasks.length) return 0;
  const done = this.tasks.filter((t) => t.isCompleted).length;
  return Math.round((done / this.tasks.length) * 100);
});

// ─── Study Plan document ──────────────────────────────────────────────────────
const studyPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'My Study Plan',
    },
    version: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed'],
      default: 'active',
    },
    startDate:      { type: Date, required: true },
    endDate:        { type: Date, required: true },
    dailyHours:     { type: Number, required: true },
    days:           [daySchema],
    subjects:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    totalTasks:     { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    missedTasks:    { type: Number, default: 0 },
    // Backward compat
    isActive:       { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual: overall completion % ───────────────────────────────────────────
studyPlanSchema.virtual('overallCompletion').get(function () {
  if (!this.totalTasks) return 0;
  return Math.round((this.completedTasks / this.totalTasks) * 100);
});

// ─── Computed subject-wise breakdown ─────────────────────────────────────────
studyPlanSchema.methods.getSubjectBreakdown = function () {
  const map = {};
  for (const day of this.days) {
    for (const task of day.tasks) {
      const key = task.subjectName;
      if (!map[key]) {
        map[key] = {
          name:    key,
          color:   task.subjectColor,
          total:   0,
          done:    0,
          missed:  0,
        };
      }
      map[key].total++;
      if (task.status === 'completed') map[key].done++;
      if (task.status === 'missed')    map[key].missed++;
    }
  }
  return Object.values(map).map((s) => ({
    ...s,
    completionRate: s.total ? Math.round((s.done / s.total) * 100) : 0,
  }));
};

// ─── Compound index for fast user-plan lookups ────────────────────────────────
studyPlanSchema.index({ user: 1, status: 1, createdAt: -1 });
studyPlanSchema.index({ user: 1, 'days.date': 1 });

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
