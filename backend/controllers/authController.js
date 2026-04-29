const jwt  = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// ─── Helper: generate signed JWT ─────────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ─── Helper: build public user object ────────────────────────────────────────
const buildUserResponse = (user) => ({
  id:                  user._id,
  name:                user.fullName,
  fullName:            user.fullName,
  email:               user.email,
  dailyStudyHours:     user.dailyStudyHours,
  preferredStudyTime:  user.preferredStudyTime,
  weakSubjects:        user.weakSubjects,
  college:             user.college,
  course:              user.course,
  year:                user.year,
  currentStreak:       user.currentStreak,
  longestStreak:       user.longestStreak,
  totalTasksCompleted: user.totalTasksCompleted,
  consistencyScore:    user.consistencyScore,
});

// ─── Helper: send token response ─────────────────────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: buildUserResponse(user),
  });
};

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { fullName, name, email, password, dailyStudyHours } = req.body;
    const normalizedName = (fullName || name || '').trim();

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const user = await User.create({
      fullName: normalizedName,
      email,
      password,
      dailyStudyHours,
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user: buildUserResponse(user) });
};

// ─── PATCH /api/auth/update-hours (backward compat) ──────────────────────────
exports.updateDailyHours = async (req, res, next) => {
  try {
    const { dailyStudyHours } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { dailyStudyHours },
      { new: true, runValidators: true }
    );
    res.json({ success: true, user: buildUserResponse(user) });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/auth/profile ──────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const allowed = [
      'fullName', 'dailyStudyHours', 'preferredStudyTime',
      'weakSubjects', 'college', 'course', 'year',
    ];

    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Normalise weakSubjects — accept string or array
    if (typeof updates.weakSubjects === 'string') {
      updates.weakSubjects = updates.weakSubjects
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({ success: true, user: buildUserResponse(user) });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/auth/stats ──────────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const StudyPlan = require('../models/StudyPlan');
    const user      = await User.findById(req.user._id);
    const plan      = await StudyPlan.findOne({ user: req.user._id, status: 'active' }).sort({ createdAt: -1 });

    const stats = {
      totalTasksCompleted: user.totalTasksCompleted || 0,
      currentStreak:       user.currentStreak || 0,
      longestStreak:       user.longestStreak || 0,
      consistencyScore:    user.consistencyScore || 0,
      planProgress:        plan
        ? Math.round((plan.completedTasks / (plan.totalTasks || 1)) * 100)
        : 0,
      totalTasks:          plan?.totalTasks || 0,
      completedTasks:      plan?.completedTasks || 0,
      missedTasks:         plan?.missedTasks || 0,
    };

    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};
