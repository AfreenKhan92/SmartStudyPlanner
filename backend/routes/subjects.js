const express = require('express');
const { body }  = require('express-validator');
const router    = express.Router();

const {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  createTopic,
  updateTopic,
  deleteTopic,
} = require('../controllers/subjectController');
const { protect } = require('../middleware/auth');

// All subject routes require auth
router.use(protect);

// Subject validators
const subjectValidators = [
  body('name').trim().notEmpty().withMessage('Subject name is required'),
  body('examDate').isISO8601().withMessage('Valid exam date required'),
  body('priority').optional().isIn(['low', 'medium', 'high']),
];

// Topic validators
const topicValidators = [
  body('name').trim().notEmpty().withMessage('Topic name is required'),
  body('estimatedHours').optional().isFloat({ min: 0.25, max: 20 }),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
];

// ─── Subject routes ───────────────────────────────────────────────────────────
router.get('/',    getSubjects);
router.post('/',   subjectValidators, createSubject);
router.put('/:id', subjectValidators, updateSubject);
router.delete('/:id',                 deleteSubject);

// ─── Topic routes (nested under subject) ─────────────────────────────────────
router.post('/:subjectId/topics',                topicValidators, createTopic);
router.put('/:subjectId/topics/:topicId',         topicValidators, updateTopic);
router.delete('/:subjectId/topics/:topicId',                       deleteTopic);

module.exports = router;
