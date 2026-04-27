const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Topic name is required'],
      trim: true,
      maxlength: [200, 'Topic name cannot exceed 200 characters'],
    },
    estimatedHours: {
      type: Number,
      default: 1,
      min: [0.25, 'Minimum 15 minutes per topic'],
      max: [20, 'Maximum 20 hours per topic'],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Topic', topicSchema);
