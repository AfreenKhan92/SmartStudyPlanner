const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      maxlength: [100, 'Subject name cannot exceed 100 characters'],
    },
    examDate: {
      type: Date,
      required: [true, 'Exam date is required'],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    color: {
      type: String,
      default: '#6366f1', // indigo default
    },
  },
  { timestamps: true }
);

// ─── Ensure unique subject names per user ────────────────────────────────────
subjectSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
