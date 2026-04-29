const { validationResult } = require('express-validator');
const Subject = require('../models/Subject');
const Topic   = require('../models/Topic');

// ═══════════════════════════════════════════════════════════════════════════════
//  SUBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/subjects  — list all subjects with their topics
exports.getSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({ user: req.user._id }).sort({ examDate: 1 });

    // Attach topics to each subject
    const data = await Promise.all(
      subjects.map(async (subj) => {
        const topics = await Topic.find({ subject: subj._id }).sort({ createdAt: 1 });
        return { ...subj.toObject(), topics };
      })
    );

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// POST /api/subjects  — create a subject
exports.createSubject = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const subject = await Subject.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, data: subject });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You already have a subject with this name.',
      });
    }
    next(err);
  }
};

// PUT /api/subjects/:id  — update a subject
exports.updateSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }
    res.json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/subjects/:id  — delete a subject + its topics
exports.deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    // Cascade-delete topics
    await Topic.deleteMany({ subject: req.params.id });

    res.json({ success: true, message: 'Subject and its topics deleted.' });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  TOPICS
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/subjects/:subjectId/topics
exports.createTopic = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Verify subject belongs to this user
    const subject = await Subject.findOne({
      _id: req.params.subjectId,
      user: req.user._id,
    });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    const topic = await Topic.create({
      ...req.body,
      subject: subject._id,
      user: req.user._id,
    });

    res.status(201).json({ success: true, data: topic });
  } catch (err) {
    next(err);
  }
};

// PUT /api/subjects/:subjectId/topics/:topicId
exports.updateTopic = async (req, res, next) => {
  try {
    const topic = await Topic.findOneAndUpdate(
      { _id: req.params.topicId, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found.' });
    }
    res.json({ success: true, data: topic });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/subjects/:subjectId/topics/:topicId
exports.deleteTopic = async (req, res, next) => {
  try {
    const topic = await Topic.findOneAndDelete({
      _id: req.params.topicId,
      user: req.user._id,
    });
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found.' });
    }
    res.json({ success: true, message: 'Topic deleted.' });
  } catch (err) {
    next(err);
  }
};
