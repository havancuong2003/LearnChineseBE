import mongoose from 'mongoose';

const ReadingQuestionSchema = new mongoose.Schema(
  {
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReadingUnit',
      required: true
    },
    question: {
      type: String,
      required: true,
      trim: true
    },
    options: [{
      type: String,
      trim: true
    }],
    answer: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    question_type: {
      type: String,
      enum: ['mcq', 'fill', 'translate'],
      default: 'mcq'
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
ReadingQuestionSchema.index({ unitId: 1 });
ReadingQuestionSchema.index({ difficulty: 1 });

export default mongoose.model('ReadingQuestion', ReadingQuestionSchema);

