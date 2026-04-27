const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    dailyStudyHours: {
      type: Number,
      default: 4,
      min: [0.5, 'Minimum 0.5 hours per day'],
      max: [16, 'Maximum 16 hours per day'],
    },
    preferredStudyTime: {
      type: String,
      enum: ['morning', 'afternoon', 'night'],
      default: 'morning',
    },
    weakSubjects: {
      type: [String],
      default: [],
    },
    college:  { type: String, trim: true, maxlength: 100 },
    course:   { type: String, trim: true, maxlength: 100 },
    year:     { type: String, trim: true, maxlength: 20 },

    // Gamification / stats
    currentStreak:      { type: Number, default: 0 },
    longestStreak:      { type: Number, default: 0 },
    lastActiveDate:     { type: Date },
    totalTasksCompleted:{ type: Number, default: 0 },
  },
  { timestamps: true }
);

// ─── Hash password before saving ─────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance method: compare passwords ──────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Virtual: consistency score (0-100) ──────────────────────────────────────
userSchema.virtual('consistencyScore').get(function () {
  if (!this.currentStreak) return 0;
  return Math.min(100, Math.round((this.currentStreak / 30) * 100));
});

// Backward-compatible alias
userSchema.virtual('name')
  .get(function () { return this.fullName; })
  .set(function (value) { this.fullName = value; });


module.exports = mongoose.model('User', userSchema);
