import mongoose from 'mongoose';

const AnswerSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    questionType: {
      type: String,
      enum: ['vocab', 'sentence', 'reading'],
      required: true
    },
    userAnswer: {
      type: String,
      required: true
    },
    correct: {
      type: Boolean,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
AnswerSchema.index({ sessionId: 1 });
AnswerSchema.index({ questionId: 1 });

export default mongoose.model('Answer', AnswerSchema);

