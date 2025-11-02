import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    mode: {
      type: String,
      enum: ['vocab', 'lesson', 'reading', 'quiz', 'test'],
      required: true
    },
    summary: {
      total: {
        type: Number,
        default: 0
      },
      correct: {
        type: Number,
        default: 0
      },
      incorrect: {
        type: Number,
        default: 0
      },
      score: {
        type: Number
      }
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes
SessionSchema.index({ userId: 1 });
SessionSchema.index({ createdAt: -1 });

export default mongoose.model('Session', SessionSchema);

