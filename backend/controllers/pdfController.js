/**
 * pdfController.js
 * Handles generating and returning the PDF study plan.
 */

const StudyPlan = require('../models/StudyPlan');
const { generatePlanPDF } = require('../services/pdfService');

exports.downloadPlanPDF = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne({ user: req.user._id, status: 'active' }).sort({ createdAt: -1 });
    if (!plan) return res.status(404).json({ success: false, message: 'No active study plan found.' });

    const pdfBuffer = await generatePlanPDF(plan, req.user);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="study_plan_v${plan.version}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};
