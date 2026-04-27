const express = require('express');
const { body }  = require('express-validator');
const router    = express.Router();

const {
  signup,
  login,
  getMe,
  updateDailyHours,
  updateProfile,
  getStats,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// ─── Validators ───────────────────────────────────────────────────────────────
const signupValidators = [
  body('fullName').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('dailyStudyHours').optional().isFloat({ min: 0.5, max: 16 }),
  body().custom((value, { req }) => {
    if (!req.body.fullName && !req.body.name) {
      throw new Error('Name is required');
    }
    return true;
  }),
];

const loginValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

const profileValidators = [
  body('fullName').optional().trim().isLength({ min: 2, max: 50 }),
  body('dailyStudyHours').optional().isFloat({ min: 0.5, max: 16 }),
  body('preferredStudyTime').optional().isIn(['morning', 'afternoon', 'night']),
  body('weakSubjects').optional(),
  body('college').optional().trim().isLength({ max: 100 }),
  body('course').optional().trim().isLength({ max: 100 }),
  body('year').optional().trim().isLength({ max: 20 }),
];

// ─── Routes ───────────────────────────────────────────────────────────────────
router.post('/signup',        signupValidators,  signup);
router.post('/login',         loginValidators,   login);
router.get('/me',             protect,           getMe);
router.patch('/update-hours', protect,           updateDailyHours);   // backward compat
router.patch('/profile',      protect, profileValidators, updateProfile);
router.get('/stats',          protect,           getStats);

module.exports = router;
