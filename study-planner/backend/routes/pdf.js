const express = require('express');
const router  = express.Router();
const { downloadPlanPDF } = require('../controllers/pdfController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/download', downloadPlanPDF);

module.exports = router;
