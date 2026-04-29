const express = require('express');
const router  = express.Router();

const {
  generatePlan,
  getActivePlan,
  getAllPlans,
  getTodayPlan,
  getDayPlan,
  updateTaskStatus,
  detectAndRescheduleMissed,
  setPlanStatus,
  regeneratePlan,
  getProgress,
  getInsights,
  deletePlan,
} = require('../controllers/studyPlanController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.post('/generate',                            generatePlan);
router.post('/detect-missed',                       detectAndRescheduleMissed);
router.post('/regenerate',                          regeneratePlan);

router.get('/',                                     getActivePlan);
router.get('/all',                                  getAllPlans);
router.get('/today',                                getTodayPlan);
router.get('/day/:date',                            getDayPlan);
router.get('/progress',                             getProgress);
router.get('/insights',                             getInsights);

router.patch('/status',                             setPlanStatus);
router.patch('/task/:planId/:dayId/:taskId',        updateTaskStatus);

router.delete('/',                                  deletePlan);

module.exports = router;
