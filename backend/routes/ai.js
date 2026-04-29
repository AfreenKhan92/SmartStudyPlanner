const express = require('express');
const router  = express.Router();
const { optimizePlan, detectWeakTopics } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/optimize', optimizePlan);
router.get('/weak-topics', detectWeakTopics);

module.exports = router;
